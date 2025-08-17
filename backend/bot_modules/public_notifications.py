"""
Public notification system with admin control
"""
import logging
import random
import asyncio
from telegram import Bot
from datetime import datetime
from typing import Dict, Any, Optional, List
from motor.motor_asyncio import AsyncIOMotorClient
from .config import BOT_TOKEN, MONGODB_URI

logger = logging.getLogger(__name__)

class PublicNotificationManager:
    """Manage public notifications with database configuration"""
    
    def __init__(self):
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
    
    async def get_notification_settings(self) -> Dict:
        """Get notification settings from database"""
        settings = await self.db.notification_settings.find_one({"_id": "main"})
        if not settings:
            # Default settings
            return {
                "enabled": False,
                "channel_id": None,
                "delay_min": 60,
                "delay_max": 300,
                "show_exact_amount": False,
                "fake_orders_enabled": False,
                "fake_orders_per_hour": 2,
                "message_templates": []
            }
        return settings
    
    async def get_amount_display(self, amount: float, show_exact: bool) -> str:
        """Get amount display based on settings"""
        if show_exact:
            return f"${amount:.0f}"
        
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
        else:
            return "$1000+"
    
    async def get_random_template(self, amount: float) -> str:
        """Get random message template from database"""
        settings = await self.get_notification_settings()
        templates = settings.get("message_templates", [])
        
        # Filter templates by amount range
        if amount >= 500:
            templates = [t for t in templates if t.get("type") == "big_order"] or templates
        
        if not templates:
            # Default templates
            templates = [
                {"text": "🔥 *NEW ORDER!*\n\n💰 Amount: {amount}\n📍 Shipping to: {flag} {country}\n\n_Another satisfied customer!_ 💪"},
                {"text": "🚀 *ORDER PLACED!*\n\n💵 {amount} order\n📦 Sending to {flag} {country}\n\n_Quality gear on the way!_ 💉"},
                {"text": "✅ *NEW PURCHASE!*\n\n💰 {amount}\n🚚 Delivery to {flag} {country}\n\n_Thanks for trusting us!_ 🍕"}
            ]
        
        return random.choice(templates).get("text", "New order placed!")
    
    async def send_notification(self, order_data: Dict) -> bool:
        """Send public notification about order"""
        try:
            settings = await self.get_notification_settings()
            
            if not settings["enabled"] or not settings["channel_id"]:
                logger.info("Notifications disabled or no channel set")
                return False
            
            # Prepare data
            country = order_data.get('delivery_country', 'EU')
            amount = order_data.get('total_usdt', 0)
            flag = self.country_flags.get(country, "🇪🇺")
            amount_display = await self.get_amount_display(amount, settings["show_exact_amount"])
            
            # Get template and format
            template = await self.get_random_template(amount)
            message = template.format(
                amount=amount_display,
                flag=flag,
                country=country
            )
            
            # Add delay if configured
            if settings.get("delay_min", 0) > 0:
                delay = random.randint(
                    settings.get("delay_min", 60),
                    settings.get("delay_max", 300)
                )
                await asyncio.sleep(delay)
            
            # Send to channel
            await self.bot.send_message(
                chat_id=settings["channel_id"],
                text=message,
                parse_mode='Markdown',
                disable_web_page_preview=True
            )
            
            # Log notification
            await self.db.notification_logs.insert_one({
                "type": "real_order",
                "order_id": order_data.get("_id"),
                "sent_at": datetime.utcnow(),
                "channel_id": settings["channel_id"]
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending notification: {e}")
            return False
    
    async def send_fake_order(self) -> bool:
        """Send fake order notification for marketing"""
        try:
            settings = await self.get_notification_settings()
            
            if not settings.get("fake_orders_enabled"):
                return False
            
            # Generate random fake order data
            countries = list(self.country_flags.keys())
            country = random.choice(countries)
            
            # Random amount between 50-500
            amounts = [75, 100, 150, 200, 250, 300, 350, 400, 450, 500]
            amount = random.choice(amounts)
            
            fake_order = {
                "delivery_country": country,
                "total_usdt": amount,
                "_id": f"fake_{datetime.utcnow().timestamp()}"
            }
            
            await self.send_notification(fake_order)
            
            # Log fake order
            await self.db.notification_logs.insert_one({
                "type": "fake_order",
                "fake_data": fake_order,
                "sent_at": datetime.utcnow()
            })
            
            return True
            
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
            settings = await public_notifier.get_notification_settings()
            
            if settings.get("fake_orders_enabled"):
                orders_per_hour = settings.get("fake_orders_per_hour", 2)
                
                if orders_per_hour > 0:
                    # Calculate interval
                    interval = 3600 / orders_per_hour
                    
                    # Add some randomness (±20%)
                    interval = interval * random.uniform(0.8, 1.2)
                    
                    await asyncio.sleep(interval)
                    await public_notifier.send_fake_order()
                else:
                    await asyncio.sleep(3600)  # Check every hour
            else:
                await asyncio.sleep(300)  # Check every 5 minutes
                
        except Exception as e:
            logger.error(f"Error in fake order scheduler: {e}")
            await asyncio.sleep(300)
