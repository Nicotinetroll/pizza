"""
Database operations and models
"""
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from bson import ObjectId
import secrets
from typing import Dict, List, Optional
from .config import MONGODB_URI

# Database connection
mongo_client = AsyncIOMotorClient(MONGODB_URI)
db = mongo_client.telegram_shop

async def generate_order_number() -> str:
    """Generate random order number"""
    part1 = secrets.token_hex(2).upper()
    part2 = secrets.token_hex(2).upper()
    return f"APZ-{part1}-{part2}"

async def create_or_update_user(user_data: dict) -> dict:
    """Create or update user in database"""
    result = await db.users.update_one(
        {"telegram_id": user_data["telegram_id"]},
        {
            "$set": {
                "username": user_data.get("username"),
                "first_name": user_data.get("first_name"),
                "last_name": user_data.get("last_name"),
                "last_active": datetime.utcnow()
            },
            "$setOnInsert": {
                "created_at": datetime.utcnow(),
                "telegram_id": user_data["telegram_id"],
                "total_orders": 0,
                "total_spent_usdt": 0,
                "status": "active"
            }
        },
        upsert=True
    )
    return result

async def get_active_products(limit: int = 20) -> List[dict]:
    """Get active products from database"""
    return await db.products.find({"is_active": True}).limit(limit).to_list(limit)

async def get_product_by_id(product_id: str) -> Optional[dict]:
    """Get product by ID"""
    try:
        return await db.products.find_one({"_id": ObjectId(product_id)})
    except:
        return None

async def get_user_orders(telegram_id: int, limit: int = 10) -> List[dict]:
    """Get user orders"""
    return await db.orders.find(
        {"telegram_id": telegram_id}
    ).sort("created_at", -1).limit(limit).to_list(limit)

async def create_order(order_data: dict) -> str:
    """Create new order"""
    order_data["created_at"] = datetime.utcnow()
    order_data["order_number"] = await generate_order_number()
    result = await db.orders.insert_one(order_data)
    return str(result.inserted_id)

async def update_order_payment(order_id: str, payment_data: dict) -> bool:
    """Update order payment status"""
    try:
        result = await db.orders.update_one(
            {"_id": ObjectId(order_id)},
            {
                "$set": {
                    "status": "paid",
                    "paid_at": datetime.utcnow(),
                    "payment.status": "confirmed",
                    "payment.transaction_id": payment_data.get("transaction_id", "DEMO_" + secrets.token_hex(16))
                }
            }
        )
        
        # Update product sold counts
        if result.modified_count > 0:
            order = await db.orders.find_one({"_id": ObjectId(order_id)})
            if order and order.get("items"):
                for item in order["items"]:
                    await db.products.update_one(
                        {"name": item["product_name"]},
                        {"$inc": {"sold_count": item.get("quantity", 1)}}
                    )
        
        return result.modified_count > 0
    except Exception as e:
        print(f"Error updating payment: {e}")
        return False

async def get_order_by_id(order_id: str) -> Optional[dict]:
    """Get order by ID"""
    try:
        return await db.orders.find_one({"_id": ObjectId(order_id)})
    except:
        return None
