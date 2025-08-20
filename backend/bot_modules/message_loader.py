"""
Dynamic message loader from database
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Dict, Optional
import os
from dotenv import load_dotenv
import logging

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/telegram_shop")
logger = logging.getLogger(__name__)

class MessageLoader:
    def __init__(self):
        self.client = AsyncIOMotorClient(MONGODB_URI)
        self.db = self.client.telegram_shop
        self.messages_cache = {}
        self.commands_cache = {}
        self.settings_cache = {}
        
    async def load_messages(self) -> Dict[str, str]:
        """Load all active messages from database"""
        messages = await self.db.bot_messages.find({"enabled": True}).to_list(1000)
        
        message_dict = {}
        for msg in messages:
            message_dict[msg["key"]] = msg["message"]
        
        # Fallback to default if empty or missing keys
        if not message_dict or 'welcome' not in message_dict:
            from .config import MESSAGES
            # Merge with defaults, database takes priority
            for key, value in MESSAGES.items():
                if key not in message_dict:
                    message_dict[key] = value
                    # Also save to database for future
                    await self.db.bot_messages.update_one(
                        {"key": key},
                        {
                            "$set": {
                                "key": key,
                                "message": value,
                                "category": self._get_category_for_key(key),
                                "enabled": True
                            }
                        },
                        upsert=True
                    )
            logger.info(f"Loaded {len(message_dict)} messages (with defaults)")
            
        self.messages_cache = message_dict
        return message_dict
    
    def _get_category_for_key(self, key: str) -> str:
        """Determine category based on key name"""
        if key in ['welcome', 'help', 'shop_categories']:
            return 'main'
        elif 'cart' in key:
            return 'cart'
        elif 'checkout' in key or 'ask_' in key:
            return 'checkout'
        elif 'payment' in key:
            return 'payment'
        elif 'error' in key:
            return 'error'
        elif 'success' in key:
            return 'success'
        else:
            return 'main'
    
    async def load_commands(self) -> Dict[str, dict]:
        """Load all active commands from database"""
        commands = await self.db.bot_commands.find({"enabled": True}).to_list(100)
        
        command_dict = {}
        for cmd in commands:
            # Debug log
            if cmd["command"] == "/mash":
                logger.info(f"Loading /mash from DB: private_only={cmd.get('private_only')}, group_redirect={cmd.get('group_redirect')}")
            
            command_dict[cmd["command"]] = {
                "description": cmd["description"],
                "response": cmd["response"],
                "aliases": cmd.get("aliases", []),
                "private_only": cmd.get("private_only", True),
                "group_redirect": cmd.get("group_redirect", True)
            }
        
        self.commands_cache = command_dict
        return command_dict
        
        # Add default commands if missing
        if not command_dict:
            default_commands = {
                "/start": {
                    "description": "Start the bot",
                    "response": "Welcome to the bot!",
                    "aliases": ["/begin", "/go"]
                },
                "/help": {
                    "description": "Get help",
                    "response": "Here's how to use the bot...",
                    "aliases": []
                }
            }
            for cmd, data in default_commands.items():
                if cmd not in command_dict:
                    command_dict[cmd] = data
                    # Save to database
                    await self.db.bot_commands.update_one(
                        {"command": cmd},
                        {
                            "$set": {
                                "command": cmd,
                                "description": data["description"],
                                "response": data["response"],
                                "aliases": data["aliases"],
                                "enabled": True
                            }
                        },
                        upsert=True
                    )
            
        self.commands_cache = command_dict
        return command_dict
    
    async def load_settings(self) -> dict:
        """Load bot settings from database"""
        settings = await self.db.bot_settings.find_one({"_id": "main"})
        
        if not settings:
            settings = {
                "bot_name": "AnabolicPizza Bot",
                "welcome_delay": 0,
                "typing_delay": 1,
                "max_cart_items": 50,
                "session_timeout": 3600,
                "maintenance_mode": False,
                "maintenance_message": "Bot is under maintenance. Please try again later."
            }
            # Save default settings
            settings["_id"] = "main"
            await self.db.bot_settings.insert_one(settings)
            
        self.settings_cache = settings
        return settings
    
    async def get_message(self, key: str, **kwargs) -> str:
        """Get a specific message with variable substitution"""
        if not self.messages_cache:
            await self.load_messages()
        
        # Try to get from cache first
        message = self.messages_cache.get(key)
        
        # If not found, try to load from database
        if not message:
            db_msg = await self.db.bot_messages.find_one({"key": key})
            if db_msg:
                message = db_msg["message"]
                self.messages_cache[key] = message
            else:
                # If still not found, use fallback
                from .config import MESSAGES
                message = MESSAGES.get(key, f"Message '{key}' not found")
                # Save to database for next time
                await self.db.bot_messages.insert_one({
                    "key": key,
                    "message": message,
                    "category": self._get_category_for_key(key),
                    "enabled": True
                })
                self.messages_cache[key] = message
        
        # Replace variables
        for var_key, var_value in kwargs.items():
            message = message.replace(f"{{{var_key}}}", str(var_value))
            
        return message
    
    async def get_command_response(self, command: str) -> Optional[str]:
        """Get response for a command"""
        if not self.commands_cache:
            await self.load_commands()
            
        cmd_data = self.commands_cache.get(command)
        if cmd_data:
            return cmd_data["response"]
            
        # Check aliases
        for cmd, data in self.commands_cache.items():
            if command in data.get("aliases", []):
                return data["response"]
                
        return None
    
    async def is_maintenance_mode(self) -> bool:
        """Check if bot is in maintenance mode"""
        if not self.settings_cache:
            await self.load_settings()
            
        return self.settings_cache.get("maintenance_mode", False)
    
    async def get_maintenance_message(self) -> str:
        """Get maintenance message"""
        if not self.settings_cache:
            await self.load_settings()
            
        return self.settings_cache.get(
            "maintenance_message", 
            "Bot is under maintenance. Please try again later."
        )
    
    async def reload_all(self):
        """Reload all messages, commands and settings"""
        await self.load_messages()
        await self.load_commands()
        await self.load_settings()
        logger.info("Reloaded all bot configuration from database")

# Global instance
message_loader = MessageLoader()
