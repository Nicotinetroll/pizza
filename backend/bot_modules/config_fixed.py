
"""

Enhanced configuration with categories and better UX messages

"""

import os

from dotenv import load_dotenv



load_dotenv()



# Bot Configuration

BOT_TOKEN = os.getenv("BOT_TOKEN")

BOT_USERNAME = os.getenv("BOT_USERNAME", "AnabolicPizzaBot") 

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/telegram_shop")



# Enhanced Messages with better UX

MESSAGES = {
    "welcome": """
🍕💪 *WELCOME TO ANABOLIC PIZZA, {name}!*

*The #1 Supplement Delivery Service for Enhanced Athletes* 🏆

You've just entered the realm where:
- Natty limits don't exist 🚀
- Gains are guaranteed 📈
- Your genetics suddenly become "elite" 🧬
- Shirts become optional (they won't fit anyway) 👕❌

*Why Choose AnabolicPizza?*
✅ Pharma-grade "supplements" only
✅ Shipping so discreet, even your gains look natural
✅ 100% success rate (unlike your natty progress)
✅ We deliver anywhere in EU (even to your mom's basement)
✅ Customer support that actually lifts

*Your Journey Starts Here:*
- Browse our "vitamin selection" 💊
- Pick your poison (literally) ☠️
- Pay with crypto (keep it anonymous) 🤫
- Wait 3-7 days for greatness 📦
- Become a mass monster 🦍

⚠️ *Warning: Side effects include:*
Looking absolutely diced, excessive confidence, sudden modeling contracts, and the inability to claim natural status.

Ready to kiss your natty card goodbye? Let's GO! 👇

_"Remember: You're not cheating, you're just leveling the playing field with genetics!"_ 😈
""",
    
    "help": """
🤝 *ANABOLIC PIZZA HELP CENTER*

*Quick Commands:*
🍕 /shop - Browse our "supplements" (also: /buy, /gear, /juice, /blast)
🛒 /cart - Check your anabolic arsenal
📦 /orders - Track your gains shipments
📬 /shipping - Delivery intel & stealth info
💬 /support - Contact our enhanced support team
🔄 /cycles - Cycle recommendations (not medical advice!)
💪 /gains - See what's possible when you're not natty
🤡 /natty - Check your natural status (spoiler: it's gone)

*How To Order Like a Pro:*
1️⃣ Browse products by category
2️⃣ Add your stack to cart
3️⃣ Enter delivery location (we don't judge)
4️⃣ Pay with crypto (Bitcoin, ETH, etc.)
5️⃣ Receive tracking (use Tor browser, bro)
6️⃣ Get swole AF

*Payment Methods:*
₿ Bitcoin - The OG anonymous coin
Ξ Ethereum - Smart contracts for smart gains  
◎ Solana - Fast like your gains
💵 USDT - Stable like your hormone levels won't be

*Security Tips:*
🔒 We never ask for personal info
🔒 Use a VPN (always)
🔒 Real name, real address (sounds wrong, but it works)
🔒 We delete all data after delivery
🔒 Your secret is safe (unlike your natty status)

*FAQ:*
Q: Is this legal?
A: We sell "supplements" and "vitamins" 😏

Q: Will I pass a drug test?
A: HAHAHAHAHAHA no.

Q: Can I stay natty?
A: You can also stay small. Your choice.

Q: Shipping time?
A: 3-7 days EU wide. Faster than natty gains (which is never).

_"The hardest part isn't the training or diet... it's pretending you're still natural!"_ 💯
""",
    
    "shop_categories": """
🏪 *WELCOME TO THE PHARMACY... I MEAN, SUPPLEMENT STORE!*

Select your weapon of mass construction below! 💣

Each category is carefully curated for maximum gains and minimum natty status.

Remember: We're not saying you SHOULD use these... but your competition definitely is! 😈

_"In a world full of natties, be an anabolic warrior!"_ ⚔️
"""
}



# EU Countries with emojis

EU_COUNTRIES = {

    "🇩🇪": "Germany",

    "🇫🇷": "France", 

    "🇳🇱": "Netherlands",

    "🇧🇪": "Belgium",

    "🇦🇹": "Austria",

    "🇵🇱": "Poland",

    "🇨🇿": "Czechia",

    "🇸🇰": "Slovakia",

    "🇭🇺": "Hungary",

    "🇷🇴": "Romania",

    "🇧🇬": "Bulgaria",

    "🇬🇷": "Greece",

    "🇮🇹": "Italy",

    "🇪🇸": "Spain",

    "🇵🇹": "Portugal",

    "🇸🇪": "Sweden",

    "🇫🇮": "Finland",

    "🇩🇰": "Denmark",

    "🇮🇪": "Ireland",

    "🇱🇺": "Luxembourg"

}



# Crypto currencies with better display

CRYPTO_CURRENCIES = {

    "BTC": {"name": "Bitcoin", "emoji": "₿", "rate": 65000},

    "ETH": {"name": "Ethereum", "emoji": "Ξ", "rate": 3500},

    "SOL": {"name": "Solana", "emoji": "◎", "rate": 150},

    "USDT": {"name": "Tether", "emoji": "💵", "rate": 1}

}
