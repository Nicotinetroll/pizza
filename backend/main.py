from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import logging
import os
from dotenv import load_dotenv

from main_modules.endpoints_auth_categories import router_auth_categories
from main_modules.endpoints_products_orders import router_products_orders
from main_modules.endpoints_users_sellers import router_users_sellers
from main_modules.endpoints_system import router_system
from main_modules.endpoints_chat_admin import router_chat_admin
from main_modules.endpoints_notification_media import router_notification_media
from main_modules.helpers import setup_chat_indexes
from main_modules import endpoints_payouts
from main_modules.endpoints_notifications import router as router_notifications
from main_modules.endpoints_tickets import router_tickets

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        api_key = os.getenv("NOWPAYMENTS_API_KEY")
        ipn_secret = os.getenv("NOWPAYMENTS_IPN_SECRET")
        sandbox = os.getenv("NOWPAYMENTS_SANDBOX", "true").lower() == "true"
        
        if api_key:
            import sys
            import os as os_module
            sys.path.insert(0, os_module.path.dirname(os_module.path.abspath(__file__)))
            
            from nowpayments_gateway import initialize_payment_gateway
            initialize_payment_gateway(api_key, ipn_secret, sandbox)
            logger.info(f"✅ NOWPayments gateway initialized (sandbox={sandbox})")
        else:
            logger.warning("⚠️ NOWPayments API key not configured - payments will use demo mode")
        
        from bot_modules.public_notifications import fake_order_scheduler
        asyncio.create_task(fake_order_scheduler())
        logger.info("Started fake order scheduler")
        
        await setup_chat_indexes()
        logger.info("Chat system initialized")
        
    except Exception as e:
        logger.error(f"Startup error: {e}")
        import traceback
        traceback.print_exc()
    
    yield
    logger.info("Shutting down...")

app = FastAPI(
    title="AnabolicPizza API - Enhanced with NOWPayments",
    version="6.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router_auth_categories)
app.include_router(router_products_orders)
app.include_router(router_users_sellers)
app.include_router(router_system)
app.include_router(router_chat_admin)
app.include_router(router_notification_media)
app.include_router(endpoints_payouts.router)
app.include_router(router_notifications)
app.include_router(router_tickets)


try:
    from main_modules.endpoints_payments import router_payments
    app.include_router(router_payments)
    logger.info("Payment endpoints loaded")
except ImportError:
    logger.warning("Payment endpoints not found - payments will use fallback")

@app.get("/")
async def root():
    payment_status = "not_configured"
    try:
        import sys
        import os as os_module
        sys.path.insert(0, os_module.path.dirname(os_module.path.abspath(__file__)))
        from nowpayments_gateway import payment_gateway
        if payment_gateway:
            payment_status = "configured"
    except:
        pass
    
    return {
        "status": "AnabolicPizza API", 
        "version": "6.0", 
        "features": [
            "categories", 
            "referrals", 
            "vip", 
            "profit_tracking", 
            "notifications",
            "nowpayments",
            "media_upload"
        ],
        "payment_gateway": payment_status
    }

@app.get("/health")
async def health_check():
    payment_configured = False
    try:
        import sys
        import os as os_module
        sys.path.insert(0, os_module.path.dirname(os_module.path.abspath(__file__)))
        from nowpayments_gateway import payment_gateway
        if payment_gateway:
            payment_configured = True
    except:
        pass
    
    return {
        "status": "healthy",
        "payment_gateway": "active" if payment_configured else "not_configured"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
