from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from bson import ObjectId
from typing import Optional, List, Dict, Any
from enum import Enum
import secrets
import logging

from .config import MONGODB_URI, BOT_TOKEN
from .database import db

logger = logging.getLogger(__name__)

class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING_CUSTOMER = "waiting_customer"
    WAITING_ADMIN = "waiting_admin"
    RESOLVED = "resolved"
    CLOSED = "closed"

class TicketPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class TicketCategory(str, Enum):
    ORDER = "order"
    PAYMENT = "payment"
    PRODUCT = "product"
    DELIVERY = "delivery"
    TECHNICAL = "technical"
    OTHER = "other"

async def generate_ticket_number() -> str:
    count = await db.support_tickets.count_documents({})
    year = datetime.now().year
    ticket_number = f"TKT-{year}-{count + 1:04d}"
    return ticket_number

async def create_support_ticket(
    telegram_id: int,
    username: str,
    category: str,
    subject: str,
    description: str,
    order_number: Optional[str] = None,
    priority: str = TicketPriority.MEDIUM,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None
) -> Dict[str, Any]:
    
    ticket_number = await generate_ticket_number()
    
    ticket_data = {
        "ticket_number": ticket_number,
        "telegram_id": telegram_id,
        "username": username,
        "first_name": first_name,
        "last_name": last_name,
        "category": category,
        "subject": subject,
        "description": description,
        "order_number": order_number,
        "status": TicketStatus.OPEN,
        "priority": priority,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "messages": [{
            "sender_id": telegram_id,
            "sender_type": "customer",
            "message": description,
            "timestamp": datetime.utcnow(),
            "read": False
        }],
        "assigned_to": None,
        "assigned_username": None,
        "resolved_at": None,
        "closed_at": None,
        "resolution": None,
        "admin_notes": None,
        "rating": None,
        "feedback": None
    }
    
    result = await db.support_tickets.insert_one(ticket_data)
    ticket_data["_id"] = str(result.inserted_id)
    
    return ticket_data

async def get_ticket_by_id(ticket_id: str) -> Optional[Dict[str, Any]]:
    ticket = await db.support_tickets.find_one({"_id": ObjectId(ticket_id)})
    if ticket:
        ticket["_id"] = str(ticket["_id"])
    return ticket

async def get_ticket_by_number(ticket_number: str) -> Optional[Dict[str, Any]]:
    ticket = await db.support_tickets.find_one({"ticket_number": ticket_number})
    if ticket:
        ticket["_id"] = str(ticket["_id"])
    return ticket

async def get_user_tickets(telegram_id: int, limit: int = 10) -> List[Dict[str, Any]]:
    tickets = await db.support_tickets.find(
        {"telegram_id": telegram_id}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    for ticket in tickets:
        ticket["_id"] = str(ticket["_id"])
        ticket["unread_count"] = sum(
            1 for msg in ticket.get("messages", [])
            if msg.get("sender_type") == "admin" and not msg.get("read", False)
        )
    
    return tickets

async def add_ticket_message(
    ticket_id: str,
    sender_id: int,
    sender_type: str,
    message: str,
    attachments: Optional[List[str]] = None
) -> bool:
    
    message_data = {
        "sender_id": sender_id,
        "sender_type": sender_type,
        "message": message,
        "timestamp": datetime.utcnow(),
        "read": False,
        "attachments": attachments or []
    }
    
    status_update = {}
    if sender_type == "customer":
        status_update = {"status": TicketStatus.WAITING_ADMIN}
    elif sender_type == "admin":
        status_update = {"status": TicketStatus.WAITING_CUSTOMER}
    
    result = await db.support_tickets.update_one(
        {"_id": ObjectId(ticket_id)},
        {
            "$push": {"messages": message_data},
            "$set": {
                "updated_at": datetime.utcnow(),
                **status_update
            }
        }
    )
    
    return result.modified_count > 0

async def mark_messages_as_read(ticket_id: str, reader_type: str) -> bool:
    
    ticket = await get_ticket_by_id(ticket_id)
    if not ticket:
        return False
    
    messages = ticket.get("messages", [])
    for msg in messages:
        if msg.get("sender_type") != reader_type:
            msg["read"] = True
    
    result = await db.support_tickets.update_one(
        {"_id": ObjectId(ticket_id)},
        {"$set": {"messages": messages}}
    )
    
    return result.modified_count > 0

async def update_ticket_status(
    ticket_id: str,
    status: str,
    resolution: Optional[str] = None,
    admin_id: Optional[int] = None
) -> bool:
    
    update_data = {
        "status": status,
        "updated_at": datetime.utcnow()
    }
    
    if status == TicketStatus.RESOLVED:
        update_data["resolved_at"] = datetime.utcnow()
        if resolution:
            update_data["resolution"] = resolution
    elif status == TicketStatus.CLOSED:
        update_data["closed_at"] = datetime.utcnow()
        if resolution:
            update_data["resolution"] = resolution
    
    result = await db.support_tickets.update_one(
        {"_id": ObjectId(ticket_id)},
        {"$set": update_data}
    )
    
    return result.modified_count > 0

async def close_ticket(ticket_id: str, resolution: str) -> bool:
    return await update_ticket_status(ticket_id, TicketStatus.CLOSED, resolution)

async def get_all_tickets(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to: Optional[int] = None,
    skip: int = 0,
    limit: int = 100
) -> Dict[str, Any]:
    
    query = {}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if assigned_to is not None:
        query["assigned_to"] = assigned_to
    
    tickets = await db.support_tickets.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for ticket in tickets:
        ticket["_id"] = str(ticket["_id"])
        ticket["unread_admin"] = sum(
            1 for msg in ticket.get("messages", [])
            if msg.get("sender_type") == "customer" and not msg.get("read", False)
        )
    
    total = await db.support_tickets.count_documents(query)
    open_count = await db.support_tickets.count_documents({"status": TicketStatus.OPEN})
    in_progress = await db.support_tickets.count_documents({"status": TicketStatus.IN_PROGRESS})
    
    return {
        "tickets": tickets,
        "total": total,
        "open_count": open_count,
        "in_progress": in_progress
    }

async def assign_ticket(
    ticket_id: str,
    admin_id: int,
    admin_username: str
) -> bool:
    
    result = await db.support_tickets.update_one(
        {"_id": ObjectId(ticket_id)},
        {
            "$set": {
                "assigned_to": admin_id,
                "assigned_username": admin_username,
                "status": TicketStatus.IN_PROGRESS,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return result.modified_count > 0

async def get_ticket_stats() -> Dict[str, Any]:
    
    total = await db.support_tickets.count_documents({})
    open_tickets = await db.support_tickets.count_documents({"status": TicketStatus.OPEN})
    in_progress = await db.support_tickets.count_documents({"status": TicketStatus.IN_PROGRESS})
    resolved = await db.support_tickets.count_documents({"status": TicketStatus.RESOLVED})
    closed = await db.support_tickets.count_documents({"status": TicketStatus.CLOSED})
    
    avg_resolution_time = await db.support_tickets.aggregate([
        {"$match": {"resolved_at": {"$exists": True}}},
        {"$project": {
            "resolution_time": {
                "$subtract": ["$resolved_at", "$created_at"]
            }
        }},
        {"$group": {
            "_id": None,
            "avg_time": {"$avg": "$resolution_time"}
        }}
    ]).to_list(1)
    
    avg_time_hours = avg_resolution_time[0]["avg_time"] / 3600000 if avg_resolution_time else 0
    
    by_category = await db.support_tickets.aggregate([
        {"$group": {
            "_id": "$category",
            "count": {"$sum": 1}
        }}
    ]).to_list(None)
    
    by_priority = await db.support_tickets.aggregate([
        {"$group": {
            "_id": "$priority",
            "count": {"$sum": 1}
        }}
    ]).to_list(None)
    
    return {
        "total": total,
        "open": open_tickets,
        "in_progress": in_progress,
        "resolved": resolved,
        "closed": closed,
        "avg_resolution_hours": round(avg_time_hours, 2),
        "by_category": {item["_id"]: item["count"] for item in by_category if item["_id"]},
        "by_priority": {item["_id"]: item["count"] for item in by_priority if item["_id"]}
    }

async def search_tickets(query: str, limit: int = 50) -> List[Dict[str, Any]]:
    
    search_filter = {
        "$or": [
            {"ticket_number": {"$regex": query, "$options": "i"}},
            {"subject": {"$regex": query, "$options": "i"}},
            {"description": {"$regex": query, "$options": "i"}},
            {"username": {"$regex": query, "$options": "i"}},
            {"order_number": {"$regex": query, "$options": "i"}}
        ]
    }
    
    tickets = await db.support_tickets.find(search_filter).sort("created_at", -1).limit(limit).to_list(limit)
    
    for ticket in tickets:
        ticket["_id"] = str(ticket["_id"])
    
    return tickets

async def auto_close_resolved_tickets(days: int = 7):
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    result = await db.support_tickets.update_many(
        {
            "status": TicketStatus.RESOLVED,
            "resolved_at": {"$lt": cutoff_date}
        },
        {
            "$set": {
                "status": TicketStatus.CLOSED,
                "closed_at": datetime.utcnow(),
                "auto_closed": True
            }
        }
    )
    
    return result.modified_count

async def send_ticket_to_admin_group(ticket: Dict[str, Any], context) -> None:
    from telegram import InlineKeyboardButton, InlineKeyboardMarkup
    from telegram.constants import ParseMode
    
    settings = await db.bot_settings.find_one({"_id": "main"})
    if not settings or not settings.get("admin_group_id"):
        logger.warning("Admin group ID not configured")
        return
    
    admin_group_id = settings["admin_group_id"]
    
    priority_emojis = {
        "low": "🟢",
        "medium": "🟡",
        "high": "🔴",
        "urgent": "🚨"
    }
    
    emoji = priority_emojis.get(ticket["priority"], "❓")
    
    keyboard = [
        [
            InlineKeyboardButton("👨‍💼 Take Ticket", callback_data=f"admin_take_{ticket['ticket_number']}"),
            InlineKeyboardButton("👁 View", callback_data=f"admin_view_{ticket['ticket_number']}")
        ],
        [
            InlineKeyboardButton("💬 Quick Reply", callback_data=f"admin_reply_{ticket['ticket_number']}")
        ]
    ]
    
    message = (
        f"{emoji} *NEW SUPPORT TICKET*\n\n"
        f"📋 ID: `{ticket['ticket_number']}`\n"
        f"👤 User: @{ticket['username']}\n"
        f"📂 Category: {ticket['category'].upper()}\n"
        f"📝 Subject: {ticket['subject']}\n\n"
        f"💬 Message:\n{ticket['description'][:500]}"
    )
    
    if ticket.get("order_number"):
        message += f"\n\n📦 Order: `{ticket['order_number']}`"
    
    try:
        await context.bot.send_message(
            chat_id=admin_group_id,
            text=message,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    except Exception as e:
        logger.error(f"Failed to send ticket to admin group: {e}")
