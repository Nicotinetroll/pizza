"""
Telegram inline keyboards
"""
from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from typing import List, Dict
from .config import EU_COUNTRIES, CRYPTO_CURRENCIES

def get_main_menu_keyboard() -> InlineKeyboardMarkup:
    """Get main menu keyboard"""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("🍕 See What We Got", callback_data="shop")],
        [InlineKeyboardButton("🛒 My Cart", callback_data="cart")],
        [InlineKeyboardButton("📦 My Orders", callback_data="orders")]
    ])

def get_products_keyboard(products: List[Dict]) -> InlineKeyboardMarkup:
    """Get products list keyboard"""
    keyboard = []
    
    for product in products:
        name = product['name'][:25] + "..." if len(product['name']) > 25 else product['name']
        button_text = f"{name} • ${product['price_usdt']:.2f}"
        callback_data = f"view_{str(product['_id'])}"
        keyboard.append([InlineKeyboardButton(button_text, callback_data=callback_data)])
    
    keyboard.append([
        InlineKeyboardButton("🛒 My Cart", callback_data="cart"),
        InlineKeyboardButton("🏠 Back", callback_data="home")
    ])
    
    return InlineKeyboardMarkup(keyboard)

def get_product_detail_keyboard(product_id: str, quantity: int, total_price: float) -> InlineKeyboardMarkup:
    """Get product detail keyboard with quantity selector"""
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("-5", callback_data=f"qty_minus5_{product_id}"),
            InlineKeyboardButton("➖", callback_data=f"qty_minus_{product_id}"),
            InlineKeyboardButton(f"📦 {quantity}", callback_data="noop"),
            InlineKeyboardButton("➕", callback_data=f"qty_plus_{product_id}"),
            InlineKeyboardButton("+5", callback_data=f"qty_plus5_{product_id}")
        ],
        [
            InlineKeyboardButton("+10", callback_data=f"qty_plus10_{product_id}"),
            InlineKeyboardButton(f"💰 Total: ${total_price:.2f}", callback_data="noop")
        ],
        [InlineKeyboardButton(f"🛒 Add to Cart", callback_data=f"add_{product_id}")],
        [
            InlineKeyboardButton("🔙 Menu", callback_data="shop"),
            InlineKeyboardButton("🛒 View Cart", callback_data="cart")
        ]
    ])

def get_cart_keyboard() -> InlineKeyboardMarkup:
    """Get cart keyboard"""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("✅ Let's Fucking Go", callback_data="checkout_start")],
        [
            InlineKeyboardButton("🍕 Add More", callback_data="shop"),
            InlineKeyboardButton("🗑️ Clear All", callback_data="clear_cart")
        ],
        [InlineKeyboardButton("🏠 Back", callback_data="home")]
    ])

def get_countries_keyboard() -> InlineKeyboardMarkup:
    """Get countries selection keyboard"""
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
    return InlineKeyboardMarkup(keyboard)

def get_payment_keyboard() -> InlineKeyboardMarkup:
    """Get payment method keyboard"""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("₿ Bitcoin", callback_data="pay_btc")],
        [InlineKeyboardButton("Ξ Ethereum", callback_data="pay_eth")],
        [InlineKeyboardButton("◎ Solana", callback_data="pay_sol")],
        [InlineKeyboardButton("💵 USDT", callback_data="pay_usdt")]
    ])

def get_payment_simulation_keyboard(order_id: str) -> InlineKeyboardMarkup:
    """Get payment simulation keyboard (demo mode)"""
    return InlineKeyboardMarkup([[
        InlineKeyboardButton("🎮 Simulate Payment", callback_data=f"fake_pay_{order_id}"),
        InlineKeyboardButton("❌ Cancel", callback_data="home")
    ]])
