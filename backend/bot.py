"""
AnabolicPizza Bot - Main entry point
Enhanced with dynamic message loading from database and scope control
"""

import logging
import asyncio
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters
from telegram import Update

from bot_modules.config import BOT_TOKEN
from bot_modules.message_loader import message_loader
from bot_modules.handlers import (
    start_command, shop_command, cart_command, orders_command, help_command,
    handle_message, handle_group_command, shipping_command, support_command,
    cycles_command, gains_command, natty_command, handle_dynamic_command
)
from bot_modules.callbacks import handle_callback

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def register_dynamic_commands(application):
    """Register commands from database dynamically with scope control"""
    try:
        # Load commands from database
        commands = await message_loader.load_commands()
        
        logger.info(f"Loading {len(commands)} commands from database...")
        
        # Track registered commands to avoid duplicates
        registered_commands = set()
        registered_group_commands = set()
        
        for command, data in commands.items():
            command_name = command.replace('/', '')
            
            # Skip if already registered
            if command_name in registered_commands:
                continue
            
            # Check if command is enabled
            if not data.get('enabled', True):
                logger.info(f"Skipping disabled command: /{command_name}")
                continue
                
            # Determine which handler to use based on command
            if command_name in ['start', 'buy', 'shop', 'go', 'order', 'pizza', 'menu', 'gear', 'juice', 'blast']:
                handler = start_command
            elif command_name == 'cart':
                handler = cart_command
            elif command_name in ['orders', 'history']:
                handler = orders_command
            elif command_name == 'help':
                handler = help_command
            elif command_name in ['support', 'contact']:
                handler = support_command
            elif command_name in ['shipping', 'delivery']:
                handler = shipping_command
            elif command_name in ['cycles', 'stack']:
                handler = cycles_command
            elif command_name in ['gains', 'results']:
                handler = gains_command
            elif command_name in ['natty', 'natural']:
                handler = natty_command
            else:
                # Use dynamic handler for custom commands
                handler = handle_dynamic_command
            
            # Check scope settings
            private_only = data.get('private_only', True)
            group_redirect = data.get('group_redirect', True)
            
            if private_only:
                # Register for private chat only
                application.add_handler(CommandHandler(
                    command_name, 
                    handler, 
                    filters=filters.ChatType.PRIVATE
                ))
                registered_commands.add(command_name)
                logger.info(f"Registered /{command_name} for PRIVATE chats only")
                
                # If group_redirect is enabled, add group handler that redirects
                if group_redirect:
                    application.add_handler(CommandHandler(
                        command_name,
                        handle_group_command,  # This handler redirects to DM
                        filters=filters.ChatType.GROUPS
                    ))
                    registered_group_commands.add(command_name)
                    logger.info(f"  └─ Added GROUP redirect for /{command_name}")
            else:
                # Register for all chat types (no filter)
                application.add_handler(CommandHandler(
                    command_name,
                    handler
                    # No filter = works everywhere
                ))
                registered_commands.add(command_name)
                logger.info(f"Registered /{command_name} for ALL chat types")
            
            # Register aliases with same scope
            for alias in data.get('aliases', []):
                alias_name = alias.replace('/', '')
                if alias_name not in registered_commands:
                    if private_only:
                        application.add_handler(CommandHandler(
                            alias_name, 
                            handler, 
                            filters=filters.ChatType.PRIVATE
                        ))
                        if group_redirect:
                            application.add_handler(CommandHandler(
                                alias_name,
                                handle_group_command,
                                filters=filters.ChatType.GROUPS
                            ))
                            registered_group_commands.add(alias_name)
                    else:
                        application.add_handler(CommandHandler(
                            alias_name, 
                            handler
                        ))
                    registered_commands.add(alias_name)
                    logger.info(f"  └─ Registered alias: /{alias_name}")
        
        logger.info(f"✅ Registered {len(registered_commands)} commands")
        logger.info(f"   └─ Private only: {len(registered_commands) - len(registered_group_commands)}")
        logger.info(f"   └─ With group redirect: {len(registered_group_commands)}")
            
        return True
        
    except Exception as e:
        logger.error(f"Error registering dynamic commands: {e}")
        # Fall back to default commands
        return False

def register_static_commands(application):
    """Register static/default commands as fallback"""
    logger.info("Registering static commands as fallback...")
    
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
    
    logger.info(f"Registered {len(all_commands)} static commands")

async def post_init(application):
    """Initialize bot after creation - load messages and commands"""
    try:
        logger.info("🔄 Loading messages and settings from database...")
        
        # Load all data from database
        await message_loader.reload_all()
        
        # Try to register dynamic commands
        success = await register_dynamic_commands(application)
        
        if success:
            logger.info("✅ Successfully loaded dynamic commands from database")
        else:
            logger.warning("⚠️ Failed to load dynamic commands, using static fallback")
            register_static_commands(application)
            
        # Check if maintenance mode is enabled
        settings = await message_loader.load_settings()
        if settings.get('maintenance_mode'):
            logger.warning("⚠️ Bot is in MAINTENANCE MODE")
            logger.warning(f"   Maintenance message: {settings.get('maintenance_message')}")
            
        logger.info("✅ Bot initialization complete!")
        
    except Exception as e:
        logger.error(f"❌ Error during bot initialization: {e}")
        # Use static commands as fallback
        register_static_commands(application)

async def reload_bot_config():
    """Reload bot configuration from database (can be called during runtime)"""
    try:
        logger.info("🔄 Reloading bot configuration...")
        await message_loader.reload_all()
        
        # Re-register commands if needed
        # Note: This would require clearing existing handlers and re-adding them
        # which is complex with python-telegram-bot
        
        logger.info("✅ Bot configuration reloaded successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Error reloading bot configuration: {e}")
        return False

def main():
    """Start the bot with dynamic configuration"""
    if not BOT_TOKEN:
        logger.error("❌ BOT_TOKEN not found in environment!")
        return
    
    try:
        # Create application
        logger.info("🚀 Creating bot application...")
        application = Application.builder().token(BOT_TOKEN).build()
        
        # Set post_init to load dynamic configuration
        application.post_init = post_init
        
        # Add callback handler for inline buttons
        application.add_handler(CallbackQueryHandler(handle_callback))
        
        # Message handler ONLY for private chats
        application.add_handler(MessageHandler(
            filters.TEXT & ~filters.COMMAND & filters.ChatType.PRIVATE, 
            handle_message
        ))
        
        # Add job to periodically reload configuration (every 5 minutes)
        job_queue = application.job_queue
        if job_queue:
            async def reload_job(context):
                await reload_bot_config()
            
            # Schedule reload every 5 minutes
            job_queue.run_repeating(
                reload_job,
                interval=300,  # 5 minutes
                first=300,     # First run after 5 minutes
                name='reload_config'
            )
            logger.info("📅 Scheduled configuration reload every 5 minutes")
        else:
            logger.warning("⚠️ JobQueue not available - install with: pip install 'python-telegram-bot[job-queue]'")
        
        # Start bot
        logger.info("="*50)
        logger.info("🍕💪 AnabolicPizza Bot starting...")
        logger.info("🔧 Dynamic message loading: ENABLED")
        logger.info("🔄 Auto-reload: Every 5 minutes")
        logger.info("💾 Database: Connected")
        logger.info("🎯 Scope control: ENABLED")
        logger.info("🚀 Ready to serve anabolic pizzas!")
        logger.info("="*50)
        
        # Run bot
        application.run_polling(
            allowed_updates=Update.ALL_TYPES,
            drop_pending_updates=True  # Ignore messages sent while bot was offline
        )
        
    except Exception as e:
        logger.error(f"❌ Fatal error starting bot: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Run async initialization
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        # Test database connection before starting
        from motor.motor_asyncio import AsyncIOMotorClient
        from bot_modules.config import MONGODB_URI
        
        async def test_db():
            try:
                client = AsyncIOMotorClient(MONGODB_URI)
                await client.server_info()
                logger.info("✅ Database connection successful")
                
                # Also test if we can read from collections
                db = client.telegram_shop
                test_read = await db.bot_messages.find_one()
                logger.info("✅ Database read test successful")
                
                return True
            except Exception as e:
                logger.error(f"❌ Database connection failed: {e}")
                return False
        
        # Test DB connection
        db_ok = loop.run_until_complete(test_db())
        
        if not db_ok:
            logger.error("Cannot start bot without database connection!")
            logger.info("Please check:")
            logger.info("  1. MongoDB is running")
            logger.info("  2. MONGODB_URI is correct in .env")
            logger.info("  3. Database 'telegram_shop' exists")
            exit(1)
            
        # Start the bot
        main()
        
    except KeyboardInterrupt:
        logger.info("🛑 Bot stopped by user")
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        loop.close()
        logger.info("👋 Bot shutdown complete")
