import logging
import asyncio
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters
from telegram import Update

from bot_modules.config import BOT_TOKEN
from bot_modules.message_loader import message_loader
from bot_modules.handlers import (
    handle_message, handle_group_command, handle_dynamic_command,
    start_command, shop_command, cart_command, orders_command, help_command,
    request_command, closerequest_command, requests_command, clear_command
)
from bot_modules.callbacks import handle_callback

# Import the message updater for smooth animations
try:
    from bot_modules.message_updater import cleanup_old_messages
    ANIMATION_SUPPORT = True
except ImportError:
    ANIMATION_SUPPORT = False
    cleanup_old_messages = None

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def start_background_tasks():
    """Start background tasks for the bot"""
    if ANIMATION_SUPPORT and cleanup_old_messages:
        asyncio.create_task(cleanup_old_messages())
        logger.info("✅ Started message cleanup background task for smooth animations")

async def register_dynamic_commands(application):
    try:
        commands = await message_loader.load_commands()
        
        logger.info(f"Loading {len(commands)} commands from database...")
        
        registered_commands = set()
        registered_group_commands = set()
        
        core_commands = {
            '/start': start_command,
            '/shop': shop_command,
            '/cart': cart_command,
            '/orders': orders_command,
            '/help': help_command,
            '/clear': clear_command,
            '/request': request_command,
            '/closerequest': closerequest_command,
            '/requests': requests_command
        }
        
        for command, data in commands.items():
            command_name = command.replace('/', '')
            
            if command_name in registered_commands:
                continue
            
            if not data.get('enabled', True):
                logger.info(f"Skipping disabled command: /{command_name}")
                continue
            
            if command in core_commands:
                handler = core_commands[command]
                logger.info(f"Using specific handler for core command: {command}")
            else:
                handler = handle_dynamic_command
            
            private_only = data.get('private_only', True)
            group_redirect = data.get('group_redirect', True)
            
            logger.info(f"Registering /{command_name}: private_only={private_only}, group_redirect={group_redirect}")
            
            if private_only:
                application.add_handler(CommandHandler(
                    command_name, 
                    handler, 
                    filters=filters.ChatType.PRIVATE
                ))
                registered_commands.add(command_name)
                logger.info(f"  ✓ Registered /{command_name} for PRIVATE chats")
                
                if group_redirect:
                    application.add_handler(CommandHandler(
                        command_name,
                        handle_group_command,
                        filters=filters.ChatType.GROUPS
                    ))
                    registered_group_commands.add(command_name)
                    logger.info(f"  ✓ Added GROUP redirect for /{command_name}")
            else:
                application.add_handler(CommandHandler(
                    command_name,
                    handler
                ))
                registered_commands.add(command_name)
                logger.info(f"  ✓ Registered /{command_name} for ALL chat types")
            
            for alias in data.get('aliases', []):
                alias_name = alias.replace('/', '')
                if alias_name not in registered_commands:
                    alias_handler = core_commands.get(alias, handle_dynamic_command)
                    
                    if private_only:
                        application.add_handler(CommandHandler(
                            alias_name, 
                            alias_handler, 
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
                            alias_handler
                        ))
                    registered_commands.add(alias_name)
                    logger.info(f"    └─ Alias /{alias_name}")
        
        clear_handler = CommandHandler(
            "clear",
            clear_command,
            filters=filters.ChatType.PRIVATE
        )
        application.add_handler(clear_handler)
        
        request_handler = CommandHandler(
            "request",
            request_command
        )
        application.add_handler(request_handler)
        
        closerequest_handler = CommandHandler(
            "closerequest",
            closerequest_command
        )
        application.add_handler(closerequest_handler)
        
        requests_handler = CommandHandler(
            "requests",
            requests_command,
            filters=filters.ChatType.PRIVATE
        )
        application.add_handler(requests_handler)
        
        logger.info(f"✅ Registration complete: {len(registered_commands) + 4} commands")
        return True
        
    except Exception as e:
        logger.error(f"Error registering dynamic commands: {e}")
        import traceback
        traceback.print_exc()
        return False

def register_fallback_commands(application):
    logger.warning("⚠️ Using fallback commands - database unavailable")
    
    application.add_handler(CommandHandler(
        "start", 
        start_command,
        filters=filters.ChatType.PRIVATE
    ))
    
    application.add_handler(CommandHandler(
        "help", 
        help_command,
        filters=filters.ChatType.PRIVATE
    ))
    
    application.add_handler(CommandHandler(
        "clear",
        clear_command,
        filters=filters.ChatType.PRIVATE
    ))
    
    application.add_handler(CommandHandler(
        "request",
        request_command
    ))
    
    application.add_handler(CommandHandler(
        "closerequest",
        closerequest_command
    ))
    
    application.add_handler(CommandHandler(
        "requests",
        requests_command,
        filters=filters.ChatType.PRIVATE
    ))
    
    logger.info("Registered 6 fallback commands (/start, /help, /clear, /request, /closerequest, /requests)")

async def post_init(application):
    try:
        logger.info("🔄 Loading configuration from database...")
        
        await message_loader.reload_all()
        
        success = await register_dynamic_commands(application)
        
        if success:
            logger.info("✅ Successfully loaded commands from database")
        else:
            logger.warning("⚠️ Failed to load commands, using minimal fallback")
            register_fallback_commands(application)
        
        # Start background tasks for smooth animations
        await start_background_tasks()
        
        settings = await message_loader.load_settings()
        if settings.get('maintenance_mode'):
            logger.warning(f"⚠️ MAINTENANCE MODE: {settings.get('maintenance_message')}")
        
        # Initialize payment gateway if available
        try:
            import os
            from dotenv import load_dotenv
            load_dotenv()
            
            api_key = os.getenv("NOWPAYMENTS_API_KEY")
            ipn_secret = os.getenv("NOWPAYMENTS_IPN_SECRET")
            sandbox = os.getenv("NOWPAYMENTS_SANDBOX", "true").lower() == "true"
            
            if api_key and api_key not in ["", "demo_key_123456", "demo_mode"]:
                from nowpayments_gateway import initialize_payment_gateway
                initialize_payment_gateway(api_key, ipn_secret, sandbox)
                logger.info(f"✅ NOWPayments gateway initialized (sandbox={sandbox})")
                logger.info("💫 Smooth payment animations enabled!")
            else:
                logger.warning("⚠️ NOWPayments API key not configured - demo mode active")
        except Exception as e:
            logger.warning(f"⚠️ Payment gateway initialization skipped: {e}")
        
        logger.info("✅ Bot initialization complete!")
        
    except Exception as e:
        logger.error(f"❌ Initialization error: {e}")
        register_fallback_commands(application)

async def reload_bot_config():
    try:
        logger.info("🔄 Reloading configuration...")
        await message_loader.reload_all()
        logger.info("✅ Configuration reloaded")
        return True
    except Exception as e:
        logger.error(f"❌ Reload error: {e}")
        return False

def main():
    if not BOT_TOKEN:
        logger.error("❌ BOT_TOKEN not found!")
        return
    
    try:
        logger.info("🚀 Creating bot application...")
        application = Application.builder().token(BOT_TOKEN).build()
        
        application.post_init = post_init
        
        application.add_handler(CallbackQueryHandler(handle_callback))
        
        application.add_handler(MessageHandler(
            filters.TEXT & ~filters.COMMAND & filters.ChatType.PRIVATE, 
            handle_message
        ))
        
        job_queue = application.job_queue
        if job_queue:
            async def reload_job(context):
                await reload_bot_config()
            
            job_queue.run_repeating(
                reload_job,
                interval=300,
                first=300,
                name='reload_config'
            )
            logger.info("📅 Auto-reload scheduled every 5 minutes")
        
        logger.info("="*60)
        logger.info("🍕💪 AnabolicPizza Bot - WITH SMOOTH ANIMATIONS")
        logger.info("🔧 Dynamic Loading + Clear Chat + Product Requests")
        logger.info("💫 Smooth payment status animations enabled!")
        logger.info("✅ Buttons will work after restart!")
        logger.info("🧹 /clear command enabled")
        logger.info("📝 /request, /closerequest, /requests enabled")
        logger.info("🔄 Auto-reload: 5 minutes")
        if ANIMATION_SUPPORT:
            logger.info("🎬 Animation support: ACTIVE")
        else:
            logger.info("⚠️  Animation support: NOT INSTALLED")
        logger.info("="*60)
        
        application.run_polling(
            allowed_updates=Update.ALL_TYPES,
            drop_pending_updates=True
        )
        
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        from bot_modules.config import MONGODB_URI
        
        async def test_db():
            try:
                client = AsyncIOMotorClient(MONGODB_URI)
                await client.server_info()
                logger.info("✅ Database connected")
                
                db = client.telegram_shop
                commands = await db.bot_commands.find({}).to_list(100)
                logger.info(f"📋 Found {len(commands)} commands in database")
                
                # Check for payment records collection
                collections = await db.list_collection_names()
                if "payment_records" in collections:
                    logger.info("💳 Payment records collection found")
                
                return True
            except Exception as e:
                logger.error(f"❌ Database error: {e}")
                return False
        
        db_ok = loop.run_until_complete(test_db())
        
        if not db_ok:
            logger.error("Cannot start without database!")
            exit(1)
            
        main()
        
    except KeyboardInterrupt:
        logger.info("🛑 Stopped by user")
    except Exception as e:
        logger.error(f"❌ Error: {e}")
    finally:
        loop.close()
        logger.info("👋 Shutdown complete")