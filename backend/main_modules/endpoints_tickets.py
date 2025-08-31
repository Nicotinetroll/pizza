from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

from .config import db
from .helpers import verify_token

router_tickets = APIRouter(prefix="/api/tickets", tags=["Support Tickets"])

@router_tickets.get("")
async def get_tickets(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    email: str = Depends(verify_token)
):
    query = {}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    
    tickets = await db.support_tickets.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for ticket in tickets:
        ticket["_id"] = str(ticket["_id"])
        ticket["unread_admin"] = sum(
            1 for msg in ticket.get("messages", [])
            if msg.get("sender_type") == "customer" and not msg.get("read", False)
        )
    
    total = await db.support_tickets.count_documents(query)
    
    return {
        "tickets": tickets,
        "total": total
    }

@router_tickets.get("/stats/overview")
async def get_ticket_stats(email: str = Depends(verify_token)):
    total = await db.support_tickets.count_documents({})
    open_tickets = await db.support_tickets.count_documents({"status": "open"})
    in_progress = await db.support_tickets.count_documents({"status": "in_progress"})
    resolved = await db.support_tickets.count_documents({"status": "resolved"})
    closed = await db.support_tickets.count_documents({"status": "closed"})
    
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
    
    avg_time_hours = 0
    if avg_resolution_time and len(avg_resolution_time) > 0:
        avg_time_hours = avg_resolution_time[0].get("avg_time", 0) / 3600000 if avg_resolution_time[0].get("avg_time") else 0
    
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

@router_tickets.get("/{ticket_id}")
async def get_ticket(
    ticket_id: str,
    email: str = Depends(verify_token)
):
    try:
        ticket = await db.support_tickets.find_one({"_id": ObjectId(ticket_id)})
    except:
        ticket = await db.support_tickets.find_one({"ticket_number": ticket_id})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    ticket["_id"] = str(ticket["_id"])
    return ticket

@router_tickets.post("/{ticket_id}/reply")
async def reply_to_ticket(
    ticket_id: str,
    data: dict,
    email: str = Depends(verify_token)
):
    try:
        from bot_modules.support_tickets import add_ticket_message
        
        try:
            ticket = await db.support_tickets.find_one({"_id": ObjectId(ticket_id)})
        except:
            ticket = await db.support_tickets.find_one({"ticket_number": ticket_id})
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        success = await add_ticket_message(
            ticket_id=str(ticket["_id"]),
            sender_id=0,
            sender_type="admin",
            message=data.get("message", "")
        )
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to send reply")
        
        try:
            from bot_modules.public_notifications import public_notifier
            bot = public_notifier.bot
            
            if ticket and bot:
                await bot.send_message(
                    chat_id=ticket["telegram_id"],
                    text=f"💬 *New reply in your ticket {ticket['ticket_number']}*\n\n{data.get('message', '')}",
                    parse_mode='Markdown'
                )
        except:
            pass
        
        return {"success": True, "message": "Reply sent"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router_tickets.patch("/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: str,
    data: dict,
    email: str = Depends(verify_token)
):
    try:
        from bot_modules.support_tickets import update_ticket_status
        
        try:
            ticket = await db.support_tickets.find_one({"_id": ObjectId(ticket_id)})
        except:
            ticket = await db.support_tickets.find_one({"ticket_number": ticket_id})
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        success = await update_ticket_status(
            ticket_id=str(ticket["_id"]),
            status=data.get("status"),
            resolution=data.get("resolution"),
            admin_id=0
        )
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to update status")
        
        return {"success": True, "message": "Status updated"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router_tickets.post("/{ticket_id}/assign")
async def assign_ticket(
    ticket_id: str,
    data: dict,
    email: str = Depends(verify_token)
):
    try:
        from bot_modules.support_tickets import assign_ticket
        
        try:
            ticket = await db.support_tickets.find_one({"_id": ObjectId(ticket_id)})
        except:
            ticket = await db.support_tickets.find_one({"ticket_number": ticket_id})
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        success = await assign_ticket(
            ticket_id=str(ticket["_id"]),
            admin_id=0,
            admin_username=email
        )
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to assign ticket")
        
        return {"success": True, "message": "Ticket assigned"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router_tickets.post("/search")
async def search_tickets(
    data: dict,
    email: str = Depends(verify_token)
):
    try:
        from bot_modules.support_tickets import search_tickets
        tickets = await search_tickets(data.get("query", ""), data.get("limit", 50))
        return {"tickets": tickets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))