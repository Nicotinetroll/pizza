"""
Enhanced bot command and message handlers with /clear command
"""
import asyncio
from telegram import Update, InlineKeyboardMarkup, InlineKeyboardButton
from telegram.ext import ContextTypes
from bson import ObjectId
from datetime import datetime
import logging
import aiohttp
import random
from .message_loader import message_loader

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

logger = logging.getLogger(__name__)

user_states = {}
user_context = {}

async def clear_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    chat_id = update.effective_chat.id
    
    try:
        message_id = update.message.message_id
        
        deleted_count = 0
        failed_count = 0
        
        for msg_id in range(message_id, 0, -1):
            try:
                await context.bot.delete_message(chat_id=chat_id, message_id=msg_id)
                deleted_count += 1
                
                if deleted_count >= 100:
                    break
                    
                if deleted_count % 10 == 0:
                    await asyncio.sleep(0.5)
                    
            except:
                failed_count += 1
                if failed_count > 50:
                    break
        
        welcome_text = f"""
🧹 *Chat Cleared!*

Deleted {deleted_count} messages.

Welcome back, {user.first_name or 'friend'}! 
Ready to start fresh? Your gains journey continues! 💪

*Quick Actions:*
"""
        
        keyboard = get_main_menu_keyboard()
        
        await context.bot.send_message(
            chat_id=chat_id,
            text=welcome_text,
            reply_markup=keyboard,
            parse_mode='Markdown'
        )
        
        await save_chat_message(
            telegram_id=user.id,
            username=user.username,
            message="/clear",
            direction="incoming",
            first_name=user.first_name,
            last_name=user.last_name
        )
        
        await save_chat_message(
            telegram_id=user.id,
            username=user.username,
            message=welcome_text,
            direction="outgoing"
        )
        
    except Exception as e:
        logger.error(f"Error in clear command: {e}")
        await update.message.reply_text(
            "Unable to clear all messages. Some messages may be too old to delete.",
            reply_markup=get_main_menu_keyboard()
        )

async def support_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
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
    from telegram import InlineKeyboardButton, InlineKeyboardMarkup
    from .config import BOT_USERNAME
    from .message_loader import message_loader
    
    if update.message:
        try:
            command = update.message.text.split()[0].lower() if update.message.text else ""
            
            commands = await message_loader.load_commands()
            cmd_data = commands.get(command)
            
            if cmd_data and not cmd_data.get('group_redirect', True):
                response = cmd_data.get('response', 'Command response')
                await update.message.reply_text(response, parse_mode='Markdown')
                return
            
            bot_username = BOT_USERNAME.replace('@', '')
            
            messages = await message_loader.load_messages()
            
            group_messages = []
            for i in range(1, 10):
                msg_key = f"group_redirect_{i}"
                if msg_key in messages:
                    group_messages.append(messages[msg_key])
            
            if not group_messages:
                group_messages = [
                    "⚠️ Please use this command in private chat with the bot."
                ]
            
            button1_text = messages.get('group_button_1', '💊 Enter The Anabolic Kingdom')
            button2_text = messages.get('group_button_2', '🍕 Get Your Pizza Delivery')
            
            keyboard = InlineKeyboardMarkup([
                [InlineKeyboardButton(button1_text, url=f"https://t.me/{bot_username}")],
                [InlineKeyboardButton(button2_text, url=f"https://t.me/{bot_username}")]
            ])
            
            await update.message.reply_text(
                random.choice(group_messages),
                reply_markup=keyboard
            )
            
        except Exception as e:
            logger.error(f"Error in group handler: {e}")
    
    return

async def notify_frontend_new_message(telegram_id: int):
    try:
        async with aiohttp.ClientSession() as session:
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
        
        if direction == "incoming":
            await notify_frontend_new_message(telegram_id)
        
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
    user = update.effective_user
    
    if await message_loader.is_maintenance_mode():
        maintenance_msg = await message_loader.get_maintenance_message()
        await update.message.reply_text(maintenance_msg, parse_mode='Markdown')
        return
    
    settings = await message_loader.load_settings()
    
    if settings.get("welcome_delay", 0) > 0:
        await asyncio.sleep(settings["welcome_delay"])
    
    if settings.get("typing_delay", 0) > 0:
        await context.bot.send_chat_action(
            chat_id=update.effective_chat.id, 
            action="typing"
        )
        await asyncio.sleep(settings["typing_delay"])
    
    if update.message:
        await save_chat_message(
            telegram_id=user.id,
            username=user.username,
            message="/start",
            direction="incoming",
            first_name=user.first_name,
            last_name=user.last_name
        )
    
    await create_or_update_user({
        "telegram_id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name
    })
    
    stats = await get_user_stats(user.id)
    vip_status = await get_user_vip_status(user.id)
    
    welcome_text = await message_loader.get_message(
        "welcome",
        name=user.first_name or "Bro"
    )
    
    if stats["total_orders"] > 0:
        welcome_text += f"\n🎉 *Welcome back!* Orders: {stats['total_orders']}"
    
    if vip_status["is_vip"]:
        welcome_text += f"\n👑 *VIP Member* - {vip_status['discount']}% OFF on everything!"
    
    keyboard = get_main_menu_keyboard()
    
    if update.message:
        await save_chat_message(
            telegram_id=user.id,
            username=user.username,
            message=welcome_text,
            direction="outgoing"
        )
        await update.message.reply_text(welcome_text, reply_markup=keyboard, parse_mode='Markdown')
    elif update.callback_query:
        await update.callback_query.edit_message_text(welcome_text, reply_markup=keyboard, parse_mode='Markdown')

async def shop_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    
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
    categories = await get_active_categories()
    
    if not categories:
        text = MESSAGES["no_categories"]
        keyboard = get_back_keyboard()
    else:
        text = MESSAGES["shop_categories"]
        keyboard = get_categories_keyboard(categories)
    
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
    query = update.callback_query
    user_id = update.effective_user.id
    
    user_context[user_id] = {"category_id": category_id}
    
    vip_status = await get_user_vip_status(user_id)
    
    products = await get_products_by_category(category_id, vip_discount=vip_status["discount"])
    
    if not products:
        text = MESSAGES["category_empty"]
        keyboard = get_back_keyboard("shop")
    else:
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
    query = update.callback_query
    user_id = update.effective_user.id
    
    vip_status = await get_user_vip_status(user_id)
    
    product = await get_product_by_id(product_id, vip_discount=vip_status["discount"])
    if not product:
        await query.edit_message_text("Product not found! 🤷", reply_markup=get_back_keyboard("shop"))
        return
    
    quantity = cart_manager.get_quantity(user_id, product_id)
    
    cart = cart_manager.get_cart(user_id)
    in_cart = cart.get(product_id, {}).get('quantity', 0)
    
    text = f"🏷️ *{product['name']}*\n"
    text += f"_{product['description']}_\n\n"
    
    if product.get("has_vip_discount"):
        text += f"💰 *Price:* ~${product['original_price']:.2f}~ ${product['price_usdt']:.2f}\n"
        text += f"👑 *VIP {vip_status['discount']}% OFF!*\n"
    else:
        text += f"💰 *Price:* ${product['price_usdt']:.2f}\n"
    
    if quantity > 1:
        text += f"📦 *Qty:* {quantity} = ${product['price_usdt'] * quantity:.2f}\n"
    
    if in_cart > 0:
        text += f"✅ *In cart:* {in_cart}\n"
    
    stock = product.get('stock_quantity', 999)
    if stock < 10:
        text += f"⚠️ *Only {stock} left!*\n"
    
    keyboard = get_product_detail_keyboard(product_id, quantity, in_cart)
    
    try:
        await query.edit_message_text(text, reply_markup=keyboard, parse_mode='Markdown')
    except:
        pass

async def show_cart(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    cart = cart_manager.get_cart(user_id)
    
    vip_status = await get_user_vip_status(user_id)
    
    if not cart:
        text = MESSAGES["cart_empty"]
        keyboard = get_cart_keyboard(has_items=False)
    else:
        text = "🛒 *YOUR CART*\n"
        total = 0
        
        for product_id, item in cart.items():
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
    user = update.effective_user
    
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
    user = update.effective_user
    user_id = user.id
    
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
        
        for order in orders[:5]:
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
    
    await save_chat_message(
        telegram_id=user_id,
        username=user.username,
        message=text,
        direction="outgoing"
    )
    
    await update.message.reply_text(text, parse_mode='Markdown', reply_markup=keyboard)

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    
    if await message_loader.is_maintenance_mode():
        maintenance_msg = await message_loader.get_maintenance_message()
        await update.message.reply_text(maintenance_msg, parse_mode='Markdown')
        return
    
    await save_chat_message(
        telegram_id=user.id,
        username=user.username,
        message="/help",
        direction="incoming",
        first_name=user.first_name,
        last_name=user.last_name
    )
    
    help_text = await message_loader.get_message("help")
    
    keyboard = get_main_menu_keyboard()
    
    await save_chat_message(
        telegram_id=user.id,
        username=user.username,
        message=help_text,
        direction="outgoing"
    )
    
    if update.message:
        await update.message.reply_text(help_text, parse_mode='Markdown', reply_markup=keyboard)
    elif update.callback_query:
        await update.callback_query.edit_message_text(help_text, parse_mode='Markdown', reply_markup=keyboard)

async def handle_dynamic_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message or not update.message.text:
        return
    
    user = update.effective_user
    command = update.message.text.split()[0].lower()
    
    if command == '/start':
        await start_command(update, context)
        return
    elif command == '/shop':
        await shop_command(update, context)
        return
    elif command == '/cart':
        await cart_command(update, context)
        return
    elif command == '/orders':
        await orders_command(update, context)
        return
    elif command == '/help':
        await help_command(update, context)
        return
    elif command == '/clear':
        await clear_command(update, context)
        return
    
    response = await message_loader.get_command_response(command)
    
    if response:
        if user:
            response = response.replace('{name}', user.first_name or 'Friend')
            response = response.replace('{username}', f"@{user.username}" if user.username else 'User')
            response = response.replace('{telegram_id}', str(user.id))
        
        keyboard = None
        if any(keyword in command for keyword in ['start', 'menu', 'home', 'help']):
            keyboard = get_main_menu_keyboard()
        elif 'shop' in command or 'product' in command:
            keyboard = InlineKeyboardMarkup([
                [InlineKeyboardButton("🍕 Browse Shop", callback_data="shop")],
                [InlineKeyboardButton("🏠 Main Menu", callback_data="home")]
            ])
        
        if keyboard:
            await update.message.reply_text(response, reply_markup=keyboard, parse_mode='Markdown')
        else:
            await update.message.reply_text(response, parse_mode='Markdown')
        
        if update.effective_chat.type == 'private':
            await save_chat_message(
                telegram_id=user.id,
                username=user.username,
                message=command,
                direction="incoming",
                first_name=user.first_name,
                last_name=user.last_name
            )
            await save_chat_message(
                telegram_id=user.id,
                username=user.username,
                message=response,
                direction="outgoing"
            )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    username = update.effective_user.username or f"user{user_id}"
    first_name = update.effective_user.first_name
    last_name = update.effective_user.last_name
    text = update.message.text.strip()
    state = user_states.get(user_id)
    
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
        pass

async def handle_city_input(update: Update, context: ContextTypes.DEFAULT_TYPE, city: str):
    user_id = update.effective_user.id
    message_id = context.user_data.get('checkout_message_id')
    
    if len(city) < 2:
        await update.message.delete()
        if message_id:
            await context.bot.edit_message_text(
                chat_id=user_id,
                message_id=message_id,
                text="❌ Enter a valid city name (min 2 characters):",
                parse_mode='Markdown'
            )
        return
    
    if any(char in city for char in ['<', '>', '/', '\\', '@', '#']):
        await update.message.delete()
        if message_id:
            await context.bot.edit_message_text(
                chat_id=user_id,
                message_id=message_id,
                text="❌ Enter a valid city name:",
                parse_mode='Markdown'
            )
        return
    
    context.user_data['delivery_city'] = city
    user_states[user_id] = "waiting_referral"
    
    country = context.user_data.get('delivery_country', 'Unknown')
    
    response_text = f"✅ Shipping to: {city}, {country}\n" + MESSAGES["ask_referral"]
    
    await update.message.delete()
    
    if message_id:
        await context.bot.edit_message_text(
            chat_id=user_id,
            message_id=message_id,
            text=response_text,
            reply_markup=get_referral_keyboard(),
            parse_mode='Markdown'
        )
    else:
        await update.message.reply_text(
            response_text,
            reply_markup=get_referral_keyboard(),
            parse_mode='Markdown'
        )
    
    await save_chat_message(
        telegram_id=user_id,
        username=update.effective_user.username,
        message=response_text,
        direction="outgoing"
    )

async def handle_referral_input(update: Update, context: ContextTypes.DEFAULT_TYPE, code: str):
    user_id = update.effective_user.id
    message_id = context.user_data.get('checkout_message_id')
    
    vip_status = await get_user_vip_status(user_id)
    
    referral = await validate_referral_code(code)
    
    await update.message.delete()
    
    if referral:
        total = context.user_data.get('checkout_total', 0)
        
        if vip_status["is_vip"] and vip_status["discount"] > 0:
            response_text = (
                f"👑 *You already have VIP {vip_status['discount']}% discount!*\n"
                f"This is better than the referral code.\n\n"
                + MESSAGES["payment_select"]
            )
            
            if message_id:
                await context.bot.edit_message_text(
                    chat_id=user_id,
                    message_id=message_id,
                    text=response_text,
                    reply_markup=get_payment_keyboard(),
                    parse_mode='Markdown'
                )
            else:
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
            discount_amount, new_total = await calculate_discount(total, referral)
            
            context.user_data['referral_code'] = code.upper()
            context.user_data['discount_amount'] = discount_amount
            context.user_data['final_total'] = new_total
            
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
            
            if message_id:
                await context.bot.edit_message_text(
                    chat_id=user_id,
                    message_id=message_id,
                    text=response_text,
                    reply_markup=keyboard,
                    parse_mode='Markdown'
                )
            else:
                await update.message.reply_text(
                    response_text,
                    reply_markup=keyboard,
                    parse_mode='Markdown'
                )
        
        await save_chat_message(
            telegram_id=user_id,
            username=update.effective_user.username,
            message=response_text,
            direction="outgoing"
        )
    else:
        response_text = MESSAGES["referral_invalid"]
        
        if message_id:
            await context.bot.edit_message_text(
                chat_id=user_id,
                message_id=message_id,
                text=response_text,
                reply_markup=get_referral_keyboard(),
                parse_mode='Markdown'
            )
        else:
            await update.message.reply_text(
                response_text,
                reply_markup=get_referral_keyboard(),
                parse_mode='Markdown'
            )
        
        await save_chat_message(
            telegram_id=user_id,
            username=update.effective_user.username,
            message=response_text,
            direction="outgoing"
        )
    
    user_states[user_id] = None

async def request_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    
    if update.message.text == '/request':
        await update.message.reply_text(
            "❌ *PRODUCT REQUEST*\n\n"
            "You forgot to tell us what you want, genius.\n\n"
            "Usage: `/request product name`\n"
            "Example: `/request BCAA monohydrate`\n\n"
            "Pro tip: Be specific or we'll send you sugar pills.",
            parse_mode='Markdown'
        )
        return
    
    product_text = update.message.text.replace('/request', '').strip()
    
    if not product_text:
        await update.message.reply_text(
            "❌ Empty request? That's like ordering air. Try again with actual products.",
            parse_mode='Markdown'
        )
        return
    
    from bot_modules.custom_orders import create_custom_order
    
    result = await create_custom_order(
        telegram_id=user.id,
        username=user.username,
        product_text=product_text,
        first_name=user.first_name,
        last_name=user.last_name
    )
    
    if result.get("error") == "limit_reached":
        await update.message.reply_text(
            "❌ Chill bro, this ain't a buffet. Max 3 requests, not an all-you-can-spam special.",
            parse_mode='Markdown'
        )
        return
    
    messages = [
        f"✅ Request #{result['custom_id']} locked in. Admin will slide into your DMs faster than caffeine hits your bloodstream. Sit tight, champ.",
        f"✅ Request #{result['custom_id']} received. Now don't spam like a crackhead on clen – one request is enough. Admin will hit you up soon."
    ]
    
    await update.message.reply_text(
        random.choice(messages),
        parse_mode='Markdown'
    )
    
    if update.effective_chat.type == 'private':
        await save_chat_message(
            telegram_id=user.id,
            username=user.username,
            message=f"/request {product_text}",
            direction="incoming",
            first_name=user.first_name,
            last_name=user.last_name
        )

async def closerequest_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    args = update.message.text.split()[1:] if len(update.message.text.split()) > 1 else []
    
    from bot_modules.custom_orders import cancel_custom_order, cancel_all_pending_orders, get_user_custom_orders
    
    if not args:
        cancelled = await cancel_all_pending_orders(user.id)
        if cancelled > 0:
            await update.message.reply_text(
                f"✅ Cancelled {cancelled} request(s). Congrats, you wasted everyone's time. Smash `/request` when you finally know what you want.",
                parse_mode='Markdown'
            )
        else:
            await update.message.reply_text(
                "❌ No pending requests to cancel. You're either organized or lazy.",
                parse_mode='Markdown'
            )
        return
    
    cancelled_ids = []
    for arg in args:
        try:
            custom_id = int(arg)
            if await cancel_custom_order(user.id, custom_id):
                cancelled_ids.append(custom_id)
        except:
            pass
    
    if cancelled_ids:
        await update.message.reply_text(
            f"✅ Cancelled request(s): {', '.join(map(str, cancelled_ids))}. Congrats, you wasted everyone's time. Smash `/request` when you finally know what you want.",
            parse_mode='Markdown'
        )
    else:
        await update.message.reply_text(
            "❌ Couldn't cancel those requests. Either they don't exist or they're not yours.",
            parse_mode='Markdown'
        )

async def requests_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    
    from bot_modules.custom_orders import get_user_custom_orders
    
    orders = await get_user_custom_orders(user.id)
    
    if not orders:
        text = "📋 *YOUR PRODUCT REQUESTS*\n\n"
        text += "No requests yet. Your wishlist is emptier than a natty's trophy cabinet.\n\n"
        text += "Use `/request product_name` to request products!"
    else:
        text = "📋 *YOUR PRODUCT REQUESTS*\n" + "="*25 + "\n\n"
        
        status_emojis = {
            "pending": "⏳",
            "processing": "🔄",
            "completed": "✅"
        }
        
        for order in orders:
            emoji = status_emojis.get(order['status'], "❓")
            text += f"{emoji} *#{order['custom_id']}* - {order['status'].upper()}\n"
            text += f"📦 {order['product_text'][:50]}{'...' if len(order['product_text']) > 50 else ''}\n"
            text += f"📅 {order['created_at'].strftime('%d %b %Y %H:%M')}\n\n"
    
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🍕 Shop Now", callback_data="shop")],
        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")]
    ])
    
    await update.message.reply_text(text, reply_markup=keyboard, parse_mode='Markdown')
    
    if update.effective_chat.type == 'private':
        await save_chat_message(
            telegram_id=user.id,
            username=user.username,
            message="/requests",
            direction="incoming",
            first_name=user.first_name,
            last_name=user.last_name
        )
        await save_chat_message(
            telegram_id=user.id,
            username=user.username,
            message=text,
            direction="outgoing"
        )