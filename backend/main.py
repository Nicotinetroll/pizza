
from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

from contextlib import asynccontextmanager

import asyncio

import logging



# Import all routers from main_modules

from main_modules.endpoints_auth_categories import router_auth_categories

from main_modules.endpoints_products_orders import router_products_orders

from main_modules.endpoints_users_sellers import router_users_sellers

from main_modules.endpoints_system import router_system

from main_modules.endpoints_chat_admin import router_chat_admin

from main_modules.helpers import setup_chat_indexes



logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)



# Lifespan event handler

@asynccontextmanager

async def lifespan(app: FastAPI):

    # Startup

    from bot_modules.public_notifications import fake_order_scheduler

    asyncio.create_task(fake_order_scheduler())

    logger.info("Started fake order scheduler")

    

    # Setup chat indexes

    await setup_chat_indexes()

    logger.info("Chat system initialized")

    

    yield

    # Shutdown

    logger.info("Shutting down...")



app = FastAPI(

    title="AnabolicPizza API - Enhanced with Notifications",

    lifespan=lifespan

)



app.add_middleware(

    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)



# Include all routers

app.include_router(router_auth_categories)

app.include_router(router_products_orders)

app.include_router(router_users_sellers)

app.include_router(router_system)

app.include_router(router_chat_admin)



# Root endpoint

@app.get("/")

async def root():

    return {

        "status": "AnabolicPizza API", 

        "version": "5.0", 

        "features": ["categories", "referrals", "vip", "profit_tracking", "notifications"]

    }



if __name__ == "__main__":

    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

