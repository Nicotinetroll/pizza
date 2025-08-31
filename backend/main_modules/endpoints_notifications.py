# backend/main_modules/endpoints_notifications.py

from fastapi import APIRouter, Request, HTTPException
from bot_modules.public_notifications import public_notifier
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.get("/settings")
async def get_notification_settings():
    """Get all notification settings"""
    settings = await public_notifier.get_settings()
    settings.pop("_id", None) if "_id" in settings else None
    return settings

@router.put("/settings")
async def update_notification_settings(request: Request):
    """Update notification settings"""
    data = await request.json()
    result = await public_notifier.update_settings(data)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/templates")
async def add_template(request: Request):
    """Add new notification template"""
    data = await request.json()
    result = await public_notifier.add_template(data)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.put("/templates/{index}")
async def update_template(index: int, request: Request):
    """Update existing template"""
    data = await request.json()
    result = await public_notifier.update_template(index, data)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.delete("/templates/{index}")
async def delete_template(index: int):
    """Delete template by index"""
    result = await public_notifier.delete_template(index)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/test")
async def send_test_notification(request: Request):
    """Send test notification"""
    body = await request.body()
    data = await request.json() if body else {}
    custom_message = data.get("message", None)
    
    success = await public_notifier.send_test_notification(custom_message)
    
    if success:
        return {"success": True, "message": "Test notification sent"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send test notification")

@router.post("/fake-order")
async def send_fake_order():
    """Manually trigger a fake order"""
    success = await public_notifier.send_fake_order()
    
    if success:
        return {"success": True, "message": "Fake order sent"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send fake order")

@router.get("/logs")
async def get_notification_logs():
    """Get recent notification logs"""
    logs = await public_notifier.get_logs(50)
    return {"logs": logs}
