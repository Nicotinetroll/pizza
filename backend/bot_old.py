"""
AnabolicPizza Bot - Anonymous Crypto Shop
"""

import os
import logging
from datetime import datetime
import asyncio
from typing import Dict
import secrets
import json

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ContextTypes
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

# Configuration
BOT_TOKEN = os.getenv("BOT_TOKEN")
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/telegram_shop")
NOTIFICATION_CHANNEL = os.getenv("NOTIFICATION_CHANNEL_ID")

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database
mongo_client = AsyncIOMotorClient(MONGODB_URI)
db = mongo_client.telegram_shop

# Storage
user_carts = {}
user_states = {}
user_quantities = {}  # Store selected quantities

# EU Countries we deliver to
EU_COUNTRIES = {
    "🇧🇪": "Belgium",
    "🇧🇬": "Bulgaria", 
    "🇨🇿": "Czech Republic",
    "🇩🇰": "Denmark",
    "🇪🇪": "Estonia",
    "🇫🇮": "Finland",
    "🇫🇷": "France",
    "🇭🇷": "Croatia",
    "🇮🇪": "Ireland",
    "🇮🇹": "Italy",
    "🇨🇾": "Cyprus",
    "🇱🇹": "Lithuania",
    "🇱🇻": "Latvia",
    "🇱🇺": "Luxembourg",
    "🇭🇺": "Hungary",
    "🇩🇪": "Germany",
    "🇳🇱": "Netherlands",
    "🇵🇱": "Poland",
    "🇵🇹": "Portugal",
    "🇦🇹": "Austria",
    "🇷🇴": "Romania",
    "🇬🇷": "Greece",
    "🇸🇮": "Slovenia",
    "🇸🇰": "Slovakia",
    "🇪🇸": "Spain",
    "🇸🇪": "Sweden"
}

# Helper functions
async def generate_order_number():
    count = await db.orders.count_documents({})
    year = datetime.now().year
    return f"APZ-{year}-{count+1:04d}"

# Command Handlers
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    
    # Save user to DB
    await db.users.update_one(
        {"telegram_id": user.id},
        {
            "$set": {
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "last_active": datetime.utcnow()
            },
            "$setOnInsert": {
                "created_at": datetime.utcnow(),
                "telegram_id": user.id,
                "total_orders": 0,
                "total_spent_usdt": 0,
                "status": "active"
            }
        },
        upsert=True
    )
    
    welcome_text = (
        f"Yo {user.first_name}! 🍕💉\n\n"
        "Welcome to AnabolicPizza - the only pizza that comes with gains! 🚀\n\n"
        "Why us? Simple:\n"
        "🔐 100% anonymous (no names, no traces)\n"
        "💰 Crypto only (banks can't track shit)\n"
        "📦 Stealth EU shipping\n"
        "💉 Real gear, real results\n\n"
        "Ready to get juiced? Let's fucking go! 👇"
    )
    
    keyboard = [
        [InlineKeyboardButton("🍕 See What We Got", callback_data="shop")],
        [InlineKeyboardButton("🛒 My Cart", callback_data="cart")],
        [InlineKeyboardButton("📦 My Orders", callback_data="orders")]
    ]
    
    if update.message:
        await update.message.reply_text(welcome_text, reply_markup=InlineKeyboardMarkup(keyboard))
    elif update.callback_query:
        await update.callback_query.edit_message_text(welcome_text, reply_markup=InlineKeyboardMarkup(keyboard))

async def shop_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await show_products(update, context)

async def cart_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await show_cart(update, context)

async def orders_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    orders = await db.orders.find({"telegram_id": user_id}).sort("created_at", -1).limit(10).to_list(10)
    
    if not orders:
        text = "No orders yet bro! 📦\n\nTime to change that 💪 Hit /shop"
    else:
        text = "📦 *YOUR ORDER HISTORY*\n" + "="*20 + "\n\n"
        for order in orders:
            status_emoji = {"pending": "⏳", "paid": "💰", "completed": "✅", "cancelled": "❌"}.get(order['status'], "❓")
            text += (
                f"{status_emoji} `{order['order_number']}`\n"
                f"   {order['created_at'].strftime('%d.%m.%Y')}\n"
                f"   ${order['total_usdt']:.2f} • {order['status']}\n\n"
            )
    
    await update.message.reply_text(text, parse_mode='Markdown')

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    help_text = (
        "Need help? Here's how it works 💉\n\n"
        "*The Process:*\n"
        "1. Pick your gear (/shop)\n"
        "2. Add to cart\n"
        "3. Checkout\n"
        "4. Pay with crypto\n"
        "5. Get juiced\n\n"
        "*We accept:*\n"
        "Bitcoin, Ethereum, Solana, USDT\n\n"
        "*Shipping:*\n"
        "EU only • 3-5 days\n"
        "Stealth packaging (looks like supplements)\n\n"
        "*Security:*\n"
        "🔐 No names needed\n"
        "🔐 No real addresses stored\n"
        "🔐 Auto-delete order history\n"
        "🔐 Tor friendly\n\n"
        "Remember: We're just a pizza shop 😉🍕"
    )
    await update.message.reply_text(help_text, parse_mode='Markdown')

async def show_products(update: Update, context: ContextTypes.DEFAULT_TYPE):
    products = await db.products.find({"is_active": True}).to_list(20)
    
    if not products:
        text = "Damn, we're out! 😔\n\nChef's restocking. Check back soon!"
        if update.callback_query:
            await update.callback_query.edit_message_text(text)
        else:
            await update.message.reply_text(text)
        return
    
    keyboard = []
    for product in products:
        name = product['name'][:25] + "..." if len(product['name']) > 25 else product['name']
        # Remove stock from button display
        button_text = f"{name} • ${product['price_usdt']:.0f}"
        callback_data = f"view_{str(product['_id'])}"
        keyboard.append([InlineKeyboardButton(button_text, callback_data=callback_data)])
    
    keyboard.append([
        InlineKeyboardButton("🛒 My Cart", callback_data="cart"),
        InlineKeyboardButton("🏠 Back", callback_data="home")
    ])
    
    text = "🍕 *THE MENU*\n\nWhat you running? Pick your cycle:"
    
    if update.callback_query:
        await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
    else:
        await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

async def show_cart(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    cart = user_carts.get(user_id, {})
    
    if not cart:
        text = "Cart's empty bro! 🛒\n\nTime to stock up on gear 💉"
        keyboard = [[InlineKeyboardButton("🍕 Feed Them", callback_data="shop")]]
        
        if update.callback_query:
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        else:
            await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
        return
    
    cart_text = "🛒 *YOUR CART*\n" + "="*20 + "\n\n"
    total = 0
    
    for product_id, item in cart.items():
        subtotal = item['price'] * item['quantity']
        total += subtotal
        cart_text += f"🍕 {item['name']}\n   {item['quantity']}x ${item['price']:.0f} = ${subtotal:.0f}\n\n"
    
    cart_text += "="*20 + f"\n💰 *TOTAL: ${total:.0f} USDT*"
    
    keyboard = [
        [InlineKeyboardButton("✅ Let's Fucking Go", callback_data="checkout_start")],
        [
            InlineKeyboardButton("🍕 Add More", callback_data="shop"),
            InlineKeyboardButton("🗑️ Clear All", callback_data="clear_cart")
        ],
        [InlineKeyboardButton("🏠 Back", callback_data="home")]
    ]
    
    if update.callback_query:
        await update.callback_query.edit_message_text(cart_text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
    else:
        await update.message.reply_text(cart_text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

# Helper function to show product detail
async def show_product_detail(update: Update, context: ContextTypes.DEFAULT_TYPE, product_id: str):
    query = update.callback_query
    user_id = update.effective_user.id
    
    try:
        product = await db.products.find_one({"_id": ObjectId(product_id)})
    except:
        await query.edit_message_text("Product not found! 🤷")
        return
    
    if not product:
        await query.edit_message_text("Product not found! 🤷")
        return
    
    # Initialize quantity for this product if needed
    if user_id not in user_quantities:
        user_quantities[user_id] = {}
    if product_id not in user_quantities[user_id]:
        user_quantities[user_id][product_id] = 1  # Default quantity
    
    quantity = user_quantities[user_id][product_id]
    total_price = product['price_usdt'] * quantity
    
    text = (
        f"*{product['name']}*\n\n"
        f"_{product['description']}_\n\n"
        f"💰 *${product['price_usdt']:.0f} per unit*\n"
        f"📦 *Total: ${total_price:.0f} for {quantity} units*"
    )
    
    # Improved button layout with quick add options
    keyboard = [
        [
            InlineKeyboardButton("-5", callback_data=f"qty_minus5_{product_id}"),
            InlineKeyboardButton("➖", callback_data=f"qty_minus_{product_id}"),
            InlineKeyboardButton(f"📦 {quantity}", callback_data="noop"),
            InlineKeyboardButton("➕", callback_data=f"qty_plus_{product_id}"),
            InlineKeyboardButton("+5", callback_data=f"qty_plus5_{product_id}")
        ],
        [
            InlineKeyboardButton("+10", callback_data=f"qty_plus10_{product_id}"),
            InlineKeyboardButton(f"💰 Total: ${total_price:.0f}", callback_data="noop")
        ],
        [InlineKeyboardButton(f"🛒 Add to Cart", callback_data=f"add_{product_id}")],
        [
            InlineKeyboardButton("🔙 Menu", callback_data="shop"),
            InlineKeyboardButton("🛒 View Cart", callback_data="cart")
        ]
    ]
    
    # Use answer=False to reduce lag
    try:
        await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
    except:
        pass  # Ignore if message is identical

# Callback Handler
async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    user_id = update.effective_user.id
    
    # Navigation
    if query.data == "home":
        await start(update, context)
    
    elif query.data == "shop":
        await show_products(update, context)
    
    elif query.data == "cart":
        await show_cart(update, context)
    
    elif query.data == "orders":
        orders = await db.orders.find({"telegram_id": user_id}).sort("created_at", -1).limit(5).to_list(5)
        
        if not orders:
            text = "No orders yet! 📦\n\nWhat are you waiting for?"
        else:
            text = "📦 *RECENT ORDERS*\n\n"
            for order in orders:
                text += f"• `{order['order_number']}` - ${order['total_usdt']:.0f} - {order['status']}\n"
        
        keyboard = [[
            InlineKeyboardButton("🍕 Order Now", callback_data="shop"),
            InlineKeyboardButton("🏠 Back", callback_data="home")
        ]]
        await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
    
    # Product viewing with quantity selector
    elif query.data.startswith("view_"):
        product_id = query.data.replace("view_", "")
        await show_product_detail(update, context, product_id)
    
    # Quantity adjustment - OPTIMIZED FOR SPEED
    elif query.data.startswith("qty_minus_"):
        product_id = query.data.replace("qty_minus_", "")
        if user_id not in user_quantities:
            user_quantities[user_id] = {}
        if product_id not in user_quantities[user_id]:
            user_quantities[user_id][product_id] = 1
            
        if user_quantities[user_id][product_id] > 1:
            user_quantities[user_id][product_id] -= 1
            await show_product_detail(update, context, product_id)
        else:
            await query.answer("Minimum is 1!", show_alert=False)
    
    elif query.data.startswith("qty_plus_"):
        product_id = query.data.replace("qty_plus_", "")
        if user_id not in user_quantities:
            user_quantities[user_id] = {}
        if product_id not in user_quantities[user_id]:
            user_quantities[user_id][product_id] = 1
            
        if user_quantities[user_id][product_id] < 50:  # Changed to 50 max
            user_quantities[user_id][product_id] += 1
            await show_product_detail(update, context, product_id)
        else:
            await query.answer("Max 50 per order!", show_alert=True)
    
    # Quantity adjustment buttons - FASTER VERSIONS
    elif query.data.startswith("qty_minus5_"):
        product_id = query.data.replace("qty_minus5_", "")
        if user_id not in user_quantities:
            user_quantities[user_id] = {}
        if product_id not in user_quantities[user_id]:
            user_quantities[user_id][product_id] = 1
            
        new_qty = max(1, user_quantities[user_id][product_id] - 5)
        user_quantities[user_id][product_id] = new_qty
        await show_product_detail(update, context, product_id)
    
    elif query.data.startswith("qty_plus5_"):
        product_id = query.data.replace("qty_plus5_", "")
        if user_id not in user_quantities:
            user_quantities[user_id] = {}
        if product_id not in user_quantities[user_id]:
            user_quantities[user_id][product_id] = 1
            
        new_qty = min(50, user_quantities[user_id][product_id] + 5)
        user_quantities[user_id][product_id] = new_qty
        await show_product_detail(update, context, product_id)
    
    elif query.data.startswith("qty_plus10_"):
        product_id = query.data.replace("qty_plus10_", "")
        if user_id not in user_quantities:
            user_quantities[user_id] = {}
        if product_id not in user_quantities[user_id]:
            user_quantities[user_id][product_id] = 1
            
        new_qty = min(50, user_quantities[user_id][product_id] + 10)
        user_quantities[user_id][product_id] = new_qty
        await show_product_detail(update, context, product_id)
    
    elif query.data == "noop":
        # Do nothing for display buttons
        pass
    
    # Add to cart with selected quantity
    elif query.data.startswith("add_"):
        product_id = query.data.replace("add_", "")
        quantity = user_quantities.get(user_id, {}).get(product_id, 1)
        
        try:
            product = await db.products.find_one({"_id": ObjectId(product_id)})
        except:
            await query.answer("Something went wrong!", show_alert=True)
            return
        
        if not product:
            await query.answer("Product not found!", show_alert=True)
            return
        
        if user_id not in user_carts:
            user_carts[user_id] = {}
        
        if product_id in user_carts[user_id]:
            user_carts[user_id][product_id]['quantity'] += quantity
        else:
            user_carts[user_id][product_id] = {
                'name': product['name'],
                'price': float(product['price_usdt']),
                'quantity': quantity
            }
        
        await query.answer(f"Added {quantity}x to cart! 🛒")
        await show_cart(update, context)
    
    # Clear cart
    elif query.data == "clear_cart":
        if user_id in user_carts:
            user_carts[user_id] = {}
        
        await query.edit_message_text(
            "Cart cleared! 🗑️\n\nYour gains just cried a little...",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("🍕 Start Over", callback_data="shop"),
                InlineKeyboardButton("🏠 Home", callback_data="home")
            ]])
        )
    
    # Checkout start
    elif query.data == "checkout_start":
        cart = user_carts.get(user_id, {})
        
        if not cart:
            await query.edit_message_text("Cart's empty! Nothing to checkout 🤷")
            return
        
        total = sum(item['price'] * item['quantity'] for item in cart.values())
        context.user_data['checkout_cart'] = cart
        context.user_data['checkout_total'] = total
        
        checkout_text = "📦 *ORDER SUMMARY*\n" + "="*20 + "\n\n"
        for product_id, item in cart.items():
            subtotal = item['price'] * item['quantity']
            checkout_text += f"🍕 {item['name']}\n   {item['quantity']}x ${item['price']:.0f} = ${subtotal:.0f}\n\n"
        
        checkout_text += f"{'='*20}\n💰 *TOTAL: ${total:.0f} USDT*\n\nLooks good?"
        
        keyboard = [[
            InlineKeyboardButton("✅ Hell Yeah", callback_data="select_country"),
            InlineKeyboardButton("❌ Nah", callback_data="cart")
        ]]
        await query.edit_message_text(checkout_text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
    
    # Country selection
    elif query.data == "select_country":
        text = "📍 *WHERE TO?*\n\nPick your country (EU only for now):"
        
        # Create country buttons (3 per row)
        keyboard = []
        countries = list(EU_COUNTRIES.items())
        for i in range(0, len(countries), 3):
            row = []
            for j in range(3):
                if i + j < len(countries):
                    flag, country = countries[i + j]
                    row.append(InlineKeyboardButton(f"{flag} {country[:10]}", callback_data=f"country_{country}"))
            keyboard.append(row)
        
        keyboard.append([InlineKeyboardButton("❌ Cancel", callback_data="cart")])
        
        await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
    
    # Country selected
    elif query.data.startswith("country_"):
        country = query.data.replace("country_", "")
        context.user_data['delivery_country'] = country
        
        # Ask for city
        user_states[user_id] = "waiting_city"
        await query.edit_message_text(
            f"📍 *Shipping to: {country}*\n\n"
            "Now just type your city name:\n"
            "(Don't worry, we don't save addresses)",
            parse_mode='Markdown'
        )
    
    # Payment method selection
    elif query.data.startswith("pay_"):
        await process_payment(update, context, query.data)
    
    # Fake payment simulation
    elif query.data.startswith("fake_pay_"):
        order_id = query.data.replace("fake_pay_", "")
        
        await query.edit_message_text(
            "⏳ *Processing...*\n\nChecking blockchain...",
            parse_mode='Markdown'
        )
        
        await asyncio.sleep(2)
        
        try:
            await db.orders.update_one(
                {"_id": ObjectId(order_id)},
                {
                    "$set": {
                        "status": "paid",
                        "paid_at": datetime.utcnow(),
                        "payment.status": "confirmed",
                        "payment.transaction_id": "DEMO_" + secrets.token_hex(16)
                    }
                }
            )
            
            order = await db.orders.find_one({"_id": ObjectId(order_id)})
            
            success_text = (
                "✅ *PAYMENT CONFIRMED!*\n\n"
                f"Order: `{order['order_number']}`\n\n"
                "Your package arrives in 3-5 days.\n"
                "Stealth packaging guaranteed.\n"
                "No signature needed.\n\n"
                "Time to blast off! 💉🚀"
            )
            
            keyboard = [
                [InlineKeyboardButton("🍕 Order More", callback_data="shop")],
                [InlineKeyboardButton("🏠 Done", callback_data="home")]
            ]
            
            await query.edit_message_text(success_text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
        except Exception as e:
            logger.error(f"Payment error: {e}")
            await query.edit_message_text("Something fucked up. Try again! 🤷")

# Process payment
async def process_payment(update: Update, context: ContextTypes.DEFAULT_TYPE, payment_data: str):
    query = update.callback_query
    payment_method = payment_data.replace("pay_", "").upper()
    
    user_id = update.effective_user.id
    cart = context.user_data.get('checkout_cart', {})
    country = context.user_data.get('delivery_country', 'Unknown')
    city = context.user_data.get('delivery_city', 'Unknown')
    total = context.user_data.get('checkout_total', 0)
    
    # Generate order
    order_number = await generate_order_number()
    
    # Fake addresses for demo
    fake_addresses = {
        "BTC": "bc1q" + secrets.token_hex(20),
        "ETH": "0x" + secrets.token_hex(20),
        "SOL": "So" + secrets.token_hex(22),
        "USDT": "TT" + secrets.token_hex(17)
    }
    
    # Create order
    order_items = []
    for product_id, item in cart.items():
        order_items.append({
            "product_name": item['name'],
            "quantity": item['quantity'],
            "price_usdt": item['price'],
            "subtotal_usdt": item['price'] * item['quantity']
        })
    
    order = {
        "order_number": order_number,
        "telegram_id": user_id,
        "items": order_items,
        "total_usdt": total,
        "delivery_country": country,
        "delivery_city": city,
        "payment": {
            "method": payment_method,
            "address": fake_addresses.get(payment_method, "DEMO_ADDRESS"),
            "amount_usdt": total,
            "status": "pending"
        },
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    
    result = await db.orders.insert_one(order)
    order_id = str(result.inserted_id)
    
    # Clear cart
    if user_id in user_carts:
        user_carts[user_id] = {}
    
    # Show payment instructions
    crypto_rates = {"BTC": 65000, "ETH": 3500, "SOL": 150, "USDT": 1}
    crypto_amount = total / crypto_rates.get(payment_method, 1)
    
    payment_text = (
        f"*Almost there!* 🚀\n\n"
        f"Order: `{order_number}`\n"
        f"Amount: *${total:.0f}* ({crypto_amount:.6f} {payment_method})\n\n"
        f"Send exactly this amount to:\n"
        f"`{fake_addresses.get(payment_method)}`\n\n"
        "⏰ Expires in 30 mins\n\n"
        "🔐 *Remember:* We never ask for names or addresses.\n"
        "Your privacy is our priority!\n\n"
        "_Demo mode - click below to simulate_"
    )
    
    keyboard = [[
        InlineKeyboardButton("🎮 Simulate Payment", callback_data=f"fake_pay_{order_id}"),
        InlineKeyboardButton("❌ Cancel", callback_data="home")
    ]]
    await query.edit_message_text(payment_text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

# Message handler for city input
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    
    if user_states.get(user_id) == "waiting_city":
        city = update.message.text.strip()
        
        if len(city) < 2:
            await update.message.reply_text("Come on, type a real city name! 🙄")
            return
        
        context.user_data['delivery_city'] = city
        user_states[user_id] = None
        
        keyboard = [
            [InlineKeyboardButton("₿ Bitcoin", callback_data="pay_btc")],
            [InlineKeyboardButton("Ξ Ethereum", callback_data="pay_eth")],
            [InlineKeyboardButton("◎ Solana", callback_data="pay_sol")],
            [InlineKeyboardButton("💵 USDT", callback_data="pay_usdt")]
        ]
        
        country = context.user_data.get('delivery_country', 'Unknown')
        
        await update.message.reply_text(
            f"📍 *Delivery to:*\n{city}, {country}\n\n"
            "💳 *How you paying?*\n"
            "(All anonymous, all secure)",
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode='Markdown'
        )

def main():
    """Start the bot"""
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Add handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("shop", shop_command))
    application.add_handler(CommandHandler("cart", cart_command))
    application.add_handler(CommandHandler("orders", orders_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CallbackQueryHandler(button_callback))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    # Start bot
    logger.info("🍕💪 AnabolicPizza Bot starting...")
    logger.info("Anonymous shop ready!")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
