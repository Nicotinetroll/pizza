"""
FIXED public_notifications.py - 100% realistic amounts based on products
No rounding, exact prices like 176.34, 2953.67 etc.
"""
import logging
import random
import asyncio
from telegram import Bot
from datetime import datetime
from typing import Dict, Any, Optional, List
from motor.motor_asyncio import AsyncIOMotorClient
import os

logger = logging.getLogger(__name__)

class PublicNotificationManager:
    """Manage public notifications with database configuration"""
    
    def __init__(self):
        from .config import BOT_TOKEN, MONGODB_URI
        
        self.bot = Bot(token=BOT_TOKEN)
        self.mongo_client = AsyncIOMotorClient(MONGODB_URI)
        self.db = self.mongo_client.telegram_shop
        
        # Country flags
        self.country_flags = {
            "Germany": "🇩🇪", "France": "🇫🇷", "Netherlands": "🇳🇱",
            "Belgium": "🇧🇪", "Austria": "🇦🇹", "Poland": "🇵🇱",
            "Czechia": "🇨🇿", "Slovakia": "🇸🇰", "Hungary": "🇭🇺",
            "Romania": "🇷🇴", "Bulgaria": "🇧🇬", "Greece": "🇬🇷",
            "Italy": "🇮🇹", "Spain": "🇪🇸", "Portugal": "🇵🇹",
            "Sweden": "🇸🇪", "Finland": "🇫🇮", "Denmark": "🇩🇰",
            "Ireland": "🇮🇪", "Luxembourg": "🇱🇺"
        }
    
    async def get_settings(self):
        """Get notification settings from database - FIXED METHOD NAME"""
        settings = await self.db.notification_settings.find_one({"_id": "main"})
        if not settings:
            return {
                "enabled": False,
                "channel_id": None,
                "delay_min": 60,
                "delay_max": 300,
                "show_exact_amount": False,
                "fake_orders_enabled": False,
                "fake_orders_per_hour": 2,
                "fake_order_min_amount": 100,
                "fake_order_max_amount": 3000,
                "message_templates": []
            }
        return settings
    
    # ALIAS for compatibility
    async def get_notification_settings(self):
        """Alias for get_settings for compatibility"""
        return await self.get_settings()
    
    async def get_realistic_order_amount(self, min_amount: float = 100, max_amount: float = 3000) -> float:
        """Generate 100% realistic order amounts - NO ROUNDING!"""
        try:
            # Get all active products from database
            products = await self.db.products.find({
                "is_active": True,
                "price_usdt": {"$gt": 0}
            }).to_list(100)
            
            if not products:
                # No products - return random float with 2 decimals
                return round(random.uniform(min_amount, max_amount), 2)
            
            # Extract all product prices (keep exact decimals!)
            prices = [float(p.get("price_usdt", 0)) for p in products if p.get("price_usdt")]
            
            if not prices:
                return round(random.uniform(min_amount, max_amount), 2)
            
            # Generate ALL possible realistic combinations
            possible_amounts = []
            
            # Strategy 1: Single product, multiple quantities (most common)
            for price in prices:
                # Calculate max quantity for this product
                max_qty = int(max_amount / price) if price > 0 else 1
                
                # Generate various quantities
                for qty in range(1, min(max_qty + 1, 50)):  # Up to 50 items
                    total = price * qty
                    if min_amount <= total <= max_amount:
                        possible_amounts.append(total)
            
            # Strategy 2: Bundles (2-4 different products)
            for _ in range(100):  # Generate 100 different bundles
                num_products = random.randint(2, min(4, len(prices)))
                selected_prices = random.sample(prices, num_products)
                
                # Random quantities for each product
                quantities = [random.randint(1, 10) for _ in selected_prices]
                total = sum(price * qty for price, qty in zip(selected_prices, quantities))
                
                if min_amount <= total <= max_amount:
                    possible_amounts.append(total)
            
            # Strategy 3: Fill gaps with calculated combinations
            if max_amount > 2000:
                # Try to create amounts close to max
                target_ranges = [
                    (max_amount * 0.9, max_amount),     # 90-100% of max
                    (max_amount * 0.7, max_amount * 0.9), # 70-90% of max
                    (max_amount * 0.5, max_amount * 0.7), # 50-70% of max
                ]
                
                for target_min, target_max in target_ranges:
                    # Find combinations that hit this range
                    for _ in range(20):
                        # Pick random products
                        num_products = random.randint(1, min(5, len(prices)))
                        selected_prices = random.sample(prices, num_products)
                        
                        # Calculate quantities to reach target
                        base_total = sum(selected_prices)
                        if base_total > 0:
                            multiplier = target_min / base_total
                            
                            # Generate bundle with this multiplier (with variation)
                            quantities = [
                                max(1, int(multiplier * random.uniform(0.8, 1.2)))
                                for _ in selected_prices
                            ]
                            
                            total = sum(price * qty for price, qty in zip(selected_prices, quantities))
                            
                            if min_amount <= total <= max_amount:
                                possible_amounts.append(total)
            
            # Remove duplicates and sort
            possible_amounts = list(set(possible_amounts))
            
            if not possible_amounts:
                # Fallback - at least use product multiples
                for price in prices:
                    multiplier = random.uniform(min_amount / price, max_amount / price)
                    qty = max(1, int(multiplier))
                    return price * qty
            
            # EQUAL distribution across entire range!
            return random.choice(possible_amounts)
            
        except Exception as e:
            logger.error(f"Error generating amount: {e}")
            # Fallback - random float with 2 decimals
            return round(random.uniform(min_amount, max_amount), 2)
    
    async def get_amount_display(self, amount: float, show_exact: bool) -> str:
        """Get amount display based on settings"""
        if show_exact:
            # Show exact amount with 2 decimals
            return f"${amount:.2f}"
        
        # Show ranges for privacy
        if amount < 50:
            return "$25-50"
        elif amount < 100:
            return "$50-100"
        elif amount < 200:
            return "$100-200"
        elif amount < 500:
            return "$200-500"
        elif amount < 1000:
            return "$500-1000"
        elif amount < 2000:
            return "$1000-2000"
        elif amount < 3000:
            return "$2000-3000"
        else:
            return "$3000+"
    
    async def format_order_message(self, order_data: dict, settings: dict) -> str:
        """Format the order message for public notification"""
        try:
            country = order_data.get('delivery_country', 'EU')
            flag = self.country_flags.get(country, "🇪🇺")
            amount = float(order_data.get('total_usdt', 0))
            
            # Get amount display
            amount_display = await self.get_amount_display(
                amount, 
                settings.get('show_exact_amount', False)
            )
            
            # Get template
            templates = settings.get("message_templates", [])
            
            if not templates:
                # Default templates - epic messages
                templates = [
                    {"text": "🔥 *BOOM!* {flag} {country} just dropped {amount} on gains\n\n_Another warrior joins the anabolic army_ 💪"},
                    {"text": "💉 *{country} KNOWS WHAT'S UP*\n\n{amount} worth of pure excellence heading to {flag}"},
                    {"text": "⚡ *INJECTION DETECTED*\n\n{flag} {country} injected {amount} into their gains portfolio"},
                    {"text": "🎯 *{country} MAKING MOVES*\n\nJust secured {amount} in premium gear {flag}"},
                    {"text": "💀 *BEAST MODE: {country}*\n\n{amount} invested in getting absolutely yoked {flag}"},
                ]
            
            # Choose random template
            template = random.choice(templates)
            message = template.get("text", "New order from {country}! Amount: {amount}")
            
            # Replace placeholders
            message = message.replace("{country}", country)
            message = message.replace("{flag}", flag)
            message = message.replace("{amount}", amount_display)
            
            return message
            
        except Exception as e:
            logger.error(f"Error formatting message: {e}")
            return f"🔥 New order received! 🚀"
    
    async def send_notification(self, order_data: dict) -> bool:
        """Send notification to public channel ONLY for confirmed orders"""
        try:
            settings = await self.get_settings()
            if not settings.get('enabled') or not settings.get('channel_id'):
                logger.info("Notifications disabled or no channel configured")
                return False
            
            # IMPORTANT: Only send notification for PAID/COMPLETED orders
            order_status = order_data.get('status', 'pending')
            if order_status not in ['paid', 'completed']:
                logger.info(f"Skipping notification for {order_status} order")
                return False
            
            # Generate random delay
            delay = random.randint(
                settings.get('delay_min', 60),
                settings.get('delay_max', 300)
            )
            
            logger.info(f"Scheduling notification in {delay} seconds for order {order_data.get('order_number')}")
            await asyncio.sleep(delay)
            
            # Format message
            message = await self.format_order_message(order_data, settings)
            
            # Send to channel
            if self.bot:
                await self.bot.send_message(
                    chat_id=settings['channel_id'],
                    text=message,
                    parse_mode='Markdown'
                )
                
                # Log the notification
                await self.db.notification_logs.insert_one({
                    "type": "real_order",
                    "order_id": order_data.get('_id'),
                    "order_number": order_data.get('order_number'),
                    "sent_at": datetime.utcnow(),
                    "channel_id": settings['channel_id'],
                    "message": message
                })
                
                logger.info(f"✅ Notification sent for order {order_data.get('order_number')}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error sending notification: {e}")
            return False
    
    async def send_fake_order(self) -> bool:
        """Send fake order notification with realistic amounts"""
        try:
            settings = await self.get_settings()
            
            if not settings.get("fake_orders_enabled"):
                logger.info("Fake orders disabled")
                return False
            
            if not settings.get('channel_id'):
                logger.info("No channel configured")
                return False
            
            # Get min/max amounts from settings
            min_amount = settings.get("fake_order_min_amount", 100)
            max_amount = settings.get("fake_order_max_amount", 3000)
            
            # Generate REALISTIC amount based on products
            amount = await self.get_realistic_order_amount(min_amount, max_amount)
            
            # Random country with weighted selection
            country_weights = {
                "Germany": 3, "Netherlands": 3, "France": 2, "Belgium": 2,
                "Austria": 2, "Poland": 2, "Italy": 2, "Spain": 2,
                "Czechia": 1, "Slovakia": 1, "Hungary": 1, "Romania": 1,
                "Bulgaria": 1, "Greece": 1, "Portugal": 1, "Sweden": 1,
                "Finland": 1, "Denmark": 1, "Ireland": 1, "Luxembourg": 1
            }
            
            # For big orders, slightly prefer rich countries
            if amount > 1500:
                country_weights["Germany"] = 4
                country_weights["Netherlands"] = 3
                country_weights["Luxembourg"] = 2
                country_weights["Sweden"] = 2
            
            countries = []
            weights = []
            for c, w in country_weights.items():
                countries.append(c)
                weights.append(w)
            
            country = random.choices(countries, weights=weights)[0]
            
            fake_order = {
                "delivery_country": country,
                "total_usdt": amount,
                "status": "paid",  # IMPORTANT: Mark as paid so it passes the check
                "_id": f"fake_{datetime.utcnow().timestamp()}",
                "order_number": f"FAKE-{random.randint(1000, 9999)}"
            }
            
            logger.info(f"Sending fake order: ${amount:.2f} to {country}")
            
            # Use the same send_notification method
            return await self.send_notification(fake_order)
            
        except Exception as e:
            logger.error(f"Error sending fake order: {e}")
            return False

# Global instance
public_notifier = PublicNotificationManager()

# Background task for fake orders
async def fake_order_scheduler():
    """Background task to send fake orders periodically"""
    while True:
        try:
            settings = await public_notifier.get_settings()
            
            if settings.get("fake_orders_enabled"):
                orders_per_hour = settings.get("fake_orders_per_hour", 2)
                
                if orders_per_hour > 0:
                    # Calculate interval
                    interval = 3600 / orders_per_hour
                    
                    # Add some randomness (±30%)
                    interval = interval * random.uniform(0.7, 1.3)
                    
                    logger.info(f"Next fake order in {interval:.0f} seconds")
                    await asyncio.sleep(interval)
                    
                    # Send fake order
                    success = await public_notifier.send_fake_order()
                    if success:
                        logger.info("Fake order sent successfully")
                else:
                    await asyncio.sleep(3600)
            else:
                await asyncio.sleep(300)
                
        except Exception as e:
            logger.error(f"Error in fake order scheduler: {e}")
            await asyncio.sleep(300)
