# backend/bot_modules/message_updater.py
"""
Helper module for smooth Telegram message updates without flicker
"""

import asyncio
import logging
from typing import Optional, Dict
from datetime import datetime
from telegram import Bot, InlineKeyboardMarkup
from telegram.error import BadRequest

logger = logging.getLogger(__name__)


class MessageUpdater:
    """Manages smooth message updates with anti-flicker protection"""
    
    def __init__(self):
        self.last_updates: Dict[str, Dict] = {}  # Track last update per message
        self.update_locks: Dict[str, asyncio.Lock] = {}  # Prevent concurrent updates
    
    def _get_message_key(self, chat_id: int, message_id: int) -> str:
        """Generate unique key for message tracking"""
        return f"{chat_id}:{message_id}"
    
    async def update_message(
        self,
        bot: Bot,
        chat_id: int,
        message_id: int,
        text: str,
        reply_markup: Optional[InlineKeyboardMarkup] = None,
        parse_mode: str = 'Markdown',
        force: bool = False
    ) -> bool:
        """
        Update message with anti-flicker protection
        
        Args:
            bot: Telegram bot instance
            chat_id: Chat ID
            message_id: Message ID to update
            text: New message text
            reply_markup: Optional keyboard
            parse_mode: Parse mode for text
            force: Force update even if text hasn't changed
        
        Returns:
            bool: True if message was updated, False if skipped
        """
        key = self._get_message_key(chat_id, message_id)
        
        # Create lock if doesn't exist
        if key not in self.update_locks:
            self.update_locks[key] = asyncio.Lock()
        
        async with self.update_locks[key]:
            # Check if we should skip this update
            if not force and key in self.last_updates:
                last_data = self.last_updates[key]
                
                # Skip if text hasn't changed and last update was recent
                if (last_data.get("text") == text and 
                    (datetime.utcnow() - last_data.get("timestamp", datetime.min)).total_seconds() < 0.3):
                    return False
            
            try:
                # Attempt to update message
                await bot.edit_message_text(
                    chat_id=chat_id,
                    message_id=message_id,
                    text=text,
                    reply_markup=reply_markup,
                    parse_mode=parse_mode
                )
                
                # Record successful update
                self.last_updates[key] = {
                    "text": text,
                    "timestamp": datetime.utcnow()
                }
                
                return True
                
            except BadRequest as e:
                error_str = str(e).lower()
                
                # Ignore "message not modified" errors
                if "message is not modified" in error_str:
                    return False
                
                # Log other errors
                if "message to edit not found" not in error_str:
                    logger.warning(f"Failed to update message: {e}")
                
                return False
                
            except Exception as e:
                logger.error(f"Unexpected error updating message: {e}")
                return False
    
    def clear_message_cache(self, chat_id: int, message_id: int):
        """Clear cached data for a specific message"""
        key = self._get_message_key(chat_id, message_id)
        
        if key in self.last_updates:
            del self.last_updates[key]
        
        if key in self.update_locks:
            del self.update_locks[key]
    
    def clear_old_cache(self, max_age_seconds: int = 300):
        """Clear cache entries older than max_age_seconds"""
        cutoff_time = datetime.utcnow()
        keys_to_remove = []
        
        for key, data in self.last_updates.items():
            if (cutoff_time - data.get("timestamp", datetime.min)).total_seconds() > max_age_seconds:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self.last_updates[key]
            if key in self.update_locks:
                del self.update_locks[key]
        
        if keys_to_remove:
            logger.info(f"Cleared {len(keys_to_remove)} old message cache entries")


# Global instance
message_updater = MessageUpdater()


# Cleanup task to run periodically
async def cleanup_old_messages():
    """Background task to clean up old message cache"""
    while True:
        try:
            await asyncio.sleep(300)  # Run every 5 minutes
            message_updater.clear_old_cache()
        except Exception as e:
            logger.error(f"Error in cleanup task: {e}")


# Animation helper for smooth status transitions
class StatusAnimator:
    """Manages smooth status text animations"""
    
    def __init__(self):
        self.animations = {
            "dots": ["", ".", "..", "...", "....", "....."],
            "loading": ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
            "pulse": ["●", "○", "●", "○"],
            "arrows": ["→", "→→", "→→→", "→→→→", "→→→→→"],
            "blocks": ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"]
        }
        
        self.frame_indices = {}
    
    def get_frame(self, animation_type: str, key: str) -> str:
        """Get next frame for animation"""
        if animation_type not in self.animations:
            return ""
        
        frames = self.animations[animation_type]
        
        if key not in self.frame_indices:
            self.frame_indices[key] = 0
        
        frame = frames[self.frame_indices[key]]
        self.frame_indices[key] = (self.frame_indices[key] + 1) % len(frames)
        
        return frame
    
    def reset(self, key: str):
        """Reset animation for a specific key"""
        if key in self.frame_indices:
            del self.frame_indices[key]


# Global animator instance  
status_animator = StatusAnimator()