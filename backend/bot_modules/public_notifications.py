"""
FIXED public_notifications.py - 100% realistic amounts based on products
No rounding, exact prices like 176.34, 2953.67 etc.
WITH CUSTOM EMOJI SUPPORT AND API METHODS
"""
import logging
import random
import asyncio
from telegram import Bot, MessageEntity
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple
from motor.motor_asyncio import AsyncIOMotorClient
import os

logger = logging.getLogger(__name__)

class PublicNotificationManager:
    """Manage public notifications with database configuration and custom emoji support"""
    
    def __init__(self):
        from .config import BOT_TOKEN, MONGODB_URI
        
        self.bot = Bot(token=BOT_TOKEN)
        self.mongo_client = AsyncIOMotorClient(MONGODB_URI)
        self.db = self.mongo_client.telegram_shop
        
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
    
    async def get_notification_settings(self):
        """Alias for get_settings for compatibility"""
        return await self.get_settings()
    
    async def update_settings(self, settings_data: dict) -> dict:
        """Update notification settings"""
        try:
            # Keep existing templates if not provided
            existing = await self.db.notification_settings.find_one({"_id": "main"})
            if existing and "message_templates" in existing and "message_templates" not in settings_data:
                settings_data["message_templates"] = existing["message_templates"]
            
            await self.db.notification_settings.update_one(
                {"_id": "main"},
                {"$set": settings_data},
                upsert=True
            )
            
            return {"success": True, "message": "Settings updated"}
            
        except Exception as e:
            logger.error(f"Error updating settings: {e}")
            return {"error": str(e)}
    
    async def add_template(self, template_data: dict) -> dict:
        """Add new notification template"""
        try:
            # Validate entities
            entities = template_data.get("entities", [])
            for entity in entities:
                if entity.get("type") == "custom_emoji":
                    if not entity.get("custom_emoji_id"):
                        return {"error": "Custom emoji ID required"}
            
            settings = await self.db.notification_settings.find_one({"_id": "main"})
            
            if not settings:
                settings = {
                    "_id": "main",
                    "message_templates": []
                }
            
            template = {
                "text": template_data.get("text"),
                "entities": entities,
                "type": template_data.get("type", "normal"),
                "enabled": template_data.get("enabled", True)
            }
            
            if "message_templates" not in settings:
                settings["message_templates"] = []
                
            settings["message_templates"].append(template)
            
            await self.db.notification_settings.update_one(
                {"_id": "main"},
                {"$set": settings},
                upsert=True
            )
            
            return {"success": True, "message": "Template added"}
            
        except Exception as e:
            logger.error(f"Error adding template: {e}")
            return {"error": str(e)}
    
    async def update_template(self, index: int, template_data: dict) -> dict:
        """Update existing template at specified index"""
        try:
            settings = await self.db.notification_settings.find_one({"_id": "main"})
            if not settings or "message_templates" not in settings:
                return {"error": "No templates found"}
            
            if index < 0 or index >= len(settings["message_templates"]):
                return {"error": "Invalid template index"}
            
            # Update the template
            settings["message_templates"][index] = {
                "text": template_data.get("text"),
                "entities": template_data.get("entities", []),
                "type": template_data.get("type", "normal"),
                "enabled": template_data.get("enabled", True)
            }
            
            await self.db.notification_settings.update_one(
                {"_id": "main"},
                {"$set": {"message_templates": settings["message_templates"]}}
            )
            
            return {"success": True, "message": "Template updated successfully"}
            
        except Exception as e:
            logger.error(f"Error updating template: {e}")
            return {"error": str(e)}
    
    async def delete_template(self, index: int) -> dict:
        """Delete template by index"""
        try:
            settings = await self.db.notification_settings.find_one({"_id": "main"})
            if not settings or "message_templates" not in settings:
                return {"error": "No templates found"}
            
            if index < 0 or index >= len(settings["message_templates"]):
                return {"error": "Invalid template index"}
            
            # Remove template at index
            settings["message_templates"].pop(index)
            
            await self.db.notification_settings.update_one(
                {"_id": "main"},
                {"$set": {"message_templates": settings["message_templates"]}}
            )
            
            return {"success": True, "message": "Template deleted"}
            
        except Exception as e:
            logger.error(f"Error deleting template: {e}")
            return {"error": str(e)}
    
    async def get_logs(self, limit: int = 50) -> List[dict]:
        """Get recent notification logs"""
        try:
            logs = await self.db.notification_logs.find(
                {},
                {"_id": 0}  # Exclude MongoDB _id
            ).sort("sent_at", -1).limit(limit).to_list(limit)
            
            return logs
            
        except Exception as e:
            logger.error(f"Error getting logs: {e}")
            return []
    
    async def get_realistic_order_amount(self, min_amount: float = 100, max_amount: float = 3000) -> float:
        """Generate 100% realistic order amounts - NO ROUNDING!"""
        try:
            products = await self.db.products.find({
                "is_active": True,
                "price_usdt": {"$gt": 0}
            }).to_list(100)
            
            if not products:
                return round(random.uniform(min_amount, max_amount), 2)
            
            prices = [float(p.get("price_usdt", 0)) for p in products if p.get("price_usdt")]
            
            if not prices:
                return round(random.uniform(min_amount, max_amount), 2)
            
            possible_amounts = []
            
            for price in prices:
                max_qty = int(max_amount / price) if price > 0 else 1
                
                for qty in range(1, min(max_qty + 1, 50)):
                    total = price * qty
                    if min_amount <= total <= max_amount:
                        possible_amounts.append(total)
            
            for _ in range(100):
                num_products = random.randint(2, min(4, len(prices)))
                selected_prices = random.sample(prices, num_products)
                
                quantities = [random.randint(1, 10) for _ in selected_prices]
                total = sum(price * qty for price, qty in zip(selected_prices, quantities))
                
                if min_amount <= total <= max_amount:
                    possible_amounts.append(total)
            
            if max_amount > 2000:
                target_ranges = [
                    (max_amount * 0.9, max_amount),
                    (max_amount * 0.7, max_amount * 0.9),
                    (max_amount * 0.5, max_amount * 0.7),
                ]
                
                for target_min, target_max in target_ranges:
                    for _ in range(20):
                        num_products = random.randint(1, min(5, len(prices)))
                        selected_prices = random.sample(prices, num_products)
                        
                        base_total = sum(selected_prices)
                        if base_total > 0:
                            multiplier = target_min / base_total
                            
                            quantities = [
                                max(1, int(multiplier * random.uniform(0.8, 1.2)))
                                for _ in selected_prices
                            ]
                            
                            total = sum(price * qty for price, qty in zip(selected_prices, quantities))
                            
                            if min_amount <= total <= max_amount:
                                possible_amounts.append(total)
            
            possible_amounts = list(set(possible_amounts))
            
            if not possible_amounts:
                for price in prices:
                    multiplier = random.uniform(min_amount / price, max_amount / price)
                    qty = max(1, int(multiplier))
                    return price * qty
            
            return random.choice(possible_amounts)
            
        except Exception as e:
            logger.error(f"Error generating amount: {e}")
            return round(random.uniform(min_amount, max_amount), 2)
    
    async def get_amount_display(self, amount: float, show_exact: bool) -> str:
        """Get amount display based on settings"""
        if show_exact:
            return f"${amount:.2f}"
        
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
    
    async def format_order_message(self, order_data: dict, settings: dict) -> Tuple[str, Optional[dict], List[dict]]:
        """Format the order message for public notification with media and custom emoji support"""
        try:
            country = order_data.get('delivery_country', 'EU')
            flag = self.country_flags.get(country, "🇪🇺")
            amount = float(order_data.get('total_usdt', 0))
            
            amount_display = await self.get_amount_display(
                amount, 
                settings.get('show_exact_amount', False)
            )
            
            templates = settings.get("message_templates", [])
            
            if not templates:
                templates = [
                    {
                        "text": "🔥 *BOOM!* {flag} {country} just dropped {amount} on gains\n\n_Another warrior joins the anabolic army_ 💪",
                        "entities": []
                    },
                    {
                        "text": "💉 *{country} KNOWS WHAT'S UP*\n\n{amount} worth of pure excellence heading to {flag}",
                        "entities": []
                    },
                    {
                        "text": "⚡ *INJECTION DETECTED*\n\n{flag} {country} injected {amount} into their gains portfolio",
                        "entities": []
                    },
                    {
                        "text": "🎯 *{country} MAKING MOVES*\n\nJust secured {amount} in premium gear {flag}",
                        "entities": []
                    },
                    {
                        "text": "💀 *BEAST MODE: {country}*\n\n{amount} invested in getting absolutely yoked {flag}",
                        "entities": []
                    },
                ]
            
            template = random.choice(templates)
            
            # Get template text and entities
            message = template.get("text", "New order from {country}! Amount: {amount}")
            entities = template.get("entities", [])
            
            # Store original message length for offset adjustment
            original_length = len(message)
            
            # Replace variables
            message = message.replace("{country}", country)
            message = message.replace("{flag}", flag)
            message = message.replace("{amount}", amount_display)
            
            # Adjust entity offsets if message length changed
            if len(message) != original_length:
                # Calculate offset adjustments based on replacements
                adjustments = []
                temp_msg = template.get("text", "")
                current_offset = 0
                
                # Find each placeholder and calculate offset change
                for placeholder, replacement in [("{country}", country), ("{flag}", flag), ("{amount}", amount_display)]:
                    idx = temp_msg.find(placeholder)
                    if idx != -1:
                        old_len = len(placeholder)
                        new_len = len(replacement)
                        diff = new_len - old_len
                        adjustments.append((idx + current_offset, diff))
                        current_offset += diff
                        temp_msg = temp_msg.replace(placeholder, replacement, 1)
                
                # Apply adjustments to entities
                adjusted_entities = []
                for entity in entities:
                    new_offset = entity.get("offset", 0)
                    for adj_pos, adj_diff in adjustments:
                        if entity.get("offset", 0) > adj_pos:
                            new_offset += adj_diff
                    
                    adjusted_entity = entity.copy()
                    adjusted_entity["offset"] = new_offset
                    adjusted_entities.append(adjusted_entity)
                
                entities = adjusted_entities
            
            # Get random media if available
            media_list = await self.db.notification_media.find({"enabled": True}).to_list(100)
            
            selected_media = None
            if media_list:
                selected_media = random.choice(media_list)
            
            return message, selected_media, entities
            
        except Exception as e:
            logger.error(f"Error formatting message: {e}")
            return f"🔥 New order received! 🚀", None, []
    
    async def send_notification(self, order_data: dict) -> bool:
        """Send notification to public channel with media and custom emoji support"""
        try:
            settings = await self.get_settings()
            if not settings.get('enabled') or not settings.get('channel_id'):
                logger.info("Notifications disabled or no channel configured")
                return False
            
            order_status = order_data.get('status', 'pending')
            if order_status not in ['paid', 'completed']:
                logger.info(f"Skipping notification for {order_status} order")
                return False
            
            delay = random.randint(
                settings.get('delay_min', 60),
                settings.get('delay_max', 300)
            )
            
            logger.info(f"Scheduling notification in {delay} seconds for order {order_data.get('order_number')}")
            await asyncio.sleep(delay)
            
            message, media, entities = await self.format_order_message(order_data, settings)
            
            # Convert entities for telegram-bot library
            telegram_entities = []
            has_custom_emoji = False
            
            for entity in entities:
                if entity.get("type") == "custom_emoji":
                    has_custom_emoji = True
                    telegram_entities.append(
                        MessageEntity(
                            type="custom_emoji",
                            offset=entity.get("offset", 0),
                            length=entity.get("length", 2),
                            custom_emoji_id=entity.get("custom_emoji_id")
                        )
                    )
                elif entity.get("type") == "bold":
                    telegram_entities.append(
                        MessageEntity(
                            type="bold",
                            offset=entity.get("offset", 0),
                            length=entity.get("length", 1)
                        )
                    )
                elif entity.get("type") == "italic":
                    telegram_entities.append(
                        MessageEntity(
                            type="italic",
                            offset=entity.get("offset", 0),
                            length=entity.get("length", 1)
                        )
                    )
            
            # IMPORTANT: Don't use parse_mode when using custom entities!
            if has_custom_emoji:
                # Remove markdown symbols from message
                message = message.replace('*', '').replace('_', '').replace('`', '')
                parse_mode = None
                logger.info(f"Sending with custom emoji entities: {len(telegram_entities)}")
            else:
                parse_mode = 'Markdown'
            
            if self.bot:
                if media:
                    media_path = f"/opt/telegram-shop-bot/media/notifications/{media['filename']}"
                    
                    if os.path.exists(media_path):
                        if media['type'] == 'gif':
                            with open(media_path, 'rb') as f:
                                await self.bot.send_animation(
                                    chat_id=settings['channel_id'],
                                    animation=f,
                                    caption=message,
                                    parse_mode=parse_mode,
                                    caption_entities=telegram_entities if telegram_entities else None
                                )
                        elif media['type'] == 'video':
                            with open(media_path, 'rb') as f:
                                await self.bot.send_video(
                                    chat_id=settings['channel_id'],
                                    video=f,
                                    caption=message,
                                    parse_mode=parse_mode,
                                    caption_entities=telegram_entities if telegram_entities else None
                                )
                        else:
                            with open(media_path, 'rb') as f:
                                await self.bot.send_photo(
                                    chat_id=settings['channel_id'],
                                    photo=f,
                                    caption=message,
                                    parse_mode=parse_mode,
                                    caption_entities=telegram_entities if telegram_entities else None
                                )
                    else:
                        logger.warning(f"Media file not found: {media_path}")
                        # Send without media
                        await self.bot.send_message(
                            chat_id=settings['channel_id'],
                            text=message,
                            parse_mode=parse_mode,
                            entities=telegram_entities if telegram_entities else None
                        )
                else:
                    await self.bot.send_message(
                        chat_id=settings['channel_id'],
                        text=message,
                        parse_mode=parse_mode,
                        entities=telegram_entities if telegram_entities else None
                    )
                
                # Log the notification
                await self.db.notification_logs.insert_one({
                    "type": "real_order",
                    "order_id": order_data.get('_id'),
                    "order_number": order_data.get('order_number'),
                    "sent_at": datetime.utcnow(),
                    "channel_id": settings['channel_id'],
                    "message": message,
                    "media_used": media['filename'] if media else None,
                    "entities": entities,
                    "amount": float(order_data.get('total_usdt', 0)),
                    "country": order_data.get('delivery_country', 'Unknown')
                })
                
                logger.info(f"✅ Notification sent for order {order_data.get('order_number')}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error sending notification: {e}")
            return False
    
    async def send_fake_order(self) -> bool:
        """Send fake order notification with realistic amounts and custom emoji support"""
        try:
            settings = await self.get_settings()
            
            if not settings.get("fake_orders_enabled"):
                logger.info("Fake orders disabled")
                return False
            
            if not settings.get('channel_id'):
                logger.info("No channel configured")
                return False
            
            min_amount = settings.get("fake_order_min_amount", 100)
            max_amount = settings.get("fake_order_max_amount", 3000)
            
            amount = await self.get_realistic_order_amount(min_amount, max_amount)
            
            country_weights = {
                "Germany": 3, "Netherlands": 3, "France": 2, "Belgium": 2,
                "Austria": 2, "Poland": 2, "Italy": 2, "Spain": 2,
                "Czechia": 1, "Slovakia": 1, "Hungary": 1, "Romania": 1,
                "Bulgaria": 1, "Greece": 1, "Portugal": 1, "Sweden": 1,
                "Finland": 1, "Denmark": 1, "Ireland": 1, "Luxembourg": 1
            }
            
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
                "status": "paid",
                "_id": f"fake_{datetime.utcnow().timestamp()}",
                "order_number": f"FAKE-{random.randint(1000, 9999)}"
            }
            
            logger.info(f"Sending fake order: ${amount:.2f} to {country}")
            
            # Log the fake order
            await self.db.notification_logs.insert_one({
                "type": "fake_order",
                "order_id": fake_order["_id"],
                "order_number": fake_order["order_number"],
                "sent_at": datetime.utcnow(),
                "amount": amount,
                "country": country
            })
            
            return await self.send_notification(fake_order)
            
        except Exception as e:
            logger.error(f"Error sending fake order: {e}")
            return False
    
    async def send_test_notification(self, custom_message: str = None, custom_entities: List[dict] = None) -> bool:
        """Send test notification with optional custom message and entities"""
        try:
            settings = await self.get_settings()
            
            if not settings.get('channel_id'):
                logger.error("No channel configured for test notification")
                return False
            
            if custom_message:
                message = custom_message
                entities = custom_entities or []
            else:
                # Use a default test message with custom emoji
                message = "😈 TEST NOTIFICATION 😈\n\nThis is a test of the anabolic notification system!\n\nIf you see this, everything is working perfectly 💪"
                entities = [
                    {
                        "offset": 0,
                        "length": 2,
                        "type": "custom_emoji",
                        "custom_emoji_id": "5875309033778322415"
                    },
                    {
                        "offset": 21,
                        "length": 2,
                        "type": "custom_emoji",
                        "custom_emoji_id": "5875309033778322415"
                    }
                ]
            
            # Convert entities for telegram-bot library
            telegram_entities = []
            has_custom_emoji = False
            
            for entity in entities:
                if entity.get("type") == "custom_emoji":
                    has_custom_emoji = True
                    telegram_entities.append(
                        MessageEntity(
                            type="custom_emoji",
                            offset=entity.get("offset", 0),
                            length=entity.get("length", 2),
                            custom_emoji_id=entity.get("custom_emoji_id")
                        )
                    )
            
            # Don't use parse_mode with custom emojis
            if has_custom_emoji:
                message = message.replace('*', '').replace('_', '').replace('`', '')
                parse_mode = None
            else:
                parse_mode = 'Markdown'
            
            if self.bot:
                await self.bot.send_message(
                    chat_id=settings['channel_id'],
                    text=message,
                    parse_mode=parse_mode,
                    entities=telegram_entities if telegram_entities else None
                )
                
                logger.info("✅ Test notification sent successfully")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error sending test notification: {e}")
            return False

# Global instance
public_notifier = PublicNotificationManager()

async def fake_order_scheduler():
    """Background task to send fake orders periodically"""
    while True:
        try:
            settings = await public_notifier.get_settings()
            
            if settings.get("fake_orders_enabled"):
                orders_per_hour = settings.get("fake_orders_per_hour", 2)
                
                if orders_per_hour > 0:
                    interval = 3600 / orders_per_hour
                    
                    # Add some randomness to interval
                    interval = interval * random.uniform(0.7, 1.3)
                    
                    logger.info(f"Next fake order in {interval:.0f} seconds")
                    await asyncio.sleep(interval)
                    
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