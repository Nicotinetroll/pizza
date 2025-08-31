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
    from bot_modules.support_tickets import get_all_tickets
    return await get_all_tickets(status, priority, None, skip, limit)

@router_tickets.get("/{ticket_id}")
async def get_ticket(
    ticket_id: str,
    email: str = Depends(verify_token)
):
    ticket = await db.support_tickets.find_one({"_id": ObjectId(ticket_id)})
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
    from bot_modules.support_tickets import add_ticket_message
    
    success = await add_ticket_message(
        ticket_id=ticket_id,
        sender_id=0,
        sender_type="admin",
        message=data.get("message", "")
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to send reply")
    
    from bot_modules.public_notifications import public_notifier
    bot = public_notifier.bot
    
    ticket = await db.support_tickets.find_one({"_id": ObjectId(ticket_id)})
    if ticket:
        try:
            await bot.send_message(
                chat_id=ticket["telegram_id"],
                text=f"💬 *New reply in your ticket {ticket['ticket_number']}*\n\n{data.get('message', '')}",
                parse_mode='Markdown'
            )
        except:
            pass
    
    return {"success": True, "message": "Reply sent"}

@router_tickets.patch("/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: str,
    data: dict,
    email: str = Depends(verify_token)
):
    from bot_modules.support_tickets import update_ticket_status
    
    success = await update_ticket_status(
        ticket_id=ticket_id,
        status=data.get("status"),
        resolution=data.get("resolution"),
        admin_id=0
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update status")
    
    return {"success": True, "message": "Status updated"}

@router_tickets.post("/{ticket_id}/assign")
async def assign_ticket(
    ticket_id: str,
    data: dict,
    email: str = Depends(verify_token)
):
    from bot_modules.support_tickets import assign_ticket
    
    success = await assign_ticket(
        ticket_id=ticket_id,
        admin_id=0,
        admin_username=email
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to assign ticket")
    
    return {"success": True, "message": "Ticket assigned"}

@router_tickets.get("/stats/overview")
async def get_ticket_stats(email: str = Depends(verify_token)):
    from bot_modules.support_tickets import get_ticket_stats
    return await get_ticket_stats()

@router_tickets.post("/search")
async def search_tickets(
    data: dict,
    email: str = Depends(verify_token)
):
    from bot_modules.support_tickets import search_tickets
    return await search_tickets(data.get("query", ""), data.get("limit", 50))
