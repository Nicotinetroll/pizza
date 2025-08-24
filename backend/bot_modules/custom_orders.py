from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from bson import ObjectId
import secrets
import random
from typing import Dict, List, Optional
from .config import MONGODB_URI

mongo_client = AsyncIOMotorClient(MONGODB_URI)
db = mongo_client.telegram_shop

async def generate_custom_order_id() -> int:
    while True:
        order_id = random.randint(1000, 9999)
        existing = await db.custom_orders.find_one({"custom_id": order_id})
        if not existing:
            return order_id

async def create_custom_order(telegram_id: int, username: str, product_text: str, first_name: str = None, last_name: str = None) -> dict:
    user_pending = await db.custom_orders.count_documents({
        "telegram_id": telegram_id,
        "status": "pending"
    })
    
    if user_pending >= 3:
        return {"error": "limit_reached"}
    
    custom_id = await generate_custom_order_id()
    
    order_data = {
        "custom_id": custom_id,
        "telegram_id": telegram_id,
        "username": username,
        "first_name": first_name,
        "last_name": last_name,
        "product_text": product_text,
        "status": "pending",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.custom_orders.insert_one(order_data)
    order_data["_id"] = str(result.inserted_id)
    return order_data

async def get_user_custom_orders(telegram_id: int, limit: int = 10) -> List[dict]:
    orders = await db.custom_orders.find(
        {"telegram_id": telegram_id}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    for order in orders:
        order["_id"] = str(order["_id"])
    
    return orders

async def cancel_custom_order(telegram_id: int, custom_id: int) -> bool:
    result = await db.custom_orders.delete_one({
        "telegram_id": telegram_id,
        "custom_id": custom_id,
        "status": "pending"
    })
    return result.deleted_count > 0

async def cancel_all_pending_orders(telegram_id: int) -> int:
    result = await db.custom_orders.delete_many({
        "telegram_id": telegram_id,
        "status": "pending"
    })
    return result.deleted_count

async def get_all_custom_orders(skip: int = 0, limit: int = 100) -> dict:
    orders = await db.custom_orders.find({}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for order in orders:
        order["_id"] = str(order["_id"])
    
    total = await db.custom_orders.count_documents({})
    unread = await db.custom_orders.count_documents({"status": "pending"})
    
    return {
        "orders": orders,
        "total": total,
        "unread": unread
    }

async def update_custom_order_status(order_id: str, status: str) -> bool:
    if status not in ["pending", "processing", "completed"]:
        return False
        
    result = await db.custom_orders.update_one(
        {"_id": ObjectId(order_id)},
        {
            "$set": {
                "status": status,
                "updated_at": datetime.utcnow()
            }
        }
    )
    return result.modified_count > 0

async def delete_custom_order(order_id: str) -> bool:
    result = await db.custom_orders.delete_one({"_id": ObjectId(order_id)})
    return result.deleted_count > 0

async def bulk_delete_custom_orders(order_ids: List[str]) -> int:
    object_ids = [ObjectId(id) for id in order_ids]
    result = await db.custom_orders.delete_many({"_id": {"$in": object_ids}})
    return result.deleted_count

async def get_pending_count() -> int:
    return await db.custom_orders.count_documents({"status": "pending"})
