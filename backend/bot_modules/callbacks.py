"""
Enhanced callback query handler with categories and notifications - PRODUCTION VERSION
"""
import asyncio
import secrets
import logging
from telegram import Update, InlineKeyboardMarkup, InlineKeyboardButton
from telegram.ext import ContextTypes
from pathlib import Path
import os
import sys

from .handlers import (
    start_command, show_categories, show_category_products, show_product_detail,
    show_cart, help_command, user_states, user_context
)
from .cart_manager import cart_manager
from .database import (
    get_product_by_id, get_user_orders, create_order,
    update_order_payment, get_order_by_id, apply_referral_code,
    validate_referral_code, calculate_discount, get_user_stats
)
from .keyboards import (
    get_countries_keyboard, get_payment_keyboard, get_referral_keyboard, 
    get_checkout_confirm_keyboard, get_order_complete_keyboard, get_back_keyboard
)
from .config import MESSAGES, CRYPTO_CURRENCIES
from .public_notifications import public_notifier

logger = logging.getLogger(__name__)

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
        category_id = user_context.get(user_id, {}).get("category_id")
        if category_id:
            await show_category_products(update, context, category_id)
        else:
            await show_categories(update, context)
    
    # Quantity adjustment
    elif data.startswith("qty_"):
        await handle_quantity_change(update, context, data)
    
    # Add to cart
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
    
    # Payment retry
    elif data.startswith("retry_pay_"):
        await handle_retry_payment(update, context, data)
    
    # Payment check
    elif data.startswith("check_pay_"):
        await handle_check_payment(update, context, data)
    
    # Support
    elif data == "support":
        support_text = """
💬 *NEED HELP?*

*Contact Support:*
📧 Email: support@anabolicpizza.eu
💬 Telegram: @APizzaSupport

*Response Time:*
• Orders/Payment: 1-2 hours
• General: 6-12 hours

Include your order number when contacting!

_"We're here to help you get massive!"_ 💪
"""
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("🏠 Main Menu", callback_data="home")],
            [InlineKeyboardButton("📦 My Orders", callback_data="orders")]
        ])
        await query.edit_message_text(support_text, reply_markup=keyboard, parse_mode='Markdown')
    
    elif data == "payment_help":
        await show_payment_help(update, context)
    
    elif data == "cancel_order":
        await handle_cancel_order(update, context)
    
    # Fallback payment - explain real reason
    elif data.startswith("fake_pay_"):
        order_id = data.replace("fake_pay_", "")
        await query.edit_message_text(
            "⚠️ *Payment system is currently in maintenance mode*\n\n"
            "The cryptocurrency payment gateway is temporarily unavailable.\n\n"
            "Please try again later or contact support for manual payment options.",
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("💳 Try Different Payment", callback_data="skip_referral")],
                [InlineKeyboardButton("💬 Contact Support", callback_data="support")],
                [InlineKeyboardButton("🏠 Main Menu", callback_data="home")]
            ])
        )
    
    elif data == "noop":
        pass  # Do nothing for display buttons
    
    else:
        logger.warning(f"Unknown callback data: {data}")
        await query.answer("Unknown action", show_alert=False)

async def show_orders(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show user orders in callback"""
    query = update.callback_query
    user_id = update.effective_user.id
    
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
    success_text = MESSAGES.get("product_added", "").format(
        quantity=quantity,
        product_name=product['name'],
        total=total
    )
    
    if not success_text:
        success_text = f"✅ Added {quantity}x {product['name']} to cart!\nTotal: ${total:.2f}"
    
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
    
    checkout_text = MESSAGES.get("checkout_intro", "").format(
        order_summary=order_summary,
        total=total
    )
    
    if not checkout_text:
        checkout_text = f"*ORDER SUMMARY*\n\n{order_summary}\n*Total: ${total:.2f}*\n\nReady to checkout?"
    
    keyboard = get_checkout_confirm_keyboard()
    await query.edit_message_text(checkout_text, reply_markup=keyboard, parse_mode='Markdown')

async def handle_select_country(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show country selection"""
    query = update.callback_query
    
    text = MESSAGES.get("ask_location", "📍 *SELECT YOUR COUNTRY*\n\nWhere should we deliver your order?")
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
        f"✅ *Country:* {country}\n\n" + MESSAGES.get("ask_city", "Now enter your city:"),
        parse_mode='Markdown'
    )

async def handle_skip_referral(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Skip referral code and go to payment"""
    query = update.callback_query
    
    # No discount applied
    context.user_data['referral_code'] = None
    context.user_data['discount_amount'] = 0
    context.user_data['final_total'] = context.user_data.get('checkout_total', 0)
    
    text = MESSAGES.get("payment_select", "💳 *SELECT PAYMENT METHOD*")
    keyboard = get_payment_keyboard()
    
    await query.edit_message_text(text, reply_markup=keyboard, parse_mode='Markdown')

async def handle_payment(update: Update, context: ContextTypes.DEFAULT_TYPE, payment_data: str):
    """Process payment with NOWPayments - PRODUCTION VERSION"""
    query = update.callback_query
    payment_method = payment_data.replace("pay_", "").upper()
    
    user_id = update.effective_user.id
    cart = context.user_data.get('checkout_cart', {})
    country = context.user_data.get('delivery_country', 'Unknown')
    city = context.user_data.get('delivery_city', 'Unknown')
    total = context.user_data.get('final_total', context.user_data.get('checkout_total', 0))
    referral_code = context.user_data.get('referral_code')
    discount_amount = context.user_data.get('discount_amount', 0)
    
    # Check minimum amounts
    minimum_amounts = {
        "BTC": 5.0,
        "ETH": 15.0,
        "SOL": 2.0,
        "USDT": 1.0
    }
    
    min_amount = minimum_amounts.get(payment_method, 1.0)
    
    if total < min_amount:
        await query.edit_message_text(
            f"❌ *Minimum order amount for {payment_method} is ${min_amount:.2f}*\n\n"
            f"Your order total: ${total:.2f}\n\n"
            f"Please add more items or choose different payment method:\n"
            f"• USDT - minimum $1\n"
            f"• SOL - minimum $2\n"
            f"• BTC - minimum $5\n" 
            f"• ETH - minimum $15",
            parse_mode='Markdown',
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🛒 Add More Items", callback_data="shop")],
                [InlineKeyboardButton("💳 Choose Other Payment", callback_data="skip_referral")],
                [InlineKeyboardButton("❌ Cancel", callback_data="home")]
            ])
        )
        return
    
    # Show processing message
    await query.edit_message_text(
        "⏳ *Creating payment...*\n\nGenerating your secure payment address...",
        parse_mode='Markdown'
    )
    
    # Create order in database first
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
            "amount_usdt": total,
            "status": "pending"
        },
        "status": "pending"
    }
    
    order_id = await create_order(order_data)
    order = await get_order_by_id(order_id)
    
    # Store order number for reference
    context.user_data['current_order_number'] = order['order_number']
    context.user_data['current_order_id'] = str(order_id)
    
    # Try to create REAL payment with NOWPayments
    payment_created = False
    payment_error_reason = "Unknown error"
    
    try:
        # Load environment variables
        env_path = Path('/opt/telegram-shop-bot/.env')
        if env_path.exists():
            with open(env_path) as f:
                for line in f:
                    if line.strip() and not line.startswith('#'):
                        key, value = line.strip().split('=', 1)
                        os.environ[key] = value
        
        api_key = os.environ.get("NOWPAYMENTS_API_KEY")
        
        if not api_key or api_key in ["", "demo_key_123456", "demo_mode"]:
            payment_error_reason = "Payment gateway API key not configured"
            logger.warning(payment_error_reason)
        else:
            logger.info(f"Creating real payment for order {order['order_number']}")
            
            # Import NOWPayments gateway
            sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from nowpayments_gateway import NOWPaymentsGateway
            
            # Create gateway instance
            payment_gateway = NOWPaymentsGateway(
                api_key=api_key,
                ipn_secret=os.environ.get("NOWPAYMENTS_IPN_SECRET", ""),
                sandbox=os.environ.get("NOWPAYMENTS_SANDBOX", "false").lower() == "true"
            )
            
            # Create payment request
            payment_request = {
                "order_id": str(order_id),
                "order_number": order['order_number'],
                "amount_usd": float(total),
                "currency": payment_method,
                "telegram_id": user_id,
                "description": f"Order {order['order_number']}"
            }
            
            # Create payment
            payment_result = await payment_gateway.create_payment(payment_request)
            
            if payment_result.get("success"):
                payment_created = True
                
                # Update order with payment details
                await update_order_payment_details(order_id, {
                    "payment_id": payment_result["payment_id"],
                    "pay_address": payment_result["pay_address"],
                    "pay_amount": payment_result["pay_amount"],
                    "pay_currency": payment_result["pay_currency"]
                })
                
                # Clear cart
                cart_manager.clear_cart(user_id)
                
                # Apply referral code if used
                if referral_code:
                    await apply_referral_code(referral_code)
                
                # Store payment details for copy function
                context.user_data['payment_details'] = {
                    'payment_id': payment_result["payment_id"],
                    'address': payment_result["pay_address"],
                    'amount': f"{payment_result['pay_amount']:.8f}",
                    'currency': payment_result["pay_currency"].upper()
                }
                
                # Format payment instructions with copyable text
                payment_text = f"""
💰 *PAYMENT INSTRUCTIONS*

Order: `{order['order_number']}`
Amount: **${total:.2f}**

━━━━━━━━━━━━━━━━━━━━━

📍 *Send EXACTLY this amount:*
`{payment_result['pay_amount']:.8f}` {payment_result['pay_currency'].upper()}

📬 *To this address:*
`{payment_result['pay_address']}`

━━━━━━━━━━━━━━━━━━━━━

👆 *Tap the address or amount above to copy!*

⏱️ *Expires in 20 minutes*

⚠️ **IMPORTANT:**
• Send the EXACT amount shown
• Payment confirms automatically
• Keep this chat open

🔄 *Status:* Waiting for payment...
"""
                
                # Simplified keyboard without copy buttons
                keyboard = InlineKeyboardMarkup([
                    [InlineKeyboardButton("✅ I've Sent Payment", callback_data=f"check_pay_{payment_result['payment_id']}")],
                    [
                        InlineKeyboardButton("❌ Cancel", callback_data="cancel_order"),
                        InlineKeyboardButton("❓ Help", callback_data="payment_help")
                    ]
                ])
                
                await query.edit_message_text(payment_text, reply_markup=keyboard, parse_mode='Markdown')
                
                # Store message_id for updating
                message_id = query.message.message_id
                
                # Start background payment checker with message_id
                asyncio.create_task(
                    auto_check_payment_status(
                        context.bot,
                        user_id,
                        payment_result['payment_id'],
                        order['order_number'],
                        message_id  # Pass message_id to update same message
                    )
                )
                return
                
            else:
                payment_error_reason = payment_result.get('error', 'Payment gateway returned an error')
                logger.error(f"Payment creation failed: {payment_error_reason}")
                
    except Exception as e:
        payment_error_reason = f"Technical error: {str(e)}"
        logger.error(f"Failed to create NOWPayments payment: {e}")
        import traceback
        traceback.print_exc()
    
    # If payment creation failed, show the actual error reason
    if not payment_created:
        logger.warning(f"Payment creation failed for order {order['order_number']}: {payment_error_reason}")
        
        # Different messages based on error
        if "API key not configured" in payment_error_reason:
            error_title = "⚠️ *PAYMENT GATEWAY NOT CONFIGURED*"
            error_desc = "The payment system is not properly configured. Please contact support for manual payment instructions."
        elif "Technical error" in payment_error_reason:
            error_title = "⚠️ *TECHNICAL ISSUE*"
            error_desc = "We're experiencing technical difficulties with the payment processor."
        else:
            error_title = "⚠️ *PAYMENT CREATION FAILED*"
            error_desc = f"Unable to create payment: {payment_error_reason}"
        
        error_text = f"""
{error_title}

Order: `{order['order_number']}`
Amount: **${total:.2f}**

{error_desc}

*Your options:*
1. Try again in a few moments
2. Try a different payment method
3. Contact support for manual payment

Your order has been saved and you can retry payment anytime.
"""
        
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("🔄 Retry Payment", callback_data=f"retry_pay_{payment_method.lower()}_{order_id}")],
            [InlineKeyboardButton("💳 Different Method", callback_data="skip_referral")],
            [InlineKeyboardButton("💬 Contact Support", callback_data="support")],
            [InlineKeyboardButton("❌ Cancel Order", callback_data="cancel_order")]
        ])
        
        await query.edit_message_text(error_text, reply_markup=keyboard, parse_mode='Markdown')

async def handle_copy_address(update: Update, context: ContextTypes.DEFAULT_TYPE, data: str):
    """Handle copy address button"""
    query = update.callback_query
    payment_details = context.user_data.get('payment_details', {})
    
    if payment_details and payment_details.get('address'):
        # Send address as copyable message
        await context.bot.send_message(
            chat_id=update.effective_user.id,
            text=f"📋 *Crypto Address (tap & hold to copy):*\n\n`{payment_details['address']}`",
            parse_mode='Markdown'
        )
        await query.answer("✅ Address sent - tap to copy!", show_alert=False)
    else:
        await query.answer("❌ Address not found", show_alert=True)

async def handle_copy_amount(update: Update, context: ContextTypes.DEFAULT_TYPE, data: str):
    """Handle copy amount button"""
    query = update.callback_query
    payment_details = context.user_data.get('payment_details', {})
    
    if payment_details and payment_details.get('amount'):
        # Send amount as copyable message
        await context.bot.send_message(
            chat_id=update.effective_user.id,
            text=f"📋 *Exact Amount (tap & hold to copy):*\n\n`{payment_details['amount']}` {payment_details.get('currency', '')}",
            parse_mode='Markdown'
        )
        await query.answer("✅ Amount sent - tap to copy!", show_alert=False)
    else:
        await query.answer("❌ Amount not found", show_alert=True)

async def handle_retry_payment(update: Update, context: ContextTypes.DEFAULT_TYPE, data: str):
    """Handle payment retry"""
    query = update.callback_query
    parts = data.replace("retry_pay_", "").split("_")
    payment_method = parts[0].upper()
    order_id = "_".join(parts[1:]) if len(parts) > 1 else None
    
    if order_id:
        # Reload order from database
        order = await get_order_by_id(order_id)
        if order:
            context.user_data['current_order_id'] = order_id
            context.user_data['current_order_number'] = order['order_number']
            context.user_data['final_total'] = order['total_usdt']
            
            # Retry payment
            await handle_payment(update, context, f"pay_{payment_method.lower()}")
        else:
            await query.answer("Order not found!", show_alert=True)
    else:
        await query.answer("Invalid retry request", show_alert=True)

async def handle_check_payment(update: Update, context: ContextTypes.DEFAULT_TYPE, data: str):
    """Handle manual payment status check"""
    query = update.callback_query
    payment_id = data.replace("check_pay_", "")
    
    await query.answer("Checking payment status...", show_alert=False)
    
    # Try to check with NOWPayments
    try:
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from nowpayments_gateway import payment_gateway
        
        if payment_gateway:
            status = await payment_gateway.check_payment_status(payment_id)
            
            if status and status.get("payment_status") == "finished":
                # Get order number
                order_number = context.user_data.get('current_order_number', 'YOUR-ORDER')
                
                success_text = f"""
✅ *PAYMENT CONFIRMED!*

Order: `{order_number}`

Your payment has been successfully received! 🎉

*What happens next:*
• Order is being processed
• Shipping within 24 hours
• You'll receive tracking info

Thank you for your order! 💪🚀

_Your gains are on the way!_ 🍕💉
"""
                
                await query.edit_message_text(
                    success_text,
                    parse_mode='Markdown',
                    reply_markup=get_order_complete_keyboard()
                )
            elif status and status.get("payment_status") == "partially_paid":
                await query.answer(
                    f"⚠️ Partial payment received. Still waiting for full amount.",
                    show_alert=True
                )
            else:
                await query.answer(
                    "⏳ Payment not yet confirmed. Please wait...",
                    show_alert=True
                )
    except Exception as e:
        logger.error(f"Error checking payment: {e}")
        await query.answer("Unable to check payment status", show_alert=True)

async def show_payment_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show payment help"""
    query = update.callback_query
    
    help_text = """
❓ *PAYMENT HELP*

*How to pay with crypto:*
1. Copy the payment address shown
2. Open your crypto wallet
3. Send the EXACT amount shown
4. Save the transaction ID
5. Wait for blockchain confirmation

*Important Tips:*
• Send the exact amount for automatic processing
• Payments expire after 30 minutes
• Confirmations usually take 5-15 minutes
• We'll notify you once confirmed

*Supported Currencies:*
• Bitcoin (BTC) - min $5
• Ethereum (ETH) - min $15
• Solana (SOL) - min $2
• Tether (USDT) - min $1

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

async def auto_check_payment_status(bot, telegram_id: int, payment_id: str, order_number: str, message_id: int = None):
    """Background task to check payment status - UPDATES EXISTING MESSAGE"""
    try:
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from nowpayments_gateway import payment_gateway
    except:
        logger.warning("Payment gateway not available for auto-check")
        return
    
    if not payment_gateway:
        return
    
    max_checks = 40  # 20 minutes / 30 seconds
    check_interval = 30  # seconds
    already_notified = False
    
    for i in range(max_checks):
        await asyncio.sleep(check_interval)
        
        try:
            status = await payment_gateway.check_payment_status(payment_id)
            
            if status and status.get("payment_status") == "finished" and not already_notified:
                already_notified = True
                
                # SUCCESS message
                success_text = f"""
✅ *PAYMENT CONFIRMED!*

Order: `{order_number}`

Your payment has been successfully received! 🎉

*What happens next:*
• Order is being processed
• Shipping within 24 hours
• You'll receive tracking info

Thank you for your order! 💪

_Time to get massive! Your gains are on the way!_ 🍕💉
"""
                
                keyboard = get_order_complete_keyboard()
                
                # Try to update existing message if we have message_id
                if message_id:
                    try:
                        await bot.edit_message_text(
                            chat_id=telegram_id,
                            message_id=message_id,
                            text=success_text,
                            reply_markup=keyboard,
                            parse_mode='Markdown'
                        )
                    except:
                        # If edit fails, send new message
                        await bot.send_message(
                            chat_id=telegram_id,
                            text=success_text,
                            reply_markup=keyboard,
                            parse_mode='Markdown'
                        )
                else:
                    # Send new message if no message_id
                    await bot.send_message(
                        chat_id=telegram_id,
                        text=success_text,
                        reply_markup=keyboard,
                        parse_mode='Markdown'
                    )
                
                logger.info(f"✅ Payment auto-confirmed for {order_number}")
                break
                
            elif status and status.get("payment_status") == "partially_paid":
                actually_paid = float(status.get("actually_paid", 0))
                expected = float(status.get("pay_amount", 0))
                remaining = expected - actually_paid
                
                if not already_notified:  # Only notify once about partial
                    partial_text = f"""
⚠️ *PARTIAL PAYMENT RECEIVED*

Order: `{order_number}`

Received: `{actually_paid:.8f}`
Expected: `{expected:.8f}`
**Need: `{remaining:.8f}`**

Please send the remaining amount to the same address.
"""
                    await bot.send_message(
                        chat_id=telegram_id,
                        text=partial_text,
                        parse_mode='Markdown'
                    )
                
            elif status and status.get("payment_status") == "expired":
                already_notified = True
                
                expired_text = f"""
❌ *PAYMENT EXPIRED*

Order: `{order_number}`

The payment window has expired.

Please create a new order to continue.
"""
                keyboard = InlineKeyboardMarkup([
                    [InlineKeyboardButton("🔄 New Order", callback_data="shop")],
                    [InlineKeyboardButton("💬 Support", callback_data="support")],
                    [InlineKeyboardButton("🏠 Menu", callback_data="home")]
                ])
                
                await bot.send_message(
                    chat_id=telegram_id,
                    text=expired_text,
                    reply_markup=keyboard,
                    parse_mode='Markdown'
                )
                break
                
        except Exception as e:
            logger.error(f"Error in payment check: {e}")
    
    # Timeout after 20 minutes
    if i == max_checks - 1 and not already_notified:
        timeout_text = f"""
⏰ *CHECKING TIMEOUT*

Order: `{order_number}`

We're still waiting for your payment.

If you've sent it, it may take longer to confirm due to network congestion.

Contact support if you need help.
"""
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("💬 Contact Support", callback_data="support")],
            [InlineKeyboardButton("🔄 New Order", callback_data="shop")],
            [InlineKeyboardButton("🏠 Menu", callback_data="home")]
        ])
        
        await bot.send_message(
            chat_id=telegram_id,
            text=timeout_text,
            reply_markup=keyboard,
            parse_mode='Markdown'
        )

# Helper function to update order payment details
async def update_order_payment_details(order_id: str, payment_details: dict):
    """Update order with NOWPayments payment details"""
    from .database import db
    from bson import ObjectId
    
    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {
            "$set": {
                "payment.payment_id": payment_details.get("payment_id"),
                "payment.address": payment_details.get("pay_address"),
                "payment.amount_crypto": payment_details.get("pay_amount"),
                "payment.currency": payment_details.get("pay_currency")
            }
        }
    )

# Fallback demo payment handler (for when NOWPayments fails)
async def handle_demo_payment(update, context, payment_method, order, order_id, total):
    """Fallback when payment gateway fails - show manual payment instructions"""
    query = update.callback_query
    user_id = update.effective_user.id
    
    # Manual payment addresses (replace with your real addresses)
    manual_addresses = {
        "BTC": "YOUR_MANUAL_BTC_ADDRESS",
        "ETH": "YOUR_MANUAL_ETH_ADDRESS", 
        "SOL": "YOUR_MANUAL_SOL_ADDRESS",
        "USDT": "YOUR_MANUAL_USDT_ADDRESS"
    }
    
    # Calculate crypto amount manually
    crypto_rates = {"BTC": 65000, "ETH": 3500, "SOL": 150, "USDT": 1}
    crypto_amount = total / crypto_rates.get(payment_method, 1)
    
    # Update order with manual address
    from .database import db
    from bson import ObjectId
    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {
            "$set": {
                "payment.address": manual_addresses.get(payment_method, "CONTACT_SUPPORT"),
                "payment.manual": True
            }
        }
    )
    
    # Clear cart
    cart_manager.clear_cart(user_id)
    
    # Apply referral code if used
    if context.user_data.get('referral_code'):
        await apply_referral_code(context.user_data['referral_code'])
    
    # Manual payment text
    manual_text = f"""
⚠️ *MANUAL PAYMENT MODE*

Order: `{order['order_number']}`
Amount: **${total:.2f}** (~{crypto_amount:.8f} {payment_method})

Due to payment gateway issues, please use manual payment:

📬 Send to this address:
`{manual_addresses.get(payment_method, 'CONTACT_SUPPORT')}`

⚠️ **IMPORTANT:**
• Send EXACT amount
• Save transaction ID
• Contact support with order number and transaction ID
• We'll confirm payment manually within 2-6 hours

━━━━━━━━━━━━━━━━━━━━━

After sending payment, contact support:
@APizzaSupport
"""
    
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("💬 Contact Support", callback_data="support")],
        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")]
    ])
    
    await query.edit_message_text(manual_text, reply_markup=keyboard, parse_mode='Markdown')

async def handle_fake_payment(update: Update, context: ContextTypes.DEFAULT_TYPE, data: str):
    """This function should not be used in production"""
    query = update.callback_query
    
    # In production, redirect to support
    await query.edit_message_text(
        "⚠️ *Payment system is currently in maintenance mode*\n\n"
        "Please contact support for manual payment instructions.",
        parse_mode='Markdown',
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("💬 Contact Support", callback_data="support")],
            [InlineKeyboardButton("🏠 Main Menu", callback_data="home")]
        ])
    )