"""
Enhanced callback query handler with categories and notifications
"""
import asyncio
import secrets
import logging
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
    
    elif data.startswith("check_pay_"):
        await handle_check_payment(update, context, data)
    
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
    """Process REAL payment with NOWPayments"""
    query = update.callback_query
    payment_method = payment_data.replace("pay_", "").upper()
    
    user_id = update.effective_user.id
    cart = context.user_data.get('checkout_cart', {})
    country = context.user_data.get('delivery_country', 'Unknown')
    city = context.user_data.get('delivery_city', 'Unknown')
    total = context.user_data.get('final_total', context.user_data.get('checkout_total', 0))
    referral_code = context.user_data.get('referral_code')
    discount_amount = context.user_data.get('discount_amount', 0)
    
    # Show processing message
    await query.edit_message_text(
        "⏳ *Creating payment...*\n\nGenerating your payment address...",
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
    
    # Try to create REAL payment with NOWPayments
    payment_created = False
    
    try:
        # FORCE RELOAD environment
        import os
        import sys
        from pathlib import Path
        
        # Načítaj .env priamo zo súboru
        env_path = Path('/opt/telegram-shop-bot/.env')
        if env_path.exists():
            with open(env_path) as f:
                for line in f:
                    if line.strip() and not line.startswith('#'):
                        key, value = line.strip().split('=', 1)
                        os.environ[key] = value
        
        api_key = os.environ.get("NOWPAYMENTS_API_KEY")
        
        if api_key and api_key not in ["", "demo_key_123456", "demo_mode"]:
            logger.info(f"Creating real payment for order {order['order_number']}")
            logger.info(f"API Key found: {api_key[:10]}...")
            
            # Import NOWPayments gateway class
            sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from nowpayments_gateway import NOWPaymentsGateway
            
            # Create fresh gateway instance
            payment_gateway = NOWPaymentsGateway(
                api_key=api_key,
                ipn_secret=os.environ.get("NOWPAYMENTS_IPN_SECRET", ""),
                sandbox=os.environ.get("NOWPAYMENTS_SANDBOX", "false").lower() == "true"
            )
            
            logger.info(f"Gateway created, sandbox={payment_gateway.sandbox}")
            
            # Create payment request
            payment_request = {
                "order_id": str(order_id),
                "order_number": order['order_number'],
                "amount_usd": float(total),
                "currency": payment_method,
                "telegram_id": user_id,
                "description": "Enjoy"
            }
            
            logger.info(f"Sending payment request: {payment_request}")
            
            # Create payment
            payment_result = await payment_gateway.create_payment(payment_request)
            
            logger.info(f"Payment result: {payment_result}")
            
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
                
                # Format payment instructions
                payment_text = f"""
💰 *PAYMENT INSTRUCTIONS*

Order: `{order['order_number']}`
Amount: **${total:.2f}**

━━━━━━━━━━━━━━━━━━━━━

📍 *Send EXACTLY this amount:*
**{payment_result['pay_amount']:.8f} {payment_result['pay_currency'].upper()}**

📬 *To this address:*
`{payment_result['pay_address']}`

━━━━━━━━━━━━━━━━━━━━━

⏱️ *Payment expires in 20 minutes*

⚠️ **IMPORTANT:**
- Send the EXACT amount shown
- Payment will be confirmed automatically
- DO NOT close this chat until confirmed

🔄 *Status:* Waiting for payment...
"""
                
                # Create keyboard with payment status check
                keyboard = InlineKeyboardMarkup([
                    [InlineKeyboardButton("✅ I've Sent Payment", callback_data=f"check_pay_{payment_result['payment_id']}")],
                    [InlineKeyboardButton("❌ Cancel Order", callback_data="cancel_order")],
                    [InlineKeyboardButton("❓ Need Help?", callback_data="payment_help")]
                ])
                
                await query.edit_message_text(payment_text, reply_markup=keyboard, parse_mode='Markdown')
                
                # Start background task to check payment status
                asyncio.create_task(
                    auto_check_payment_status(
                        context.bot,
                        user_id,
                        payment_result['payment_id'],
                        order['order_number']
                    )
                )
                return
                
            else:
                logger.error(f"Payment creation failed: {payment_result.get('error', 'Unknown error')}")
                
        else:
            logger.info("No valid API key found, using demo mode")
            
    except Exception as e:
        logger.error(f"Failed to create NOWPayments payment: {e}")
        import traceback
        traceback.print_exc()
    
    # If we get here, use DEMO mode
    if not payment_created:
        logger.info(f"Falling back to demo mode for order {order['order_number']}")
        await handle_demo_payment(update, context, payment_method, order, order_id, total)

async def handle_demo_payment(update, context, payment_method, order, order_id, total):
    """Fallback demo payment for testing"""
    query = update.callback_query
    user_id = update.effective_user.id
    
    # Generate fake addresses for demo
    fake_addresses = {
        "BTC": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        "ETH": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        "SOL": "7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi",
        "USDT": "TN5jgpFtWvLhvER4WYeWPWhjLZiATLqN9b"
    }
    
    # Update order with fake address
    from .database import db
    from bson import ObjectId
    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {
            "$set": {
                "payment.address": fake_addresses.get(payment_method, "DEMO_ADDRESS")
            }
        }
    )
    
    # Clear cart
    cart_manager.clear_cart(user_id)
    
    # Apply referral code if used
    if context.user_data.get('referral_code'):
        await apply_referral_code(context.user_data['referral_code'])
    
    # Calculate crypto amount
    crypto_info = CRYPTO_CURRENCIES.get(payment_method, {"rate": 1})
    crypto_amount = total / crypto_info["rate"]
    
    # Demo payment text
    demo_text = f"""
⚠️ *DEMO MODE - Testing Only*

Order: `{order['order_number']}`
Amount: **${total:.2f}** ({crypto_amount:.8f} {payment_method})

Send to this address:
`{fake_addresses.get(payment_method)}`

━━━━━━━━━━━━━━━━━━━━━

_This is a demo. Click below to simulate payment._
"""
    
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🎮 Simulate Payment", callback_data=f"fake_pay_{order_id}")],
        [InlineKeyboardButton("❌ Cancel", callback_data="home")]
    ])
    
    await query.edit_message_text(demo_text, reply_markup=keyboard, parse_mode='Markdown')

async def handle_check_payment(update: Update, context: ContextTypes.DEFAULT_TYPE, data: str):
    """Handle manual payment status check"""
    query = update.callback_query
    payment_id = data.replace("check_pay_", "")
    
    await query.answer("Checking payment status...", show_alert=False)
    
    # Try to check with NOWPayments
    try:
        import sys
        import os
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from nowpayments_gateway import payment_gateway
        
        if payment_gateway:
            status = await payment_gateway.check_payment_status(payment_id)
            
            if status and status.get("payment_status") == "finished":
                await query.edit_message_text(
                    "✅ *Payment Confirmed!*\n\nYour order is being processed!",
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
    except:
        await query.answer("Unable to check payment status", show_alert=True)

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

async def auto_check_payment_status(bot, telegram_id: int, payment_id: str, order_number: str):
    """
    Background task to automatically check payment status
    Checks every 30 seconds for up to 20 minutes
    """
    try:
        import sys
        import os
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from nowpayments_gateway import payment_gateway
    except:
        logger.warning("Payment gateway not available for auto-check")
        return
    
    if not payment_gateway:
        return
    
    max_checks = 40  # 20 minutes / 30 seconds
    check_interval = 30  # seconds
    
    for i in range(max_checks):
        await asyncio.sleep(check_interval)
        
        try:
            status = await payment_gateway.check_payment_status(payment_id)
            
            if status and status.get("payment_status") == "finished":
                # Payment confirmed!
                success_text = f"""
✅ *PAYMENT CONFIRMED!*

Order: `{order_number}`

Your payment has been successfully received!

Your order is now being processed and will be shipped within 24 hours.

Thank you for your order! 💪🚀
"""
                keyboard = InlineKeyboardMarkup([
                    [InlineKeyboardButton("📦 View My Orders", callback_data="orders")],
                    [InlineKeyboardButton("🍕 Order More", callback_data="shop")],
                    [InlineKeyboardButton("🏠 Main Menu", callback_data="home")]
                ])
                
                await bot.send_message(
                    chat_id=telegram_id,
                    text=success_text,
                    reply_markup=keyboard,
                    parse_mode='Markdown'
                )
                break
                
            elif status and status.get("payment_status") == "partially_paid":
                # Partial payment
                actually_paid = status.get("actually_paid", 0)
                expected = status.get("pay_amount", 0)
                remaining = expected - actually_paid
                
                partial_text = f"""
⚠️ *PARTIAL PAYMENT DETECTED*

Received: {actually_paid:.8f}
Expected: {expected:.8f}
**Still need: {remaining:.8f}**

Please send the remaining amount to complete your order.
"""
                await bot.send_message(
                    chat_id=telegram_id,
                    text=partial_text,
                    parse_mode='Markdown'
                )
                
            elif status and status.get("payment_status") == "expired":
                # Payment expired
                expired_text = f"""
❌ *PAYMENT EXPIRED*

Order: `{order_number}`

Your payment window has expired.
Please create a new order if you still want to purchase.
"""
                keyboard = InlineKeyboardMarkup([
                    [InlineKeyboardButton("🔄 Create New Order", callback_data="shop")],
                    [InlineKeyboardButton("🏠 Main Menu", callback_data="home")]
                ])
                
                await bot.send_message(
                    chat_id=telegram_id,
                    text=expired_text,
                    reply_markup=keyboard,
                    parse_mode='Markdown'
                )
                break
                
        except Exception as e:
            logger.error(f"Error checking payment status: {e}")
    
    # If we get here, payment wasn't confirmed in 20 minutes
    if i == max_checks - 1:
        timeout_text = f"""
⏰ *PAYMENT TIMEOUT*

Order: `{order_number}`

We haven't received your payment within the time limit.
Your order has been cancelled.

If you've already sent the payment, please contact support with your transaction ID.
"""
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("💬 Contact Support", callback_data="support")],
            [InlineKeyboardButton("🔄 Try Again", callback_data="shop")],
            [InlineKeyboardButton("🏠 Main Menu", callback_data="home")]
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
