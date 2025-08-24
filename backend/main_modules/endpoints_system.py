# DASHBOARD, BOT SETTINGS, NOTIFICATIONS, CHAT AND ADMIN ENDPOINTS

from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import logging
import asyncio

from .config import db, ADMIN_EMAIL
from .models import *
from .helpers import format_price, verify_token
from .websocket import manager, new_message_event, new_message_telegram_id

router_system = APIRouter()
logger = logging.getLogger(__name__)

# ==================== DASHBOARD ENDPOINTS ====================

@router_system.get("/api/dashboard/stats")
async def get_stats():
    total_orders = await db.orders.count_documents({})
    total_users = await db.users.count_documents({})
    total_products = await db.products.count_documents({"is_active": True})
    total_categories = await db.categories.count_documents({"is_active": True})
    
    pipeline = [
        {"$match": {"status": {"$in": ["paid", "completed"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_usdt"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = format_price(revenue_result[0]["total"] if revenue_result else 0)
    
    total_profit = 0
    paid_orders = await db.orders.find({"status": {"$in": ["paid", "completed"]}}).to_list(None)
    
    for order in paid_orders:
        if order.get("items"):
            for item in order["items"]:
                product = await db.products.find_one({"name": item["product_name"]})
                if product:
                    purchase_price = product.get("purchase_price_usdt", 0)
                    selling_price = item.get("price_usdt", 0)
                    item_profit = (selling_price - purchase_price) * item.get("quantity", 1)
                    total_profit += item_profit
    
    active_referrals = await db.referral_codes.count_documents({"is_active": True})
    
    vip_users = await db.users.count_documents({
        "is_vip": True,
        "$or": [
            {"vip_expires": None},
            {"vip_expires": {"$gt": datetime.now(timezone.utc)}}
        ]
    })
    
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_orders = await db.orders.count_documents({
        "created_at": {"$gte": today_start},
        "status": {"$in": ["paid", "completed"]}
    })
    
    today_revenue_result = await db.orders.aggregate([
        {"$match": {"created_at": {"$gte": today_start}, "status": {"$in": ["paid", "completed"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_usdt"}}}
    ]).to_list(1)
    today_revenue = format_price(today_revenue_result[0]["total"] if today_revenue_result else 0)
    
    pending_orders = await db.orders.count_documents({"status": "pending"})
    avg_order_value = format_price(total_revenue / total_orders if total_orders > 0 else 0)
    
    top_products = await db.products.find({"sold_count": {"$gt": 0}}).sort("sold_count", -1).limit(5).to_list(5)
    for product in top_products:
        if "_id" in product:
            product["_id"] = str(product["_id"])
        if "category_id" in product and product["category_id"]:
            product["category_id"] = str(product["category_id"])
        product["price_usdt"] = format_price(product.get("price_usdt", 0))
        product["purchase_price_usdt"] = format_price(product.get("purchase_price_usdt", 0))
        product["sold_count"] = product.get("sold_count", 0)
        product["name"] = product.get("name", "Unknown")
    
    return {
        "stats": {
            "total_orders": total_orders,
            "total_revenue_usdt": total_revenue,
            "total_profit_usdt": format_price(total_profit),
            "profit_margin": format_price((total_profit / total_revenue * 100) if total_revenue > 0 else 0),
            "total_users": total_users,
            "total_products": total_products,
            "total_categories": total_categories,
            "active_referrals": active_referrals,
            "vip_users": vip_users,
            "today_orders": today_orders,
            "today_revenue": today_revenue,
            "pending_orders": pending_orders,
            "avg_order_value": avg_order_value,
            "top_products": top_products
        }
    }

@router_system.get("/api/dashboard/analytics")
async def get_analytics(days: int = 30):
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    pipeline = [
        {
            "$match": {
                "created_at": {"$gte": start_date, "$lte": end_date},
                "status": {"$in": ["paid", "completed"]}
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": "$created_at"
                    }
                },
                "revenue": {"$sum": "$total_usdt"},
                "orders": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    daily_sales = await db.orders.aggregate(pipeline).to_list(None)
    
    for day in daily_sales:
        day_profit = 0
        day_orders = await db.orders.find({
            "created_at": {
                "$gte": datetime.strptime(day["_id"], "%Y-%m-%d"),
                "$lt": datetime.strptime(day["_id"], "%Y-%m-%d") + timedelta(days=1)
            },
            "status": {"$in": ["paid", "completed"]}
        }).to_list(None)
        
        for order in day_orders:
            if order.get("items"):
                for item in order["items"]:
                    product = await db.products.find_one({"name": item["product_name"]})
                    if product:
                        purchase_price = product.get("purchase_price_usdt", 0)
                        selling_price = item.get("price_usdt", 0)
                        item_profit = (selling_price - purchase_price) * item.get("quantity", 1)
                        day_profit += item_profit
        
        day["profit"] = format_price(day_profit)
        day["revenue"] = format_price(day["revenue"])
    
    category_sales = []
    categories = await db.categories.find({"is_active": True}).to_list(None)
    
    for category in categories:
        category_products = await db.products.find({"category_id": category["_id"]}).to_list(None)
        category_revenue = 0
        category_quantity = 0
        
        for product in category_products:
            category_quantity += product.get("sold_count", 0)
            category_revenue += product.get("price_usdt", 0) * product.get("sold_count", 0)
        
        if category_revenue > 0:
            category_sales.append({
                "name": category["name"],
                "emoji": category.get("emoji", "📦"),
                "revenue": format_price(category_revenue),
                "quantity": category_quantity
            })
    
    category_sales.sort(key=lambda x: x["revenue"], reverse=True)
    
    hourly_pipeline = [
        {
            "$match": {
                "created_at": {"$gte": end_date - timedelta(days=7)},
                "status": {"$in": ["paid", "completed"]}
            }
        },
        {
            "$group": {
                "_id": {"$hour": "$created_at"},
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    hourly_distribution = await db.orders.aggregate(hourly_pipeline).to_list(None)
    
    return {
        "daily_sales": daily_sales,
        "category_sales": category_sales[:5],
        "hourly_distribution": hourly_distribution
    }

# ==================== BOT SETTINGS ENDPOINTS ====================

@router_system.get("/api/bot/messages")
async def get_bot_messages(
    category: Optional[str] = None,
    email: str = Depends(verify_token)
):
    """Get all bot messages, optionally filtered by category"""
    query = {}
    if category:
        query["category"] = category
    
    messages = await db.bot_messages.find(query).to_list(1000)
    
    for msg in messages:
        msg["_id"] = str(msg["_id"])
    
    categories = await db.bot_messages.distinct("category")
    
    return {
        "messages": messages,
        "categories": categories,
        "total": len(messages)
    }

@router_system.post("/api/bot/messages")
async def create_bot_message(
    message: BotMessageModel,
    email: str = Depends(verify_token)
):
    """Create a new bot message"""
    existing = await db.bot_messages.find_one({"key": message.key})
    if existing:
        raise HTTPException(status_code=400, detail="Message key already exists")
    
    message_dict = message.model_dump()
    message_dict["created_at"] = datetime.now(timezone.utc)
    message_dict["created_by"] = email
    
    result = await db.bot_messages.insert_one(message_dict)
    
    await db.audit_logs.insert_one({
        "admin_id": email,
        "action": "CREATE_BOT_MESSAGE",
        "entity_type": "bot_message",
        "entity_id": result.inserted_id,
        "details": {"key": message.key},
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"id": str(result.inserted_id), "message": "Bot message created"}

@router_system.put("/api/bot/messages/{message_id}")
async def update_bot_message(
    message_id: str,
    message: BotMessageModel,
    email: str = Depends(verify_token)
):
    """Update a bot message"""
    message_dict = message.model_dump()
    message_dict["updated_at"] = datetime.now(timezone.utc)
    message_dict["updated_by"] = email
    
    result = await db.bot_messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": message_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return {"message": "Bot message updated"}

@router_system.delete("/api/bot/messages/{message_id}")
async def delete_bot_message(
    message_id: str,
    email: str = Depends(verify_token)
):
    """Delete a bot message"""
    result = await db.bot_messages.delete_one({"_id": ObjectId(message_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return {"message": "Bot message deleted"}

@router_system.post("/api/bot/messages/bulk-update")
async def bulk_update_messages(
    updates: List[Dict[str, Any]],
    email: str = Depends(verify_token)
):
    """Bulk update multiple messages"""
    updated_count = 0
    
    for update in updates:
        if "_id" in update:
            message_id = update.pop("_id")
            update["updated_at"] = datetime.now(timezone.utc)
            update["updated_by"] = email
            
            result = await db.bot_messages.update_one(
                {"_id": ObjectId(message_id)},
                {"$set": update}
            )
            updated_count += result.modified_count
    
    return {"message": f"Updated {updated_count} messages"}

@router_system.get("/api/bot/commands")
async def get_bot_commands(email: str = Depends(verify_token)):
    """Get all bot commands"""
    commands = await db.bot_commands.find({}).to_list(100)
    
    for cmd in commands:
        cmd["_id"] = str(cmd["_id"])
    
    return {"commands": commands, "total": len(commands)}

@router_system.post("/api/bot/commands")
async def create_bot_command(
    command: BotCommandModel,
    email: str = Depends(verify_token)
):
    """Create a new bot command"""
    existing = await db.bot_commands.find_one({"command": command.command})
    if existing:
        raise HTTPException(status_code=400, detail="Command already exists")
    
    command_dict = command.model_dump()
    command_dict["created_at"] = datetime.now(timezone.utc)
    command_dict["created_by"] = email
    
    result = await db.bot_commands.insert_one(command_dict)
    
    return {"id": str(result.inserted_id), "message": "Bot command created"}

@router_system.put("/api/bot/commands/{command_id}")
async def update_bot_command(
    command_id: str,
    command: BotCommandModel,
    email: str = Depends(verify_token)
):
    """Update a bot command"""
    command_dict = command.model_dump()
    command_dict["updated_at"] = datetime.now(timezone.utc)
    command_dict["updated_by"] = email
    
    result = await db.bot_commands.update_one(
        {"_id": ObjectId(command_id)},
        {"$set": command_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Command not found")
    
    return {"message": "Bot command updated"}

@router_system.delete("/api/bot/commands/{command_id}")
async def delete_bot_command(
    command_id: str,
    email: str = Depends(verify_token)
):
    """Delete a bot command"""
    result = await db.bot_commands.delete_one({"_id": ObjectId(command_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Command not found")
    
    return {"message": "Bot command deleted"}

@router_system.get("/api/bot/settings")
async def get_bot_settings(email: str = Depends(verify_token)):
    """Get general bot settings"""
    settings = await db.bot_settings.find_one({"_id": "main"})
    
    if not settings:
        default_settings = BotSettingsModel().model_dump()
        default_settings["_id"] = "main"
        await db.bot_settings.insert_one(default_settings)
        settings = default_settings
    
    settings.pop("_id", None)
    return settings

@router_system.put("/api/bot/settings")
async def update_bot_settings(
    settings: BotSettingsModel,
    email: str = Depends(verify_token)
):
    """Update general bot settings"""
    settings_dict = settings.model_dump()
    settings_dict["updated_at"] = datetime.now(timezone.utc)
    settings_dict["updated_by"] = email
    
    await db.bot_settings.update_one(
        {"_id": "main"},
        {"$set": settings_dict},
        upsert=True
    )
    
    return {"message": "Bot settings updated"}

@router_system.post("/api/bot/initialize-messages")
async def initialize_bot_messages(email: str = Depends(verify_token)):
    """Initialize database with default bot messages from config"""
    from bot_modules.config import MESSAGES
    
    initialized = 0
    
    for key, message in MESSAGES.items():
        existing = await db.bot_messages.find_one({"key": key})
        if not existing:
            await db.bot_messages.insert_one({
                "key": key,
                "message": message,
                "category": "main",
                "enabled": True,
                "created_at": datetime.now(timezone.utc),
                "created_by": email
            })
            initialized += 1
    
    default_commands = [
        {
            "command": "/start",
            "description": "Start the bot",
            "response": MESSAGES.get("welcome", "Welcome!"),
            "aliases": ["/buy", "/shop", "/go", "/order", "/pizza", "/menu", "/gear", "/juice", "/blast"],
            "enabled": True
        },
        {
            "command": "/help",
            "description": "Show help menu",
            "response": MESSAGES.get("help", "Help menu"),
            "aliases": [],
            "enabled": True
        },
        {
            "command": "/cart",
            "description": "View shopping cart",
            "response": "Here's your shopping cart:",
            "aliases": [],
            "enabled": True
        },
        {
            "command": "/orders",
            "description": "View order history",
            "response": "Your order history:",
            "aliases": ["/history"],
            "enabled": True
        }
    ]
    
    for cmd_data in default_commands:
        existing = await db.bot_commands.find_one({"command": cmd_data["command"]})
        if not existing:
            cmd_data["created_at"] = datetime.now(timezone.utc)
            cmd_data["created_by"] = email
            await db.bot_commands.insert_one(cmd_data)
            initialized += 1
    
    return {"message": f"Initialized {initialized} messages and commands"}

@router_system.post("/api/bot/restart")
async def restart_bot(email: str = Depends(verify_token)):
    """Restart the bot to apply changes"""
    await db.audit_logs.insert_one({
        "admin_id": email,
        "action": "RESTART_BOT",
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"message": "Bot restart initiated"}

# ==================== NOTIFICATION ENDPOINTS ====================

@router_system.get("/api/notifications/settings")
async def get_notification_settings(email: str = Depends(verify_token)):
    settings = await db.notification_settings.find_one({"_id": "main"})
    if not settings:
        settings = {
            "_id": "main",
            "enabled": False,
            "channel_id": None,
            "delay_min": 60,
            "delay_max": 300,
            "show_exact_amount": False,
            "fake_orders_enabled": False,
            "fake_orders_per_hour": 2,
            "message_templates": []
        }
    else:
        settings["_id"] = "main"
    return settings

@router_system.put("/api/notifications/settings")
async def update_notification_settings(
    settings: NotificationSettingsModel,
    email: str = Depends(verify_token)
):
    settings_dict = settings.model_dump()
    settings_dict["updated_at"] = datetime.now(timezone.utc)
    settings_dict["updated_by"] = email
    
    await db.notification_settings.update_one(
        {"_id": "main"},
        {"$set": settings_dict},
        upsert=True
    )
    
    return {"message": "Settings updated successfully"}

@router_system.post("/api/notifications/templates")
async def add_message_template(
    template: MessageTemplateModel,
    email: str = Depends(verify_token)
):
    template_dict = template.model_dump()
    template_dict["created_at"] = datetime.now(timezone.utc)
    
    await db.notification_settings.update_one(
        {"_id": "main"},
        {"$push": {"message_templates": template_dict}},
        upsert=True
    )
    
    return {"message": "Template added successfully"}

@router_system.delete("/api/notifications/templates/{index}")
async def delete_message_template(
    index: int,
    email: str = Depends(verify_token)
):
    settings = await db.notification_settings.find_one({"_id": "main"})
    if settings and settings.get("message_templates"):
        templates = settings["message_templates"]
        if 0 <= index < len(templates):
            templates.pop(index)
            await db.notification_settings.update_one(
                {"_id": "main"},
                {"$set": {"message_templates": templates}}
            )
            return {"message": "Template deleted"}
    
    raise HTTPException(status_code=404, detail="Template not found")

@router_system.post("/api/notifications/test")
async def send_test_notification(email: str = Depends(verify_token)):
    from bot_modules.public_notifications import public_notifier
    
    test_order = {
        "delivery_country": "Slovakia",
        "total_usdt": 150,
        "_id": "test_order",
        "order_number": "TEST-001"
    }
    
    success = await public_notifier.send_notification(test_order)
    
    if success:
        return {"message": "Test notification sent successfully"}
    else:
        raise HTTPException(status_code=400, detail="Failed to send notification")

@router_system.post("/api/notifications/fake-order")
async def send_fake_order_manual(email: str = Depends(verify_token)):
    from bot_modules.public_notifications import public_notifier
    
    success = await public_notifier.send_fake_order()
    
    if success:
        return {"message": "Fake order sent successfully"}
    else:
        raise HTTPException(status_code=400, detail="Failed to send fake order")

@router_system.get("/api/notifications/logs")
async def get_notification_logs(
    limit: int = 50,
    email: str = Depends(verify_token)
):
    logs = await db.notification_logs.find({}).sort("sent_at", -1).limit(limit).to_list(limit)
    
    for log in logs:
        if "_id" in log:
            log["_id"] = str(log["_id"])
        if "order_id" in log and log["order_id"]:
            try:
                log["order_id"] = str(log["order_id"])
            except:
                pass
    
    return {"logs": logs, "total": len(logs)}

@router_system.get("/api/custom-orders")
async def get_custom_orders(
    skip: int = 0,
    limit: int = 100,
    email: str = Depends(verify_token)
):
    from bot_modules.custom_orders import get_all_custom_orders
    return await get_all_custom_orders(skip, limit)

@router_system.patch("/api/custom-orders/{order_id}/status")
async def update_custom_order_status(
    order_id: str,
    status_data: dict,
    email: str = Depends(verify_token)
):
    from bot_modules.custom_orders import update_custom_order_status
    status = status_data.get("status")
    if not status:
        raise HTTPException(status_code=400, detail="Status required")
    
    success = await update_custom_order_status(order_id, status)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update status")
    
    return {"success": True, "message": "Status updated"}

@router_system.delete("/api/custom-orders/{order_id}")
async def delete_custom_order(
    order_id: str,
    email: str = Depends(verify_token)
):
    from bot_modules.custom_orders import delete_custom_order
    success = await delete_custom_order(order_id)
    if not success:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Order deleted"}

@router_system.post("/api/custom-orders/bulk-delete")
async def bulk_delete_custom_orders(
    data: dict,
    email: str = Depends(verify_token)
):
    from bot_modules.custom_orders import bulk_delete_custom_orders
    order_ids = data.get("order_ids", [])
    if not order_ids:
        raise HTTPException(status_code=400, detail="No orders selected")
    
    deleted = await bulk_delete_custom_orders(order_ids)
    return {"message": f"Deleted {deleted} orders"}

@router_system.get("/api/custom-orders/unread-count")
async def get_unread_custom_orders(email: str = Depends(verify_token)):
    from bot_modules.custom_orders import get_pending_count
    count = await get_pending_count()
    return {"count": count}
