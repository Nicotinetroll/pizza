"""
Bot configuration and constants
"""
import os
from dotenv import load_dotenv

# Load environment
load_dotenv('/opt/telegram-shop-bot/.env')

# Bot Configuration
BOT_TOKEN = os.getenv("BOT_TOKEN")
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/telegram_shop")
NOTIFICATION_CHANNEL = os.getenv("NOTIFICATION_CHANNEL_ID")

# EU Countries
EU_COUNTRIES = {
    "🇧🇪": "Belgium",
    "🇧🇬": "Bulgaria", 
    "🇨🇿": "Czech Republic",
    "🇩🇰": "Denmark",
    "🇪🇪": "Estonia",
    "🇫🇮": "Finland",
    "🇫🇷": "France",
    "🇭🇷": "Croatia",
    "🇮🇪": "Ireland",
    "🇮🇹": "Italy",
    "🇨🇾": "Cyprus",
    "🇱🇹": "Lithuania",
    "🇱🇻": "Latvia",
    "🇱🇺": "Luxembourg",
    "🇭🇺": "Hungary",
    "🇩🇪": "Germany",
    "🇳🇱": "Netherlands",
    "🇵🇱": "Poland",
    "🇵🇹": "Portugal",
    "🇦🇹": "Austria",
    "🇷🇴": "Romania",
    "🇬🇷": "Greece",
    "🇸🇮": "Slovenia",
    "🇸🇰": "Slovakia",
    "🇪🇸": "Spain",
    "🇸🇪": "Sweden"
}

# Payment settings
CRYPTO_CURRENCIES = ["BTC", "ETH", "SOL", "USDT"]
PAYMENT_TIMEOUT = 30  # minutes
MAX_QUANTITY_PER_ORDER = 50

# Messages
MESSAGES = {
    "welcome": """Yo {name}! 🍕💉
    "shop_categories": """
🏪 *Welcome to the Shop!*

What are you looking for today? We've organized everything into categories to make your shopping easier.

Pick a category below to see what we've got! 👇
""",

Welcome to AnabolicPizza - the only pizza that comes with gains! 🚀

Why us? Simple:
🔐 100% anonymous (no names, no traces)
💰 Crypto only (banks can't track shit)
📦 Stealth EU shipping
💉 Real gear, real results

Ready to get juiced? Let's fucking go! 👇""",
    
    "cart_empty": "Cart's empty bro! 🛒\n\nTime to stock up on gear 💉",
    
    "payment_confirmed": """✅ *PAYMENT CONFIRMED!*

Order: `{order_number}`

Your package arrives in 3-5 days.
Stealth packaging guaranteed.
No signature needed.

Time to blast off! 💉🚀""",
    
    "help": """Need help? Here's how it works 💉

*The Process:*
1. Pick your gear (/shop)
2. Add to cart
3. Checkout
4. Pay with crypto
5. Get juiced

*We accept:*
Bitcoin, Ethereum, Solana, USDT

*Shipping:*
EU only • 3-5 days
Stealth packaging (looks like supplements)

*Security:*
🔐 No names needed
🔐 No real addresses stored
🔐 Auto-delete order history
🔐 Tor friendly

Remember: We're just a pizza shop 😉🍕"""
}
