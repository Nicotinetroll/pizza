"""
Enhanced bot command and message handlers with better UX and VIP support
"""
import asyncio
from telegram import Update, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from bson import ObjectId

from .config import MESSAGES
from .database import (
    create_or_update_user, get_active_categories, get_products_by_category,
    get_product_by_id, get_user_orders, get_user_stats,
    validate_referral_code, calculate_discount, get_user_vip_status
)
from .keyboards import (
    get_main_menu_keyboard, get_categories_keyboard, get_products_keyboard,
    get_product_detail_keyboard, get_cart_keyboard, get_checkout_confirm_keyboard,
    get_referral_keyboard, get_back_keyboard, get_order_complete_keyboard
)
from .cart_manager import cart_manager

# User states storage for conversation flow
user_states = {}
user_context = {}  # Store category context

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command with warm welcome"""
    user = update.effective_user
    
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
    
    if update.message:
        await update.message.reply_text(welcome_text, reply_markup=keyboard, parse_mode='Markdown')
    elif update.callback_query:
        await update.callback_query.edit_message_text(welcome_text, reply_markup=keyboard, parse_mode='Markdown')

async def shop_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /shop command - show categories"""
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
    await show_cart(update, context)

async def orders_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /orders command with better formatting"""
    user_id = update.effective_user.id
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
    
    await update.message.reply_text(text, parse_mode='Markdown', reply_markup=keyboard)

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command"""
    keyboard = get_main_menu_keyboard()
    
    if update.message:
        await update.message.reply_text(MESSAGES["help"], parse_mode='Markdown', reply_markup=keyboard)
    elif update.callback_query:
        await update.callback_query.edit_message_text(MESSAGES["help"], parse_mode='Markdown', reply_markup=keyboard)

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle text messages based on user state"""
    user_id = update.effective_user.id
    text = update.message.text.strip()
    state = user_states.get(user_id)
    
    if state == "waiting_city":
        await handle_city_input(update, context, text)
    elif state == "waiting_referral":
        await handle_referral_input(update, context, text)
    else:
        # Default response for unexpected messages
        await update.message.reply_text(
            "Use the menu buttons or commands:\n/shop /cart /orders /help",
            reply_markup=get_main_menu_keyboard()
        )

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
    
    await update.message.reply_text(
        f"✅ Shipping to: {city}, {country}\n" + 
        MESSAGES["ask_referral"],
        reply_markup=get_referral_keyboard(),
        parse_mode='Markdown'
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
            await update.message.reply_text(
                f"👑 *You already have VIP {vip_status['discount']}% discount!*\n"
                f"This is better than the referral code.\n\n"
                + MESSAGES["payment_select"],
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
            
            await update.message.reply_text(
                text + "\n" + MESSAGES["payment_select"],
                reply_markup=keyboard,
                parse_mode='Markdown'
            )
    else:
        # Invalid code
        await update.message.reply_text(
            MESSAGES["referral_invalid"],
            reply_markup=get_referral_keyboard(),
            parse_mode='Markdown'
        )
    
    user_states[user_id] = None