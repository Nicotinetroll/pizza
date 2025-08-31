"""
Enhanced Telegram inline keyboards with better UX
"""
from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from typing import List, Dict, Optional
from .config import EU_COUNTRIES, CRYPTO_CURRENCIES

def get_main_menu_keyboard():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("🍕 Browse Shop", callback_data="shop")],
        [
            InlineKeyboardButton("🛒 My Cart", callback_data="cart"),
            InlineKeyboardButton("📦 My Orders", callback_data="orders")
        ],
        [InlineKeyboardButton("🎫 Support", callback_data="support_menu")],
        [InlineKeyboardButton("❓ Help & Info", callback_data="help")]
    ])

def get_categories_keyboard(categories: List[Dict]) -> InlineKeyboardMarkup:
    """Get categories selection keyboard"""
    keyboard = []
    
    for category in categories:
        emoji = category.get('emoji', '📦')
        name = category['name']
        button_text = f"{emoji} {name}"
        callback_data = f"cat_{str(category['_id'])}"
        keyboard.append([InlineKeyboardButton(button_text, callback_data=callback_data)])
    
    keyboard.append([
        InlineKeyboardButton("🛒 View Cart", callback_data="cart"),
        InlineKeyboardButton("🏠 Main Menu", callback_data="home")
    ])
    
    return InlineKeyboardMarkup(keyboard)

def get_products_keyboard(products: List[Dict], category_id: str = None) -> InlineKeyboardMarkup:
    """Get products list keyboard with prices"""
    keyboard = []
    
    for product in products:
        name = product['name'][:20] + "..." if len(product['name']) > 20 else product['name']
        stock_info = "✅" if product.get('stock_quantity', 999) > 10 else "⚠️ Low"
        button_text = f"{name} • ${product['price_usdt']:.2f} {stock_info}"
        callback_data = f"view_{str(product['_id'])}"
        keyboard.append([InlineKeyboardButton(button_text, callback_data=callback_data)])
    
    nav_buttons = []
    if category_id:
        nav_buttons.append(InlineKeyboardButton("🔙 Categories", callback_data="shop"))
    nav_buttons.append(InlineKeyboardButton("🛒 Cart", callback_data="cart"))
    nav_buttons.append(InlineKeyboardButton("🏠 Menu", callback_data="home"))
    
    keyboard.append(nav_buttons)
    
    return InlineKeyboardMarkup(keyboard)

def get_product_detail_keyboard(product_id: str, quantity: int, in_cart: int = 0) -> InlineKeyboardMarkup:
    """Simplified product detail keyboard"""
    keyboard = []
    
    # Quantity selector row - simplified!
    keyboard.append([
        InlineKeyboardButton("➖", callback_data=f"qty_minus_{product_id}"),
        InlineKeyboardButton(f"📦 Qty: {quantity}", callback_data="noop"),
        InlineKeyboardButton("➕", callback_data=f"qty_plus_{product_id}")
    ])
    
    # Add to cart button with quantity info
    cart_text = f"🛒 Add to Cart ({quantity} items)"
    if in_cart > 0:
        cart_text = f"🛒 Add {quantity} more (Have {in_cart})"
    
    keyboard.append([InlineKeyboardButton(cart_text, callback_data=f"add_{product_id}")])
    
    # Navigation
    keyboard.append([
        InlineKeyboardButton("🔙 Back", callback_data="back_to_category"),
        InlineKeyboardButton("🛒 View Cart", callback_data="cart")
    ])
    
    return InlineKeyboardMarkup(keyboard)

def get_cart_keyboard(has_items: bool = True) -> InlineKeyboardMarkup:
    """Get cart keyboard with conditional options"""
    if not has_items:
        return InlineKeyboardMarkup([
            [InlineKeyboardButton("🍕 Start Shopping", callback_data="shop")],
            [InlineKeyboardButton("🏠 Main Menu", callback_data="home")]
        ])
    
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("✅ Proceed to Checkout", callback_data="checkout_start")],
        [
            InlineKeyboardButton("🍕 Continue Shopping", callback_data="shop"),
            InlineKeyboardButton("🗑️ Clear Cart", callback_data="clear_cart")
        ],
        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")]
    ])

def get_checkout_confirm_keyboard() -> InlineKeyboardMarkup:
    """Confirm checkout keyboard"""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("✅ Looks Good - Continue", callback_data="select_country")],
        [InlineKeyboardButton("📝 Edit Cart", callback_data="cart")],
        [InlineKeyboardButton("❌ Cancel", callback_data="home")]
    ])

def get_countries_keyboard() -> InlineKeyboardMarkup:
    """Get countries selection keyboard - organized by region"""
    keyboard = []
    countries = list(EU_COUNTRIES.items())
    
    # Group countries in rows of 2 for better mobile display
    for i in range(0, len(countries), 2):
        row = []
        for j in range(2):
            if i + j < len(countries):
                flag, country = countries[i + j]
                button_text = f"{flag} {country}"
                row.append(InlineKeyboardButton(button_text, callback_data=f"country_{country}"))
        keyboard.append(row)
    
    keyboard.append([InlineKeyboardButton("❌ Cancel Order", callback_data="cart")])
    return InlineKeyboardMarkup(keyboard)

def get_referral_keyboard() -> InlineKeyboardMarkup:
    """Get referral code entry keyboard"""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("➡️ Skip - No Code", callback_data="skip_referral")],
        [InlineKeyboardButton("❌ Cancel Order", callback_data="cart")]
    ])

def get_payment_keyboard() -> InlineKeyboardMarkup:
    """Get payment method keyboard with better display"""
    keyboard = []
    
    for code, info in CRYPTO_CURRENCIES.items():
        button_text = f"{info['emoji']} {info['name']} ({code})"
        keyboard.append([InlineKeyboardButton(button_text, callback_data=f"pay_{code.lower()}")])
    
    keyboard.append([InlineKeyboardButton("❌ Cancel Order", callback_data="cart")])
    
    return InlineKeyboardMarkup(keyboard)

def get_payment_waiting_keyboard(order_id: str) -> InlineKeyboardMarkup:
    """Payment waiting keyboard"""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("✅ I've Sent Payment", callback_data=f"check_payment_{order_id}")],
        [InlineKeyboardButton("❌ Cancel Order", callback_data="cancel_order")],
        [InlineKeyboardButton("❓ Need Help?", callback_data="payment_help")]
    ])

def get_payment_simulation_keyboard(order_id: str) -> InlineKeyboardMarkup:
    """Payment simulation for demo mode"""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("🎮 Simulate Payment (Demo)", callback_data=f"fake_pay_{order_id}")],
        [InlineKeyboardButton("❌ Cancel", callback_data="home")]
    ])

def get_order_complete_keyboard() -> InlineKeyboardMarkup:
    """Order completion keyboard"""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("🍕 Order More", callback_data="shop")],
        [InlineKeyboardButton("📦 View My Orders", callback_data="orders")],
        [InlineKeyboardButton("🏠 Main Menu", callback_data="home")]
    ])

def get_back_keyboard(destination: str = "home") -> InlineKeyboardMarkup:
    """Simple back button"""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("🔙 Back", callback_data=destination)]
    ])