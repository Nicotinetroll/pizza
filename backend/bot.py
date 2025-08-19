"""
AnabolicPizza Bot - Main entry point
Enhanced with more commands and better humor
"""

import logging
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters
from telegram import Update

from bot_modules.config import BOT_TOKEN
from bot_modules.handlers import (
    start_command, shop_command, cart_command, orders_command, help_command,
    handle_message, handle_group_command, shipping_command, support_command,
    cycles_command, gains_command, natty_command
)
from bot_modules.callbacks import handle_callback

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Start the bot"""
    if not BOT_TOKEN:
        logger.error("BOT_TOKEN not found in environment!")
        return
    
    # Create application
    application = Application.builder().token(BOT_TOKEN).build()
    
    # PRIVATE CHAT handlers - multiple aliases for same commands
    # Start/Shop aliases - all lead to shop
    start_aliases = ["start", "buy", "shop", "go", "order", "pizza", "menu", "gear", "juice", "blast"]
    for cmd in start_aliases:
        application.add_handler(CommandHandler(cmd, start_command, filters=filters.ChatType.PRIVATE))
    
    # Cart command
    application.add_handler(CommandHandler("cart", cart_command, filters=filters.ChatType.PRIVATE))
    
    # Orders/History
    application.add_handler(CommandHandler(["orders", "history"], orders_command, filters=filters.ChatType.PRIVATE))
    
    # Help/Support commands
    application.add_handler(CommandHandler("help", help_command, filters=filters.ChatType.PRIVATE))
    application.add_handler(CommandHandler(["support", "contact"], support_command, filters=filters.ChatType.PRIVATE))
    
    # Info commands
    application.add_handler(CommandHandler(["shipping", "delivery"], shipping_command, filters=filters.ChatType.PRIVATE))
    application.add_handler(CommandHandler(["cycles", "stack"], cycles_command, filters=filters.ChatType.PRIVATE))
    application.add_handler(CommandHandler(["gains", "results"], gains_command, filters=filters.ChatType.PRIVATE))
    
    # Fun command
    application.add_handler(CommandHandler(["natty", "natural"], natty_command, filters=filters.ChatType.PRIVATE))
    
    # GROUP/CHANNEL command handler - redirect to DM
    all_commands = start_aliases + ["cart", "orders", "help", "support", "shipping", "cycles", "gains", "natty"]
    application.add_handler(CommandHandler(
        all_commands, 
        handle_group_command, 
        filters=filters.ChatType.GROUPS
    ))
    
    # Callback handler for inline buttons
    application.add_handler(CallbackQueryHandler(handle_callback))
    
    # Message handler ONLY for private chats
    application.add_handler(MessageHandler(
        filters.TEXT & ~filters.COMMAND & filters.ChatType.PRIVATE, 
        handle_message
    ))
    
    # Start bot
    logger.info("🍕💪 AnabolicPizza Bot starting...")
    logger.info("Enhanced with multiple commands and anabolic humor!")
    logger.info("Natty card revocation service: ACTIVE")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
