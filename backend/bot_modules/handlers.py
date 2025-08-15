"""
Bot command and callback handlers
"""
import asyncio
import secrets
from datetime import datetime
from telegram import Update
from telegram.ext import ContextTypes
from bson import ObjectId

from .config import MESSAGES
from .database import (
    create_or_update_user, get_active_products, get_product_by_id,
    get_user_orders, create_order, update_order_payment, get_order_by_id
)
from .keyboards import (
    get_main_menu_keyboard, get_products_keyboard, get_product_detail_keyboard,
    get_cart_keyboard, get_countries_keyboard, get_payment_keyboard,
    get_payment_simulation_keyboard
)
from .cart_manager import cart_manager

# User states storage
user_states = {}

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command"""
    user = update.effective_user
    
    # Save user to database
    await create_or_update_user({
        "telegram_id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name
    })
    
    welcome_text = MESSAGES["welcome"].format(name=user.first_name)
    keyboard = get_main_menu_keyboard()
    
    if update.message:
        await update.message.reply_text(welcome_text, reply_markup=keyboard)
    elif update.callback_query:
        await update.callback_query.edit_message_text(welcome_text, reply_markup=keyboard)

async def shop_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /shop command"""
    await show_products(update, context)

async def cart_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /cart command"""
    await show_cart(update, context)

async def orders_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /orders command"""
    user_id = update.effective_user.id
    orders = await get_user_orders(user_id, limit=10)
    
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
    """Handle /help command"""
    await update.message.reply_text(MESSAGES["help"], parse_mode='Markdown')

async def show_products(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show products list"""
    products = await get_active_products()
    
    if not products:
        text = "Damn, we're out! 😔\n\nChef's restocking. Check back soon!"
        if update.callback_query:
            await update.callback_query.edit_message_text(text)
        else:
            await update.message.reply_text(text)
        return
    
    text = "🍕 *THE MENU*\n\nWhat you running? Pick your cycle:"
    keyboard = get_products_keyboard(products)
    
    if update.callback_query:
        await update.callback_query.edit_message_text(text, reply_markup=keyboard, parse_mode='Markdown')
    else:
        await update.message.reply_text(text, reply_markup=keyboard, parse_mode='Markdown')

async def show_cart(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show shopping cart"""
    user_id = update.effective_user.id
    cart = cart_manager.get_cart(user_id)
    
    if not cart:
        text = MESSAGES["cart_empty"]
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
        cart_text += f"🍕 {item['name']}\n   {item['quantity']}x ${item['price']:.2f} = ${subtotal:.2f}\n\n"
    
    cart_text += "="*20 + f"\n💰 *TOTAL: ${total:.2f} USDT*"
    keyboard = get_cart_keyboard()
    
    if update.callback_query:
        await update.callback_query.edit_message_text(cart_text, reply_markup=keyboard, parse_mode='Markdown')
    else:
        await update.message.reply_text(cart_text, reply_markup=keyboard, parse_mode='Markdown')

async def show_product_detail(update: Update, context: ContextTypes.DEFAULT_TYPE, product_id: str):
    """Show product detail with quantity selector"""
    query = update.callback_query
    user_id = update.effective_user.id
    
    product = await get_product_by_id(product_id)
    if not product:
        await query.edit_message_text("Product not found! 🤷")
        return
    
    quantity = cart_manager.get_quantity(user_id, product_id)
    total_price = product['price_usdt'] * quantity
    
    text = (
        f"*{product['name']}*\n\n"
        f"_{product['description']}_\n\n"
        f"💰 *${product['price_usdt']:.2f} per unit*\n"
        f"📦 *Total: ${total_price:.2f} for {quantity} units*"
    )
    
    keyboard = get_product_detail_keyboard(product_id, quantity, total_price)
    
    try:
        await query.edit_message_text(text, reply_markup=keyboard, parse_mode='Markdown')
    except:
        pass  # Ignore if message is identical

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle text messages (city input)"""
    user_id = update.effective_user.id
    
    if user_states.get(user_id) == "waiting_city":
        city = update.message.text.strip()
        
        if len(city) < 2:
            await update.message.reply_text("Come on, type a real city name! 🙄")
            return
        
        context.user_data['delivery_city'] = city
        user_states[user_id] = None
        
        keyboard = get_payment_keyboard()
        country = context.user_data.get('delivery_country', 'Unknown')
        
        await update.message.reply_text(
            f"📍 *Delivery to:*\n{city}, {country}\n\n"
            "💳 *How you paying?*\n"
            "(All anonymous, all secure)",
            reply_markup=keyboard,
            parse_mode='Markdown'
        )

# Continue in next file...
