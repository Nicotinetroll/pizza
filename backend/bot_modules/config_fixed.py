
"""

Enhanced configuration with categories and better UX messages

"""

import os

from dotenv import load_dotenv



load_dotenv()



# Bot Configuration

BOT_TOKEN = os.getenv("BOT_TOKEN")

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/telegram_shop")



# Enhanced Messages with better UX

MESSAGES = {

    "welcome": """

🍕💪 *Welcome to AnabolicPizza, {name}!*



Hey bro! Ready to get those gains delivered straight to your door? 🚀



We're the most trusted source for premium supplements in the EU. 

100% anonymous, 100% secure, 100% gains guaranteed!



What makes us special:

✅ Top quality products only

✅ Discreet EU-wide shipping 

✅ Anonymous crypto payments

✅ Your privacy is sacred to us



Ready to start your journey? Hit that button below! 👇

""",

    

    "shop_categories": """

🏪 *Welcome to the Shop!*



What are you looking for today? We've organized everything into categories to make your shopping easier.



Pick a category below to see what we've got! 👇

""",

    

    "help": """

🤝 *Need Help? We Got You!*



Here's everything you can do:



🍕 /shop - Browse our premium selection

🛒 /cart - Check what's in your basket

📦 /orders - Track your order history

❓ /help - You're here now!



*How to Order:*

1️⃣ Browse categories & pick your products

2️⃣ Add them to cart (we'll remember quantities!)

3️⃣ Checkout with your location

4️⃣ Apply referral code (if you have one)

5️⃣ Pay with crypto - completely anonymous

6️⃣ Sit back and wait for gains to arrive!



*Payment Methods:*

We accept BTC, ETH, SOL & USDT



*Shipping:*

🚚 EU-wide discreet shipping

📦 No names, no addresses stored

🔒 Your privacy is our priority



Questions? Hit us up anytime! 💬

""",

    

    "cart_empty": """

🛒 *Your Cart is Empty!*



Looks like you haven't added anything yet, bro!



Your muscles are probably crying right now... 😢

Let's fix that! Hit the button below to start shopping! 💪

""",

    

    "product_added": """

✅ *Added to Cart!*



Nice choice! {quantity}x {product_name} is now in your cart!



*Cart Total: ${total:.2f}*



Want to add more? Keep browsing!

Ready to checkout? View your cart! 🛒

""",

    

    "checkout_intro": """

🎯 *Let's Complete Your Order!*



You're about to get some serious gains delivered! 

Here's what you're getting:



{order_summary}



*Total: ${total:.2f} USDT*



Everything look good? Let's continue! 👇

""",

    

    "ask_location": """

📍 *Where Should We Ship?*



First, select your country from the list below.

Don't worry - we never store your full address! 



We just need to know the general area for shipping calculations. 🚚

""",

    

    "ask_city": """

📍 *Almost There!*



Now just type your city name.



*Example:* Berlin, Amsterdam, Prague, etc.



Remember: We don't need your street address or any personal details! 

Your privacy matters to us. 🔒

""",

    

    "ask_referral": """

🎁 *Got a Referral Code?*



If you have a referral code from a friend or promotion, enter it now to get a discount!



Just type the code or click 'Skip' if you don't have one.



*Example:* GAINS20, BULK15, etc.

""",

    

    "referral_applied": """

🎉 *Discount Applied!*



Sweet! Your referral code *{code}* gives you {discount_text}!



*Original Total:* ~${original:.2f}~

*Discount:* -${discount_amount:.2f}

*New Total:* ${new_total:.2f} 🔥



Let's proceed to payment! 💳

""",

    

    "referral_invalid": """

❌ *Invalid Code*



Sorry bro, that code doesn't work. It might be:

• Expired

• Already used up

• Typed incorrectly



Want to try another code or continue without discount?

""",

    

    "payment_select": """

💳 *Choose Your Payment Method*



Almost done! How would you like to pay?



All payments are 100% anonymous through crypto.

Pick your preferred currency below:

""",

    

    "payment_instructions": """

📋 *Payment Instructions*



*Order:* `{order_number}`

*Amount:* ${total:.2f} USDT

*Crypto Amount:* {crypto_amount:.6f} {currency}



Send *exactly* this amount to:

`{address}`



⏰ This payment expires in 30 minutes

📸 Save the transaction ID after sending!



Once you send the payment, it usually takes 5-15 minutes to confirm on the blockchain. We'll notify you as soon as it's confirmed!



*Important:* Send the exact amount for automatic processing!

""",

    

    "payment_confirmed": """

✅ *Payment Confirmed!*



Woohoo! Your payment has been confirmed! 🎉



*Order Number:* `{order_number}`



Your order is now being prepared for shipping. You'll receive it within 3-7 business days (EU shipping).



Thank you for trusting AnabolicPizza! 

Time to prepare for those gains! 💪



Want to order more? Let's go! 🍕

""",

    

    "category_empty": """

📭 *Category Empty*



Looks like we're out of stock in this category right now!



Our suppliers are working hard to restock. Check back soon or browse other categories! 🔄

""",

    

    "no_categories": """

🚧 *Shop Setup in Progress*



We're currently setting up our categories. Check back in a few minutes!



The admins are working on it right now! 🛠️

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

