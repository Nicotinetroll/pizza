"""
Enhanced bot command and message handlers with better UX and VIP support
"""
import asyncio
from telegram import Update, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from bson import ObjectId
from datetime import datetime
import logging
import aiohttp
import random

from .config import MESSAGES
from .database import (
    create_or_update_user, get_active_categories, get_products_by_category,
    get_product_by_id, get_user_orders, get_user_stats,
    validate_referral_code, calculate_discount, get_user_vip_status, db
)
from .keyboards import (
    get_main_menu_keyboard, get_categories_keyboard, get_products_keyboard,
    get_product_detail_keyboard, get_cart_keyboard, get_checkout_confirm_keyboard,
    get_referral_keyboard, get_back_keyboard, get_order_complete_keyboard
)
from .cart_manager import cart_manager

# Setup logger
logger = logging.getLogger(__name__)

# User states storage for conversation flow
user_states = {}
user_context = {}  # Store category context

# Add these new command handlers after existing ones

async def support_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /support command with contact info"""
    user = update.effective_user
    
    support_text = """
💬 *NEED HELP? WE GOT YOUR BACK!*

Unlike your natty friends who "don't understand your journey", we're here 24/7! 💪

*Contact Support:*
📧 Email: support@anabolicpizza.eu
💬 Telegram: @APizzaSupport
🔒 Wickr: APizzaHelp

*Response Time:*
- Emergency (order issues): 1-2 hours
- General questions: 6-12 hours
- "Is this natty?" jokes: Never (we know it's not)

*Before contacting:*
1. Check your order status with /orders
2. Read shipping info with /shipping
3. Check FAQ with /help

Remember: We're as discreet as your gains are obvious! 🤫

_"Customer service so good, even your liver will thank us!"_
"""
    
    keyboard = get_main_menu_keyboard()
    
    # Save for chat history
    await save_chat_message(
        telegram_id=user.id,
        username=user.username,
        message="/support",
        direction="incoming",
        first_name=user.first_name,
        last_name=user.last_name
    )
    
    await save_chat_message(
        telegram_id=user.id,
        username=user.username,
        message=support_text,
        direction="outgoing"
    )
    
    await update.message.reply_text(support_text, reply_markup=keyboard, parse_mode='Markdown')

async def shipping_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /shipping command with delivery info"""
    user = update.effective_user
    
    shipping_text = """
📦 *SHIPPING & DELIVERY INTEL*

*How We Roll:*
- Stealth Level: Special Forces 🥷
- Packaging: More discreet than your "vitamin" stash
- Tracking: Available (but use Tor, bro)
- Success Rate: 99.7% (better than your natty friend's bench PR)

*Delivery Times:*
🇩🇪🇳🇱🇧🇪 *Germany/Netherlands/Belgium:* 2-4 days
🇫🇷🇦🇹🇨🇿 *France/Austria/Czech:* 3-5 days
🇵🇱🇸🇰🇭🇺 *Poland/Slovakia/Hungary:* 4-6 days
🇪🇸🇮🇹🇵🇹 *Spain/Italy/Portugal:* 5-7 days
🇸🇪🇫🇮🇩🇰 *Nordics:* 4-6 days
🌍 *Rest of EU:* 5-8 days

*Stealth Features:*
✅ No brand names
✅ Fake return address
✅ Looks like supplements (which it technically is 😏)
✅ Vacuum sealed
✅ No signature required

*Pro Tips:*
- Use your real name (yes, really)
- Normal address (no abandoned warehouses)
- We don't store addresses after delivery
- If package goes missing, we reship (once)

_"So stealthy, even your muscles won't know it's coming!"_ 💨
"""
    
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🍕 Order Now", callback_data="shop")],
        [InlineKeyboardButton("💬 Contact Support", callback_data="support")],
        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")]
    ])
    
    await update.message.reply_text(shipping_text, reply_markup=keyboard, parse_mode='Markdown')

async def cycles_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /cycles command with cycle advice"""
    user = update.effective_user
    
    cycles_text = """
🔄 *CYCLE GUIDANCE*

⚠️ *DISCLAIMER: Not medical advice. We just sell pizza, bro!*

*First Timer? (Baby's First Blast):*
- Start simple (Test only)
- 300-500mg/week for 12-16 weeks
- Get bloodwork (seriously)
- Have AI on hand
- PCT is NOT optional

*Popular Stacks We "Don't" Recommend:*
💉 *The Classic:* Test + Dbol
💉 *The Lean Gains:* Test + Var
💉 *The Mass Monster:* Test + Deca + Dbol
💉 *The Suicide Cut:* Test + Tren + Mast
💉 *The Rich Piana Special:* Everything + Kitchen Sink

*Golden Rules:*
1. Time on = Time off (minimum)
2. Bloodwork before, during, after
3. Start low, go slow
4. If you can't see abs, you're not ready for Tren
5. "Just one cycle" - Nobody ever

*PCT Essentials:*
- Nolva/Clomid (pick one or both)
- HCG (during cycle is better)
- Time (be patient, gains goblin)

Remember: The only thing natural about you should be your denial! 😈

_"Eat clen, tren hard, anavar give up!"_
"""
    
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🛒 Get Your Gear", callback_data="shop")],
        [InlineKeyboardButton("📚 More Info", callback_data="help")],
        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")]
    ])
    
    await update.message.reply_text(cycles_text, reply_markup=keyboard, parse_mode='Markdown')

async def gains_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /gains command with motivation"""
    user = update.effective_user
    
    gains_text = """
💪 *GAINS REPORT INCOMING*

*Current Status:*
✅ Natty Card: REVOKED
✅ Sleeves: DON'T FIT
✅ Delts: CAPPED
✅ Jawline: SQUARED
✅ Confidence: THROUGH THE ROOF
✅ Dick: STILL WORKS (if you do it right)

*What Our Customers Say:*
_"Gained 30lbs in 12 weeks. Parents think I'm on steroids. They're right!"_ - Mike, 23

_"Ex girlfriend wants me back. New girlfriend is hotter. Life is good."_ - Tom, 28

_"Coworkers keep asking about my 'workout routine'. I just smile."_ - James, 31

_"Warning: Doors may appear narrower than before"_ - Everyone

*Expected Results Timeline:*
Week 1-2: Placebo strength
Week 3-4: Actual strength  
Week 5-6: Shirts get tight
Week 7-8: "You're looking bigger bro"
Week 9-10: "Are you natty?"
Week 11-12: "Definitely not natty"

*Side Effects May Include:*
- Constant pump
- Inability to wipe ass properly
- Sudden expertise in endocrinology
- Urge to give unsolicited gym advice
- Becoming a "lifetime natural" on Instagram

Ready to transcend humanity? 🚀
"""
    
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🚀 BLAST OFF", callback_data="shop")],
        [InlineKeyboardButton("📊 View Products", callback_data="shop")],
        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")]
    ])
    
    await update.message.reply_text(gains_text, reply_markup=keyboard, parse_mode='Markdown')

async def natty_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /natty command - the ultimate joke"""
    user = update.effective_user
    
    natty_text = """
🤡 *NATTY STATUS CHECK*

Analyzing... 🔍

*Results:*
❌ Natty Status: NOT FOUND
❌ Natty Card: EXPIRED
❌ Drug Test: WOULD FAIL
❌ WADA Approved: ABSOLUTELY NOT
✅ Honesty Level: AT LEAST YOU'RE HERE

*Common "Natty" Excuses Debunked:*
- "It's just creatine" - Sure, injectable creatine
- "Good genetics" - From Trenbolone family tree
- "I eat clean" - Clen* you mean
- "8 hours sleep" - Plus 250mg Test twice a week
- "NoFap gave me gains" - No, that was the Deca
- "Chicken, rice, broccoli" - You forgot the sauce

*Natty Achievements:*
- 2 years for 10lb muscle ❌
- Strength plateau after 6 months ❌  
- Looking DYEL in shirts ❌
- Depression from slow progress ❌
- "Respect" from other natties ❌

*Enhanced Achievements:*
- 12 weeks for 20lb muscle ✅
- PRs every week ✅
- Looking juicy 24/7 ✅
- Confidence of a Greek God ✅
- Actually enjoying life ✅

*Conclusion:*
Why natty when you can be a BEAST? 🦍

_"The only thing natural about bodybuilding is the lies we tell!"_
"""
    
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("💉 Fix My Natty Status", callback_data="shop")],
        [InlineKeyboardButton("🏠 Embrace the Dark Side", callback_data="home")]
    ])
    
    await update.message.reply_text(natty_text, reply_markup=keyboard, parse_mode='Markdown')

async def handle_group_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle commands in group chats with better humor"""
    from telegram import InlineKeyboardButton, InlineKeyboardMarkup
    from .config import BOT_USERNAME
    
    if update.message:
        try:
            bot_username = BOT_USERNAME.replace('@', '')
            
            # Random funny messages for group
            group_messages = [
                "🚨 NATTY POLICE ALERT! Someone's trying to transcend humanity! Hit my DMs to complete your transformation! 💪",
                "👀 I see someone's ready to leave humanity behind! Slide into my DMs for your ticket to Gainsville! 🚂",
                "🔥 DYEL detected! Time to fix that! Click below to enter the anabolic kingdom! 👑",
                "⚠️ Testosterone levels appear dangerously normal! Let's fix that in private! 😈",
                "🎭 Still pretending to be natty in 2025? Come to my DMs, let's be honest! 💉",
            ]
            
            keyboard = InlineKeyboardMarkup([
                [InlineKeyboardButton("💊 Enter The Anabolic Kingdom", url=f"https://t.me/{bot_username}")],
                [InlineKeyboardButton("🍕 Get Your Pizza Delivery", url=f"https://t.me/{bot_username}")]
            ])
            
            await update.message.reply_text(
                random.choice(group_messages),
                reply_markup=keyboard
            )
            
        except Exception as e:
            logger.error(f"Error in group handler: {e}")
    
    return

# IMPORTANT: Direct notification to frontend
async def notify_frontend_new_message(telegram_id: int):
    """Send direct notification to frontend about new message"""
    try:
        # Create a simple HTTP request to trigger frontend refresh
        async with aiohttp.ClientSession() as session:
            # This endpoint will be added to main.py
            async with session.post(
                'http://localhost:8000/api/chat/notify-new-message',
                json={'telegram_id': telegram_id}
            ) as response:
                if response.status == 200:
                    logger.info(f"✅ Frontend notified about new message from {telegram_id}")
                else:
                    logger.warning(f"Failed to notify frontend: {response.status}")
    except Exception as e:
        logger.error(f"Error notifying frontend: {e}")

async def save_chat_message(telegram_id: int, username: str, message: str, direction: str = "incoming", first_name: str = None, last_name: str = None):
    """Save chat message to database and notify frontend"""
    try:
        from datetime import datetime
        
        message_doc = {
            "telegram_id": telegram_id,
            "username": username or f"user{telegram_id}",
            "first_name": first_name,
            "last_name": last_name,
            "message": message,
            "direction": direction,
            "timestamp": datetime.utcnow(),
            "read": False if direction == "incoming" else True
        }
        
        result = await db.chat_messages.insert_one(message_doc)
        message_doc["_id"] = str(result.inserted_id)
        logger.info(f"Saved {direction} message from {telegram_id}: {message[:50]}...")
        
        # IMPORTANT: Notify frontend directly
        if direction == "incoming":
            await notify_frontend_new_message(telegram_id)
        
        # Still try WebSocket broadcast for backwards compatibility
        try:
            import sys
            import os
            sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from main import manager
            
            broadcast_message = {
                "type": "new_message",
                "message": {
                    "_id": str(result.inserted_id),
                    "telegram_id": telegram_id,
                    "username": username or f"user{telegram_id}",
                    "first_name": first_name,
                    "last_name": last_name,
                    "message": message,
                    "direction": direction,
                    "timestamp": message_doc["timestamp"].isoformat(),
                    "read": message_doc["read"]
                }
            }
            
            await manager.broadcast(broadcast_message)
            logger.info(f"✅ Broadcasted {direction} message to WebSocket")
            
        except Exception as ws_err:
            logger.debug(f"WebSocket broadcast skipped: {ws_err}")
            
    except Exception as e:
        logger.error(f"Error saving chat message: {e}")

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command with warm welcome"""
    user = update.effective_user
    
    # Save incoming command
    await save_chat_message(
        telegram_id=user.id,
        username=user.username,
        message="/start",
        direction="incoming",
        first_name=user.first_name,
        last_name=user.last_name
    )
    
    # Save user to database
    await create_or_update_user({
        "telegram_id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name
    })
    
    # Get user stats and VIP status
    stats = await get_user_stats(user.id)
    vip_status = await get_user_vip_status(user.id)
    
    welcome_text = MESSAGES["welcome"].format(name=user.first_name or "Bro")
    
    # Add returning customer message
    if stats["total_orders"] > 0:
        welcome_text += f"\n🎉 *Welcome back!* Orders: {stats['total_orders']}"
    
    # Add VIP status
    if vip_status["is_vip"]:
        welcome_text += f"\n👑 *VIP Member* - {vip_status['discount']}% OFF on everything!"
    
    keyboard = get_main_menu_keyboard()
    
    # Save outgoing message
    await save_chat_message(
        telegram_id=user.id,
        username=user.username,
        message=welcome_text,
        direction="outgoing"
    )
    
    if update.message:
        await update.message.reply_text(welcome_text, reply_markup=keyboard, parse_mode='Markdown')
    elif update.callback_query:
        await update.callback_query.edit_message_text(welcome_text, reply_markup=keyboard, parse_mode='Markdown')

async def shop_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /shop command - show categories"""
    user = update.effective_user
    
    # Save incoming command
    await save_chat_message(
        telegram_id=user.id,
        username=user.username,
        message="/shop",
        direction="incoming",
        first_name=user.first_name,
        last_name=user.last_name
    )
    
    await show_categories(update, context)

async def show_categories(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show product categories"""
    categories = await get_active_categories()
    
    if not categories:
        text = MESSAGES["no_categories"]
        keyboard = get_back_keyboard()
    else:
        text = MESSAGES["shop_categories"]
        keyboard = get_categories_keyboard(categories)
    
    # Save outgoing message if from command
    if update.message:
        user = update.effective_user
        await save_chat_message(
            telegram_id=user.id,
            username=user.username,
            message=text,
            direction="outgoing"
        )
    
    if update.callback_query:
        try:
            await update.callback_query.edit_message_text(text, reply_markup=keyboard, parse_mode='Markdown')
        except:
            await update.callback_query.message.reply_text(text, reply_markup=keyboard, parse_mode='Markdown')
    else:
        await update.message.reply_text(text, reply_markup=keyboard, parse_mode='Markdown')

async def show_category_products(update: Update, context: ContextTypes.DEFAULT_TYPE, category_id: str):
    """Show products in a category"""
    query = update.callback_query
    user_id = update.effective_user.id
    
    # Store category context
    user_context[user_id] = {"category_id": category_id}
    
    # Get VIP status for pricing
    vip_status = await get_user_vip_status(user_id)
    
    products = await get_products_by_category(category_id, vip_discount=vip_status["discount"])
    
    if not products:
        text = MESSAGES["category_empty"]
        keyboard = get_back_keyboard("shop")
    else:
        # Get category name for display
        from .database import get_category_by_id
        category = await get_category_by_id(category_id)
        
        text = f"{category.get('emoji', '📦')} *{category['name']}*\n"
        text += f"_{category.get('description', 'Premium products')}_"
        
        if vip_status["is_vip"]:
            text += f"\n👑 *VIP {vip_status['discount']}% OFF*"
        
        text += "\n\nSelect product:"
        
        keyboard = get_products_keyboard(products, category_id)
    
    await query.edit_message_text(text, reply_markup=keyboard, parse_mode='Markdown')

async def show_product_detail(update: Update, context: ContextTypes.DEFAULT_TYPE, product_id: str):
    """Show detailed product view with simplified quantity selector"""
    query = update.callback_query
    user_id = update.effective_user.id
    
    # Get VIP status
    vip_status = await get_user_vip_status(user_id)
    
    product = await get_product_by_id(product_id, vip_discount=vip_status["discount"])
    if not product:
        await query.edit_message_text("Product not found! 🤷", reply_markup=get_back_keyboard("shop"))
        return
    
    # Get current quantity selection (default 1)
    quantity = cart_manager.get_quantity(user_id, product_id)
    
    # Check if already in cart
    cart = cart_manager.get_cart(user_id)
    in_cart = cart.get(product_id, {}).get('quantity', 0)
    
    # Build detailed product text (compact version)
    text = f"🏷️ *{product['name']}*\n"
    text += f"_{product['description']}_\n\n"
    
    # Show price with VIP discount if applicable
    if product.get("has_vip_discount"):
        text += f"💰 *Price:* ~${product['original_price']:.2f}~ ${product['price_usdt']:.2f}\n"
        text += f"👑 *VIP {vip_status['discount']}% OFF!*\n"
    else:
        text += f"💰 *Price:* ${product['price_usdt']:.2f}\n"
    
    if quantity > 1:
        text += f"📦 *Qty:* {quantity} = ${product['price_usdt'] * quantity:.2f}\n"
    
    if in_cart > 0:
        text += f"✅ *In cart:* {in_cart}\n"
    
    # Add stock info
    stock = product.get('stock_quantity', 999)
    if stock < 10:
        text += f"⚠️ *Only {stock} left!*\n"
    
    keyboard = get_product_detail_keyboard(product_id, quantity, in_cart)
    
    try:
        await query.edit_message_text(text, reply_markup=keyboard, parse_mode='Markdown')
    except:
        pass  # Ignore if message is identical

async def show_cart(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show shopping cart with better formatting"""
    user_id = update.effective_user.id
    cart = cart_manager.get_cart(user_id)
    
    # Get VIP status
    vip_status = await get_user_vip_status(user_id)
    
    if not cart:
        text = MESSAGES["cart_empty"]
        keyboard = get_cart_keyboard(has_items=False)
    else:
        text = "🛒 *YOUR CART*\n"
        total = 0
        
        for product_id, item in cart.items():
            # Apply VIP discount to cart items
            price = item['price']
            if vip_status["is_vip"]:
                from .database import calculate_vip_price
                price = await calculate_vip_price(price, vip_status["discount"])
            
            subtotal = price * item['quantity']
            total += subtotal
            text += f"• {item['quantity']}x {item['name']} = ${subtotal:.2f}\n"
        
        text += f"\n💰 *TOTAL: ${total:.2f}*"
        
        if vip_status["is_vip"]:
            text += f"\n👑 *VIP {vip_status['discount']}% discount applied!*"
        
        keyboard = get_cart_keyboard(has_items=True)
    
    if update.callback_query:
        try:
            await update.callback_query.edit_message_text(text, reply_markup=keyboard, parse_mode='Markdown')
        except:
            await update.callback_query.message.reply_text(text, reply_markup=keyboard, parse_mode='Markdown')
    else:
        await update.message.reply_text(text, reply_markup=keyboard, parse_mode='Markdown')

async def cart_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /cart command"""
    user = update.effective_user
    
    # Save incoming command
    await save_chat_message(
        telegram_id=user.id,
        username=user.username,
        message="/cart",
        direction="incoming",
        first_name=user.first_name,
        last_name=user.last_name
    )
    
    await show_cart(update, context)

async def orders_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /orders command with better formatting"""
    user = update.effective_user
    user_id = user.id
    
    # Save incoming command
    await save_chat_message(
        telegram_id=user_id,
        username=user.username,
        message="/orders",
        direction="incoming",
        first_name=user.first_name,
        last_name=user.last_name
    )
    
    orders = await get_user_orders(user_id, limit=10)
    stats = await get_user_stats(user_id)
    
    if not orders:
        text = "📦 *No orders yet!*\nTime to change that! 💪"
    else:
        text = f"📦 *YOUR ORDERS*\n"
        text += f"Total: {stats['total_orders']} | Spent: ${stats['total_spent']:.2f}"
        
        if stats['is_vip']:
            text += f" | 👑 VIP {stats['vip_discount']}%"
        
        text += "\n\n*Recent orders:*\n"
        
        for order in orders[:5]:  # Show only 5 recent orders
            status_emoji = {
                "pending": "⏳", 
                "paid": "💰", 
                "processing": "📦",
                "completed": "✅", 
                "cancelled": "❌"
            }.get(order['status'], "❓")
            
            text += f"{status_emoji} `{order['order_number']}` ${order['total_usdt']:.2f} USDT\n"
    
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🍕 Order More", callback_data="shop")],
        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")]
    ])
    
    # Save outgoing message
    await save_chat_message(
        telegram_id=user_id,
        username=user.username,
        message=text,
        direction="outgoing"
    )
    
    await update.message.reply_text(text, parse_mode='Markdown', reply_markup=keyboard)

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command"""
    user = update.effective_user
    
    # Save incoming command
    await save_chat_message(
        telegram_id=user.id,
        username=user.username,
        message="/help",
        direction="incoming",
        first_name=user.first_name,
        last_name=user.last_name
    )
    
    keyboard = get_main_menu_keyboard()
    
    # Save outgoing message
    await save_chat_message(
        telegram_id=user.id,
        username=user.username,
        message=MESSAGES["help"],
        direction="outgoing"
    )
    
    if update.message:
        await update.message.reply_text(MESSAGES["help"], parse_mode='Markdown', reply_markup=keyboard)
    elif update.callback_query:
        await update.callback_query.edit_message_text(MESSAGES["help"], parse_mode='Markdown', reply_markup=keyboard)

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle text messages based on user state"""
    user_id = update.effective_user.id
    username = update.effective_user.username or f"user{user_id}"
    first_name = update.effective_user.first_name
    last_name = update.effective_user.last_name
    text = update.message.text.strip()
    state = user_states.get(user_id)
    
    # Save incoming message
    await save_chat_message(
        telegram_id=user_id,
        username=username,
        message=text,
        direction="incoming",
        first_name=first_name,
        last_name=last_name
    )
    
    if state == "waiting_city":
        await handle_city_input(update, context, text)
    elif state == "waiting_referral":
        await handle_referral_input(update, context, text)
    else:
        # JUST IGNORE random messages - don't respond!
        pass
        # Removed the annoying fallback message completely

async def handle_city_input(update: Update, context: ContextTypes.DEFAULT_TYPE, city: str):
    """Handle city input during checkout"""
    user_id = update.effective_user.id
    
    if len(city) < 2:
        await update.message.reply_text("❌ Enter a valid city name (min 2 characters):")
        return
    
    # Validate city doesn't contain suspicious characters
    if any(char in city for char in ['<', '>', '/', '\\', '@', '#']):
        await update.message.reply_text("❌ Enter a valid city name:")
        return
    
    context.user_data['delivery_city'] = city
    user_states[user_id] = "waiting_referral"
    
    # Ask for referral code
    country = context.user_data.get('delivery_country', 'Unknown')
    
    response_text = f"✅ Shipping to: {city}, {country}\n" + MESSAGES["ask_referral"]
    
    await update.message.reply_text(
        response_text,
        reply_markup=get_referral_keyboard(),
        parse_mode='Markdown'
    )
    
    # Save bot response
    await save_chat_message(
        telegram_id=user_id,
        username=update.effective_user.username,
        message=response_text,
        direction="outgoing"
    )

async def handle_referral_input(update: Update, context: ContextTypes.DEFAULT_TYPE, code: str):
    """Handle referral code input"""
    user_id = update.effective_user.id
    
    # Check if user has VIP discount
    vip_status = await get_user_vip_status(user_id)
    
    # Validate referral code
    referral = await validate_referral_code(code)
    
    if referral:
        # Calculate discount
        total = context.user_data.get('checkout_total', 0)
        
        # If VIP, show that VIP discount is better
        if vip_status["is_vip"] and vip_status["discount"] > 0:
            response_text = (
                f"👑 *You already have VIP {vip_status['discount']}% discount!*\n"
                f"This is better than the referral code.\n\n"
                + MESSAGES["payment_select"]
            )
            
            await update.message.reply_text(
                response_text,
                reply_markup=get_payment_keyboard(),
                parse_mode='Markdown'
            )
            
            context.user_data['referral_code'] = None
            context.user_data['discount_amount'] = 0
            context.user_data['final_total'] = total
            context.user_data['vip_discount_applied'] = True
        else:
            # Apply referral discount
            discount_amount, new_total = await calculate_discount(total, referral)
            
            # Store in context
            context.user_data['referral_code'] = code.upper()
            context.user_data['discount_amount'] = discount_amount
            context.user_data['final_total'] = new_total
            
            # Show success message
            discount_text = f"{referral['discount_value']}%"
            if referral['discount_type'] == 'fixed':
                discount_text = f"${referral['discount_value']:.2f}"
            
            text = MESSAGES["referral_applied"].format(
                code=code.upper(),
                discount_text=discount_text,
                original=total,
                discount_amount=discount_amount,
                new_total=new_total
            )
            
            from .keyboards import get_payment_keyboard
            keyboard = get_payment_keyboard()
            
            response_text = text + "\n" + MESSAGES["payment_select"]
            
            await update.message.reply_text(
                response_text,
                reply_markup=keyboard,
                parse_mode='Markdown'
            )
        
        # Save bot response
        await save_chat_message(
            telegram_id=user_id,
            username=update.effective_user.username,
            message=response_text,
            direction="outgoing"
        )
    else:
        # Invalid code
        response_text = MESSAGES["referral_invalid"]
        
        await update.message.reply_text(
            response_text,
            reply_markup=get_referral_keyboard(),
            parse_mode='Markdown'
        )
        
        # Save bot response
        await save_chat_message(
            telegram_id=user_id,
            username=update.effective_user.username,
            message=response_text,
            direction="outgoing"
        )
    
    user_states[user_id] = None
