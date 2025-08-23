# CHAT, NOTIFICATIONS AND ADMIN ENDPOINTS

from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional, List
import logging
import asyncio

from .config import db, ADMIN_EMAIL
from .models import *
from .helpers import verify_token
from .websocket import manager, new_message_event, new_message_telegram_id

router_chat_admin = APIRouter()
logger = logging.getLogger(__name__)

# ==================== NOTIFICATION ENDPOINTS (continued) ====================

@router_chat_admin.get("/api/notifications/settings")
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

@router_chat_admin.put("/api/notifications/settings")
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

@router_chat_admin.post("/api/notifications/templates")
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

@router_chat_admin.delete("/api/notifications/templates/{index}")
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

@router_chat_admin.post("/api/notifications/test")
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

@router_chat_admin.post("/api/notifications/fake-order")
async def send_fake_order_manual(email: str = Depends(verify_token)):
    from bot_modules.public_notifications import public_notifier
    
    success = await public_notifier.send_fake_order()
    
    if success:
        return {"message": "Fake order sent successfully"}
    else:
        raise HTTPException(status_code=400, detail="Failed to send fake order")

@router_chat_admin.get("/api/notifications/logs")
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

# ==================== CHAT ENDPOINTS ====================

@router_chat_admin.websocket("/ws/chat/{admin_email}")
async def websocket_endpoint(websocket: WebSocket, admin_email: str):
    """WebSocket for real-time chat"""
    await manager.connect(websocket, admin_email)
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            elif data.get("type") == "typing":
                pass
                
    except WebSocketDisconnect:
        await manager.disconnect(admin_email)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await manager.disconnect(admin_email)

@router_chat_admin.post("/api/chat/notify-new-message")
async def notify_new_message(data: dict):
    """Endpoint for bot to notify about new messages"""
    global new_message_telegram_id
    
    telegram_id = data.get('telegram_id')
    if telegram_id:
        new_message_telegram_id = telegram_id
        new_message_event.set()
        
        await manager.broadcast({
            "type": "refresh_required",
            "telegram_id": telegram_id
        })
        
        return {"status": "notified"}
    return {"status": "error", "message": "No telegram_id provided"}

@router_chat_admin.get("/api/chat/wait-for-messages")
async def wait_for_messages(timeout: int = 30):
    """Long polling endpoint - waits for new messages"""
    try:
        await asyncio.wait_for(new_message_event.wait(), timeout=timeout)
        
        new_message_event.clear()
        
        return {
            "new_message": True,
            "telegram_id": new_message_telegram_id
        }
    except asyncio.TimeoutError:
        return {
            "new_message": False
        }

@router_chat_admin.get("/api/chat/conversations")
async def get_conversations(
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
    email: str = Depends(verify_token)
):
    """Get list of all conversations with users"""
    
    pipeline = [
        {
            "$group": {
                "_id": "$telegram_id",
                "last_message": {"$last": "$message"},
                "last_message_time": {"$max": "$timestamp"},
                "unread_count": {
                    "$sum": {
                        "$cond": [
                            {"$and": [
                                {"$eq": ["$direction", "incoming"]},
                                {"$eq": ["$read", False]}
                            ]},
                            1,
                            0
                        ]
                    }
                },
                "total_messages": {"$sum": 1}
            }
        },
        {"$sort": {"last_message_time": -1}},
    ]
    
    if unread_only:
        pipeline.append({"$match": {"unread_count": {"$gt": 0}}})
    
    pipeline.extend([
        {"$skip": skip},
        {"$limit": limit}
    ])
    
    conversations = await db.chat_messages.aggregate(pipeline).to_list(limit)
    
    for conv in conversations:
        user = await db.users.find_one({"telegram_id": conv["_id"]})
        if user:
            conv["username"] = user.get("username", f"User{conv['_id']}")
            conv["first_name"] = user.get("first_name", "")
            conv["last_name"] = user.get("last_name", "")
            conv["total_orders"] = user.get("total_orders", 0)
            conv["total_spent"] = user.get("total_spent_usdt", 0)
            conv["status"] = user.get("status", "active")
        else:
            conv["username"] = f"User{conv['_id']}"
            conv["first_name"] = ""
            conv["last_name"] = ""
            conv["total_orders"] = 0
            conv["total_spent"] = 0
            conv["status"] = "unknown"
        
        conv["telegram_id"] = conv.pop("_id")
    
    total = await db.chat_messages.distinct("telegram_id")
    
    return {
        "conversations": conversations,
        "total": len(total),
        "unread_total": sum(c.get("unread_count", 0) for c in conversations)
    }

@router_chat_admin.get("/api/chat/messages/{telegram_id}")
async def get_messages(
    telegram_id: int,
    skip: int = 0,
    limit: int = 50,
    email: str = Depends(verify_token)
):
    """Get messages for specific user"""
    
    messages = await db.chat_messages.find(
        {"telegram_id": telegram_id}
    ).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    
    for msg in messages:
        msg["_id"] = str(msg["_id"])
        msg["timestamp"] = msg.get("timestamp", datetime.now(timezone.utc))
    
    await db.chat_messages.update_many(
        {
            "telegram_id": telegram_id,
            "direction": "incoming",
            "read": False
        },
        {"$set": {"read": True}}
    )
    
    user = await db.users.find_one({"telegram_id": telegram_id})
    user_info = {
        "telegram_id": telegram_id,
        "username": user.get("username", f"User{telegram_id}") if user else f"User{telegram_id}",
        "first_name": user.get("first_name", "") if user else "",
        "last_name": user.get("last_name", "") if user else "",
        "created_at": user.get("created_at") if user else None,
        "total_orders": user.get("total_orders", 0) if user else 0,
        "total_spent": user.get("total_spent_usdt", 0) if user else 0,
        "is_vip": user.get("is_vip", False) if user else False,
        "status": user.get("status", "unknown") if user else "unknown"
    }
    
    await manager.broadcast({
        "type": "messages_read",
        "telegram_id": telegram_id
    })
    
    return {
        "messages": list(reversed(messages)),
        "user": user_info,
        "total": await db.chat_messages.count_documents({"telegram_id": telegram_id})
    }

@router_chat_admin.post("/api/chat/send")
async def send_message(
    message_data: ChatMessageModel,
    email: str = Depends(verify_token)
):
    """Send message to user via Telegram bot"""
    
    try:
        from bot_modules.public_notifications import public_notifier
        bot = public_notifier.bot
        
        sent_message = await bot.send_message(
            chat_id=message_data.telegram_id,
            text=message_data.message,
            parse_mode='Markdown'
        )
        
        message_doc = {
            "telegram_id": message_data.telegram_id,
            "message": message_data.message,
            "direction": "outgoing",
            "admin_email": email,
            "timestamp": datetime.now(timezone.utc),
            "read": True,
            "telegram_message_id": sent_message.message_id,
            "attachments": message_data.attachments
        }
        
        result = await db.chat_messages.insert_one(message_doc)
        message_doc["_id"] = str(result.inserted_id)
        
        await manager.broadcast({
            "type": "new_message",
            "message": message_doc
        })
        
        return {
            "success": True,
            "message": "Message sent",
            "message_id": str(result.inserted_id)
        }
        
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to send message: {str(e)}")

@router_chat_admin.patch("/api/chat/mark-read/{telegram_id}")
async def mark_messages_read(
    telegram_id: int,
    email: str = Depends(verify_token)
):
    """Mark all messages from user as read"""
    
    result = await db.chat_messages.update_many(
        {
            "telegram_id": telegram_id,
            "direction": "incoming",
            "read": False
        },
        {"$set": {"read": True, "read_by": email, "read_at": datetime.now(timezone.utc)}}
    )
    
    await manager.broadcast({
        "type": "messages_read",
        "telegram_id": telegram_id,
        "read_by": email
    })
    
    return {
        "success": True,
        "messages_marked": result.modified_count
    }

@router_chat_admin.delete("/api/chat/conversation/{telegram_id}")
async def delete_conversation(
    telegram_id: int,
    email: str = Depends(verify_token)
):
    """Delete entire conversation with user"""
    
    if email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Only main admin can delete conversations")
    
    result = await db.chat_messages.delete_many({"telegram_id": telegram_id})
    
    await db.audit_logs.insert_one({
        "admin_id": email,
        "action": "DELETE_CONVERSATION",
        "telegram_id": telegram_id,
        "messages_deleted": result.deleted_count,
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {
        "success": True,
        "messages_deleted": result.deleted_count
    }

@router_chat_admin.get("/api/chat/search")
async def search_messages(
    query: str,
    telegram_id: Optional[int] = None,
    email: str = Depends(verify_token)
):
    """Search in messages"""
    
    search_filter = {
        "$text": {"$search": query}
    }
    
    if telegram_id:
        search_filter["telegram_id"] = telegram_id
    
    messages = await db.chat_messages.find(
        search_filter,
        {"score": {"$meta": "textScore"}}
    ).sort([("score", {"$meta": "textScore"})]).limit(50).to_list(50)
    
    for msg in messages:
        msg["_id"] = str(msg["_id"])
        user = await db.users.find_one({"telegram_id": msg["telegram_id"]})
        msg["username"] = user.get("username", f"User{msg['telegram_id']}") if user else f"User{msg['telegram_id']}"
    
    return {
        "results": messages,
        "total": len(messages)
    }

@router_chat_admin.get("/api/chat/stats")
async def get_chat_stats(email: str = Depends(verify_token)):
    """Get chat statistics"""
    
    total_conversations = len(await db.chat_messages.distinct("telegram_id"))
    
    total_messages = await db.chat_messages.count_documents({})
    
    unread_messages = await db.chat_messages.count_documents({
        "direction": "incoming",
        "read": False
    })
    
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_messages = await db.chat_messages.count_documents({
        "timestamp": {"$gte": today_start}
    })
    
    avg_response_time = "N/A"
    
    pipeline = [
        {
            "$group": {
                "_id": "$telegram_id",
                "message_count": {"$sum": 1}
            }
        },
        {"$sort": {"message_count": -1}},
        {"$limit": 5}
    ]
    
    top_users = await db.chat_messages.aggregate(pipeline).to_list(5)
    
    for user in top_users:
        user_data = await db.users.find_one({"telegram_id": user["_id"]})
        user["username"] = user_data.get("username", f"User{user['_id']}") if user_data else f"User{user['_id']}"
        user["telegram_id"] = user.pop("_id")
    
    return {
        "total_conversations": total_conversations,
        "total_messages": total_messages,
        "unread_messages": unread_messages,
        "today_messages": today_messages,
        "avg_response_time": avg_response_time,
        "top_users": top_users
    }

@router_chat_admin.get("/api/chat/quick-replies")
async def get_quick_replies(email: str = Depends(verify_token)):
    """Get quick reply templates"""
    
    replies = await db.quick_replies.find({}).to_list(100)
    
    for reply in replies:
        reply["_id"] = str(reply["_id"])
    
    if not replies:
        default_replies = [
            {"title": "Order Status", "message": "Your order is being processed and will be shipped within 24 hours."},
            {"title": "Payment Confirmed", "message": "We've received your payment! Your order is now confirmed."},
            {"title": "Tracking Info", "message": "Your tracking number will be provided once the order ships."},
            {"title": "Thank You", "message": "Thank you for your order! 🚀"},
            {"title": "Need Help?", "message": "Is there anything else I can help you with?"},
            {"title": "Welcome", "message": "Welcome to AnabolicPizza! How can I help you today?"},
        ]
        
        for reply in default_replies:
            await db.quick_replies.insert_one(reply)
        
        replies = await db.quick_replies.find({}).to_list(100)
        for reply in replies:
            reply["_id"] = str(reply["_id"])
    
    return {"replies": replies}

# ==================== ADMIN ENDPOINTS ====================

@router_chat_admin.delete("/api/admin/clear-orders")
async def clear_orders(email: str = Depends(verify_token)):
    if email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.orders.delete_many({})
    await db.users.update_many({}, {"$set": {"total_orders": 0, "total_spent_usdt": 0, "referrals_used": []}})
    await db.products.update_many({}, {"$set": {"sold_count": 0}})
    
    return {"message": f"Deleted {result.deleted_count} orders and reset stats"}

@router_chat_admin.delete("/api/admin/clear-users")
async def clear_users(email: str = Depends(verify_token)):
    if email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.users.delete_many({})
    return {"message": f"Deleted {result.deleted_count} users"}
