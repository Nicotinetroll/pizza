"""
Enhanced callback query handler with categories and notifications
"""
import asyncio
import secrets
from telegram import Update, InlineKeyboardMarkup, InlineKeyboardButton
from telegram.ext import ContextTypes

from .handlers import (
    start_command, show_categories, show_category_products, show_product_detail,
    show_cart, help_command, user_states, user_context
)
from .cart_manager import cart_manager
from .database import (
    get_product_by_id, get_user_orders, create_order,
    update_order_payment, get_order_by_id, apply_referral_code,
    validate_referral_code, calculate_discount
)
from .keyboards import (
    get_payment_simulation_keyboard, get_countries_keyboard, 
    get_payment_keyboard, get_referral_keyboard, get_checkout_confirm_keyboard,
    get_order_complete_keyboard, get_back_keyboard
)
from .config import MESSAGES, CRYPTO_CURRENCIES
from .public_notifications import public_notifier

async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle all callback queries with improved flow"""
    query = update.callback_query
    await query.answer()
    
    user_id = update.effective_user.id
    data = query.data
    
    # Main navigation
    if data == "home":
        await start_command(update, context)
    
    elif data == "shop":
        await show_categories(update, context)
    
    elif data == "cart":
        await show_cart(update, context)
    
    elif data == "help":
        await help_command(update, context)
    
    elif data == "orders":
        await show_orders(update, context)
    
    # Category browsing
    elif data.startswith("cat_"):
        category_id = data.replace("cat_", "")
        await show_category_products(update, context, category_id)
    
    # Product viewing
    elif data.startswith("view_"):
        product_id = data.replace("view_", "")
        await show_product_detail(update, context, product_id)
    
    elif data == "back_to_category":
        # Go back to category from product view
        category_id = user_context.get(user_id, {}).get("category_id")
        if category_id:
            await show_category_products(update, context, category_id)
        else:
            await show_categories(update, context)
    
    # Simplified quantity adjustment
    elif data.startswith("qty_"):
        await handle_quantity_change(update, context, data)
    
    # Add to cart with better feedback
    elif data.startswith("add_"):
        await handle_add_to_cart(update, context, data)
    
    # Cart management
    elif data == "clear_cart":
        await handle_clear_cart(update, context)
    
    # Checkout flow
    elif data == "checkout_start":
        await handle_checkout_start(update, context)
    
    elif data == "select_country":
        await handle_select_country(update, context)
    
    elif data.startswith("country_"):
        await handle_country_selection(update, context, data)
    
    # Referral handling
    elif data == "skip_referral":
        await handle_skip_referral(update, context)
    
    # Payment
    elif data.startswith("pay_"):
        await handle_payment(update, context, data)
    
    elif data.startswith("fake_pay_"):
        await handle_fake_payment(update, context, data)
    
    elif data == "payment_help":
        await show_payment_help(update, context)
    
    elif data == "cancel_order":
        await handle_cancel_order(update, context)
    
    elif data == "noop":
        pass  # Do nothing for display buttons

async def show_orders(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show user orders in callback"""
    query = update.callback_query
    user_id = update.effective_user.id
    
    from .database import get_user_stats
    orders = await get_user_orders(user_id, limit=5)
    stats = await get_user_stats(user_id)
    
    if not orders:
        text = "📦 *No orders yet!*\n\n"
        text += "Your gains are waiting! Let's fix this! 💪"
    else:
        text = "📦 *YOUR RECENT ORDERS*\n" + "="*25 + "\n\n"
        
        for order in orders:
            status_emoji = {"pending": "⏳", "paid": "💰", "completed": "✅", "cancelled": "❌"}.get(order['status'], "❓")
            text += f"{status_emoji} `{order['order_number']}` - ${order['total_usdt']:.2f}\n"
            text += f"   {order['created_at'].strftime('%d %b %Y')} - {order['status'].upper()}\n\n"
        
        text += f"\n📊 *Total Orders:* {stats['total_orders']}\n"
        text += f"💰 *Total Spent:* ${stats['total_spent']:.2f}"
    
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🍕 Order Now", callback_data="shop")],
        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")]
    ])
    
    await query.edit_message_text(text, reply_markup=keyboard, parse_mode='Markdown')

async def handle_quantity_change(update: Update, context: ContextTypes.DEFAULT_TYPE, data: str):
    """Handle simplified quantity adjustment"""
    query = update.callback_query
    user_id = update.effective_user.id
    
    if "minus" in data:
        product_id = data.replace("qty_minus_", "")
        adjustment = -1
    elif "plus" in data:
        product_id = data.replace("qty_plus_", "")
        adjustment = 1
    else:
        return
    
    new_qty = cart_manager.adjust_quantity(user_id, product_id, adjustment)
    
    # Show feedback
    if adjustment < 0 and new_qty == 1:
        await query.answer("Minimum quantity is 1!", show_alert=False)
    elif adjustment > 0 and new_qty >= 20:
        await query.answer(f"Quantity set to {new_qty}. That's a lot! 💪", show_alert=True)
    else:
        await query.answer(f"Quantity: {new_qty}", show_alert=False)
    
    # Refresh product detail
    await show_product_detail(update, context, product_id)

async def handle_add_to_cart(update: Update, context: ContextTypes.DEFAULT_TYPE, data: str):
    """Handle add to cart with better feedback"""
    query = update.callback_query
    user_id = update.effective_user.id
    product_id = data.replace("add_", "")
    
    product = await get_product_by_id(product_id)
    if not product:
        await query.answer("Product not found!", show_alert=True)
        return
    
    quantity = cart_manager.get_quantity(user_id, product_id)
    cart_manager.add_to_cart(user_id, product_id, product, quantity)
    
    # Calculate new cart total
    total = cart_manager.get_cart_total(user_id)
    
    # Show success message
    success_text = MESSAGES["product_added"].format(
        quantity=quantity,
        product_name=product['name'],
        total=total
    )
    
    # Show success and go to cart
    await query.answer(f"✅ Added {quantity}x to cart!", show_alert=False)
    
    # Show updated cart
    await query.edit_message_text(
        success_text,
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("🛒 View Cart", callback_data="cart")],
            [InlineKeyboardButton("🍕 Continue Shopping", callback_data="back_to_category")],
            [InlineKeyboardButton("🏠 Main Menu", callback_data="home")]
        ])
    )

async def handle_clear_cart(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle cart clearing with confirmation"""
    query = update.callback_query
    user_id = update.effective_user.id
    
    cart_manager.clear_cart(user_id)
    
    await query.edit_message_text(
        "🗑️ *Cart Cleared!*\n\n"
        "Your cart is now empty. Your muscles just shed a tear... 😢\n\n"
        "Ready to start fresh?",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("🍕 Start Shopping", callback_data="shop")],
            [InlineKeyboardButton("🏠 Main Menu", callback_data="home")]
        ]),
        parse_mode='Markdown'
    )

async def handle_checkout_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start checkout process with better flow"""
    query = update.callback_query
    user_id = update.effective_user.id
    cart = cart_manager.get_cart(user_id)
    
    if not cart:
        await query.edit_message_text(
            "❌ Your cart is empty!\n\nAdd some products first! 🍕",
            reply_markup=get_back_keyboard("shop")
        )
        return
    
    total = cart_manager.get_cart_total(user_id)
    context.user_data['checkout_cart'] = cart
    context.user_data['checkout_total'] = total
    
    # Build order summary
    order_summary = ""
    for product_id, item in cart.items():
        subtotal = item['price'] * item['quantity']
        order_summary += f"• {item['quantity']}x {item['name']} = ${subtotal:.2f}\n"
    
    checkout_text = MESSAGES["checkout_intro"].format(
        order_summary=order_summary,
        total=total
    )
    
    keyboard = get_checkout_confirm_keyboard()
    await query.edit_message_text(checkout_text, reply_markup=keyboard, parse_mode='Markdown')

async def handle_select_country(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show country selection"""
    query = update.callback_query
    
    text = MESSAGES["ask_location"]
    keyboard = get_countries_keyboard()
    
    await query.edit_message_text(text, reply_markup=keyboard, parse_mode='Markdown')

async def handle_country_selection(update: Update, context: ContextTypes.DEFAULT_TYPE, data: str):
    """Handle country selection and ask for city"""
    query = update.callback_query
    user_id = update.effective_user.id
    
    country = data.replace("country_", "")
    context.user_data['delivery_country'] = country
    user_states[user_id] = "waiting_city"
    
    await query.edit_message_text(
        f"✅ *Country:* {country}\n\n" + MESSAGES["ask_city"],
        parse_mode='Markdown'
    )

async def handle_skip_referral(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Skip referral code and go to payment"""
    query = update.callback_query
    
    # No discount applied
    context.user_data['referral_code'] = None
    context.user_data['discount_amount'] = 0
    context.user_data['final_total'] = context.user_data.get('checkout_total', 0)
    
    text = MESSAGES["payment_select"]
    keyboard = get_payment_keyboard()
    
    await query.edit_message_text(text, reply_markup=keyboard, parse_mode='Markdown')

async def handle_payment(update: Update, context: ContextTypes.DEFAULT_TYPE, payment_data: str):
    """Process payment selection WITHOUT sending notification yet"""
    query = update.callback_query
    payment_method = payment_data.replace("pay_", "").upper()
    
    user_id = update.effective_user.id
    cart = context.user_data.get('checkout_cart', {})
    country = context.user_data.get('delivery_country', 'Unknown')
    city = context.user_data.get('delivery_city', 'Unknown')
    total = context.user_data.get('final_total', context.user_data.get('checkout_total', 0))
    referral_code = context.user_data.get('referral_code')
    discount_amount = context.user_data.get('discount_amount', 0)
    
    # Generate fake payment address for demo
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
        "referral_code": referral_code,
        "discount_amount": discount_amount,
        "payment": {
            "method": payment_method,
            "address": fake_addresses.get(payment_method, "DEMO_ADDRESS"),
            "amount_usdt": total,
            "status": "pending"
        },
        "status": "pending"
    }
    
    order_id = await create_order(order_data)
    
    # DON'T SEND NOTIFICATION HERE - REMOVED!
    # asyncio.create_task(public_notifier.send_notification(order_data))
    
    # Apply referral code usage
    if referral_code:
        await apply_referral_code(referral_code)
    
    # Clear cart
    cart_manager.clear_cart(user_id)
    
    # Get order for display
    order = await get_order_by_id(order_id)
    
    # Calculate crypto amount
    crypto_info = CRYPTO_CURRENCIES.get(payment_method, {"rate": 1})
    crypto_amount = total / crypto_info["rate"]
    
    payment_text = MESSAGES["payment_instructions"].format(
        order_number=order['order_number'],
        total=total,
        crypto_amount=crypto_amount,
        currency=payment_method,
        address=fake_addresses.get(payment_method)
    )
    
    payment_text += "\n\n_[Demo Mode - Click below to simulate payment]_"
    
    keyboard = get_payment_simulation_keyboard(order_id)
    await query.edit_message_text(payment_text, reply_markup=keyboard, parse_mode='Markdown')

async def handle_fake_payment(update: Update, context: ContextTypes.DEFAULT_TYPE, data: str):
    """Handle simulated payment for demo with notification ONLY after confirmation"""
    query = update.callback_query
    order_id = data.replace("fake_pay_", "")
    
    # Show processing animation
    await query.edit_message_text(
        "⏳ *Processing Payment...*\n\n"
        "Checking blockchain for confirmation...\n"
        "This usually takes 5-15 minutes in real transactions.",
        parse_mode='Markdown'
    )
    
    await asyncio.sleep(3)
    
    # Update order status
    success = await update_order_payment(order_id, {})
    
    if success:
        order = await get_order_by_id(order_id)
        
        # ONLY NOW send payment confirmed notification
        asyncio.create_task(public_notifier.send_notification(order))
        
        success_text = MESSAGES["payment_confirmed"].format(
            order_number=order['order_number']
        )
        
        keyboard = get_order_complete_keyboard()
        await query.edit_message_text(success_text, reply_markup=keyboard, parse_mode='Markdown')
    else:
        await query.edit_message_text(
            "❌ Something went wrong with the payment.\n\n"
            "Please try again or contact support.",
            reply_markup=get_back_keyboard("home")
        )

async def show_payment_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show payment help"""
    query = update.callback_query
    
    help_text = """
❓ *Payment Help*

*How to pay with crypto:*
1. Copy the payment address shown
2. Open your crypto wallet
3. Send the EXACT amount shown
4. Save the transaction ID
5. Wait for blockchain confirmation

*Important Tips:*
- Send the exact amount for automatic processing
- Payments expire after 30 minutes
- Confirmations usually take 5-15 minutes
- We'll notify you once confirmed

*Supported Currencies:*
- Bitcoin (BTC)
- Ethereum (ETH)
- Solana (SOL)
- Tether (USDT)

Need more help? Contact support!
"""
    
    await query.edit_message_text(
        help_text,
        parse_mode='Markdown',
        reply_markup=get_back_keyboard("home")
    )

async def handle_cancel_order(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Cancel current order"""
    query = update.callback_query
    user_id = update.effective_user.id
    
    # Clear user states and context
    user_states.pop(user_id, None)
    context.user_data.clear()
    
    await query.edit_message_text(
        "❌ *Order Cancelled*\n\n"
        "No worries! Your cart items are still saved.\n"
        "Ready to try again when you are! 💪",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("🛒 View Cart", callback_data="cart")],
            [InlineKeyboardButton("🏠 Main Menu", callback_data="home")]
        ]),
        parse_mode='Markdown'
    )
