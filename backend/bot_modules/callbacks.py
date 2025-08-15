"""
Callback query handler
"""
import asyncio
import secrets
from telegram import Update, InlineKeyboardMarkup, InlineKeyboardButton
from telegram.ext import ContextTypes

from .handlers import (
    start_command, show_products, show_cart, show_product_detail,
    user_states
)
from .cart_manager import cart_manager
from .database import (
    get_product_by_id, get_user_orders, create_order,
    update_order_payment, get_order_by_id
)
from .keyboards import get_payment_simulation_keyboard, get_countries_keyboard
from .config import MESSAGES

async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle all callback queries"""
    query = update.callback_query
    await query.answer()
    
    user_id = update.effective_user.id
    data = query.data
    
    # Navigation callbacks
    if data == "home":
        await start_command(update, context)
    
    elif data == "shop":
        await show_products(update, context)
    
    elif data == "cart":
        await show_cart(update, context)
    
    elif data == "orders":
        orders = await get_user_orders(user_id, limit=5)
        
        if not orders:
            text = "No orders yet! 📦\n\nWhat are you waiting for?"
        else:
            text = "📦 *RECENT ORDERS*\n\n"
            for order in orders:
                text += f"• `{order['order_number']}` - ${order['total_usdt']:.2f} - {order['status']}\n"
        
        keyboard = [[
            InlineKeyboardButton("🍕 Order Now", callback_data="shop"),
            InlineKeyboardButton("🏠 Back", callback_data="home")
        ]]
        await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
    
    # Product viewing
    elif data.startswith("view_"):
        product_id = data.replace("view_", "")
        await show_product_detail(update, context, product_id)
    
    # Quantity adjustments
    elif data.startswith("qty_"):
        await handle_quantity_change(update, context, data)
    
    # Add to cart
    elif data.startswith("add_"):
        await handle_add_to_cart(update, context, data)
    
    # Clear cart
    elif data == "clear_cart":
        cart_manager.clear_cart(user_id)
        await query.edit_message_text(
            "Cart cleared! 🗑️\n\nYour gains just cried a little...",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("🍕 Start Over", callback_data="shop"),
                InlineKeyboardButton("🏠 Home", callback_data="home")
            ]])
        )
    
    # Checkout process
    elif data == "checkout_start":
        await handle_checkout_start(update, context)
    
    elif data == "select_country":
        text = "📍 *WHERE TO?*\n\nPick your country (EU only for now):"
        keyboard = get_countries_keyboard()
        await query.edit_message_text(text, reply_markup=keyboard, parse_mode='Markdown')
    
    elif data.startswith("country_"):
        country = data.replace("country_", "")
        context.user_data['delivery_country'] = country
        user_states[user_id] = "waiting_city"
        await query.edit_message_text(
            f"📍 *Shipping to: {country}*\n\n"
            "Now just type your city name:\n"
            "(Don't worry, we don't save addresses)",
            parse_mode='Markdown'
        )
    
    # Payment
    elif data.startswith("pay_"):
        await handle_payment(update, context, data)
    
    elif data.startswith("fake_pay_"):
        await handle_fake_payment(update, context, data)
    
    elif data == "noop":
        pass  # Do nothing for display buttons

async def handle_quantity_change(update: Update, context: ContextTypes.DEFAULT_TYPE, data: str):
    """Handle quantity adjustment callbacks"""
    query = update.callback_query
    user_id = update.effective_user.id
    
    if "minus5" in data:
        product_id = data.replace("qty_minus5_", "")
        adjustment = -5
    elif "minus" in data:
        product_id = data.replace("qty_minus_", "")
        adjustment = -1
    elif "plus10" in data:
        product_id = data.replace("qty_plus10_", "")
        adjustment = 10
    elif "plus5" in data:
        product_id = data.replace("qty_plus5_", "")
        adjustment = 5
    elif "plus" in data:
        product_id = data.replace("qty_plus_", "")
        adjustment = 1
    else:
        return
    
    new_qty = cart_manager.adjust_quantity(user_id, product_id, adjustment)
    
    if adjustment < 0 and new_qty == 1:
        await query.answer("Minimum is 1!", show_alert=False)
    elif adjustment > 0 and new_qty == 50:
        await query.answer("Max 50 per order!", show_alert=True)
    
    await show_product_detail(update, context, product_id)

async def handle_add_to_cart(update: Update, context: ContextTypes.DEFAULT_TYPE, data: str):
    """Handle add to cart callback"""
    query = update.callback_query
    user_id = update.effective_user.id
    product_id = data.replace("add_", "")
    
    product = await get_product_by_id(product_id)
    if not product:
        await query.answer("Product not found!", show_alert=True)
        return
    
    quantity = cart_manager.get_quantity(user_id, product_id)
    cart_manager.add_to_cart(user_id, product_id, product, quantity)
    
    await query.answer(f"Added {quantity}x to cart! 🛒")
    await show_cart(update, context)

async def handle_checkout_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle checkout start"""
    query = update.callback_query
    user_id = update.effective_user.id
    cart = cart_manager.get_cart(user_id)
    
    if not cart:
        await query.edit_message_text("Cart's empty! Nothing to checkout 🤷")
        return
    
    total = cart_manager.get_cart_total(user_id)
    context.user_data['checkout_cart'] = cart
    context.user_data['checkout_total'] = total
    
    checkout_text = "📦 *ORDER SUMMARY*\n" + "="*20 + "\n\n"
    for product_id, item in cart.items():
        subtotal = item['price'] * item['quantity']
        checkout_text += f"🍕 {item['name']}\n   {item['quantity']}x ${item['price']:.2f} = ${subtotal:.2f}\n\n"
    
    checkout_text += f"{'='*20}\n💰 *TOTAL: ${total:.2f} USDT*\n\nLooks good?"
    
    keyboard = [[
        InlineKeyboardButton("✅ Hell Yeah", callback_data="select_country"),
        InlineKeyboardButton("❌ Nah", callback_data="cart")
    ]]
    await query.edit_message_text(checkout_text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

async def handle_payment(update: Update, context: ContextTypes.DEFAULT_TYPE, payment_data: str):
    """Process payment selection"""
    query = update.callback_query
    payment_method = payment_data.replace("pay_", "").upper()
    
    user_id = update.effective_user.id
    cart = context.user_data.get('checkout_cart', {})
    country = context.user_data.get('delivery_country', 'Unknown')
    city = context.user_data.get('delivery_city', 'Unknown')
    total = context.user_data.get('checkout_total', 0)
    
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
    
    order_data = {
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
        "status": "pending"
    }
    
    order_id = await create_order(order_data)
    
    # Clear cart
    cart_manager.clear_cart(user_id)
    
    # Get order for display
    order = await get_order_by_id(order_id)
    
    # Show payment instructions
    crypto_rates = {"BTC": 65000, "ETH": 3500, "SOL": 150, "USDT": 1}
    crypto_amount = total / crypto_rates.get(payment_method, 1)
    
    payment_text = (
        f"*Almost there!* 🚀\n\n"
        f"Order: `{order['order_number']}`\n"
        f"Amount: *${total:.2f}* ({crypto_amount:.6f} {payment_method})\n\n"
        f"Send exactly this amount to:\n"
        f"`{fake_addresses.get(payment_method)}`\n\n"
        "⏰ Expires in 30 mins\n\n"
        "🔐 *Remember:* We never ask for names or addresses.\n"
        "Your privacy is our priority!\n\n"
        "_Demo mode - click below to simulate_"
    )
    
    keyboard = get_payment_simulation_keyboard(order_id)
    await query.edit_message_text(payment_text, reply_markup=keyboard, parse_mode='Markdown')

async def handle_fake_payment(update: Update, context: ContextTypes.DEFAULT_TYPE, data: str):
    """Handle simulated payment"""
    query = update.callback_query
    order_id = data.replace("fake_pay_", "")
    
    await query.edit_message_text(
        "⏳ *Processing...*\n\nChecking blockchain...",
        parse_mode='Markdown'
    )
    
    await asyncio.sleep(2)
    
    success = await update_order_payment(order_id, {})
    
    if success:
        order = await get_order_by_id(order_id)
        success_text = MESSAGES["payment_confirmed"].format(order_number=order['order_number'])
        
        keyboard = [
            [InlineKeyboardButton("🍕 Order More", callback_data="shop")],
            [InlineKeyboardButton("🏠 Done", callback_data="home")]
        ]
        
        await query.edit_message_text(success_text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
    else:
        await query.edit_message_text("Something went wrong. Try again! 🤷")
