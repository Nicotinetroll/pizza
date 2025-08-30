from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import List
import os
import secrets
from datetime import datetime, timezone
from bson import ObjectId
import aiofiles
from pathlib import Path
import logging

from .config import db
from .helpers import verify_token

router_notification_media = APIRouter()
logger = logging.getLogger(__name__)

MEDIA_DIR = Path("/opt/telegram-shop-bot/media/notifications")
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

@router_notification_media.post("/api/notifications/media/upload")
async def upload_notification_media(
    file: UploadFile = File(...),
    type: str = Form(...),
    email: str = Depends(verify_token)
):
    try:
        allowed_extensions = {
            'image': ['.jpg', '.jpeg', '.png', '.webp'],
            'gif': ['.gif'],
            'video': ['.webm', '.mp4']
        }
        
        file_ext = Path(file.filename).suffix.lower()
        
        if type == 'image' and file_ext not in allowed_extensions['image']:
            raise HTTPException(status_code=400, detail="Invalid image format. Use JPG, PNG or WEBP")
        
        if type == 'gif' and file_ext not in allowed_extensions['gif']:
            raise HTTPException(status_code=400, detail="Invalid GIF format")
        
        if type == 'video' and file_ext not in allowed_extensions['video']:
            raise HTTPException(status_code=400, detail="Invalid video format. Use WEBM or MP4")
        
        unique_id = secrets.token_hex(8)
        new_filename = f"{unique_id}{file_ext}"
        file_path = MEDIA_DIR / new_filename
        
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        media_doc = {
            "filename": new_filename,
            "original_name": file.filename,
            "url": f"/api/notifications/media/{new_filename}",
            "type": type,
            "enabled": True,
            "created_at": datetime.now(timezone.utc),
            "uploaded_by": email
        }
        
        result = await db.notification_media.insert_one(media_doc)
        media_doc["_id"] = str(result.inserted_id)
        
        return {"success": True, "media": media_doc}
        
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router_notification_media.get("/api/notifications/media/{filename}")
async def get_media_file(filename: str):
    file_path = MEDIA_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)

@router_notification_media.get("/api/notifications/media")
async def list_notification_media(
    email: str = Depends(verify_token)
):
    media_list = await db.notification_media.find({}).sort("created_at", -1).to_list(100)
    
    for media in media_list:
        media["_id"] = str(media["_id"])
    
    return {"media": media_list, "total": len(media_list)}

@router_notification_media.delete("/api/notifications/media/{media_id}")
async def delete_notification_media(
    media_id: str,
    email: str = Depends(verify_token)
):
    media = await db.notification_media.find_one({"_id": ObjectId(media_id)})
    
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    file_path = MEDIA_DIR / media["filename"]
    if file_path.exists():
        os.remove(file_path)
    
    await db.notification_media.delete_one({"_id": ObjectId(media_id)})
    
    return {"success": True, "message": "Media deleted"}

@router_notification_media.patch("/api/notifications/media/{media_id}/toggle")
async def toggle_media_status(
    media_id: str,
    email: str = Depends(verify_token)
):
    media = await db.notification_media.find_one({"_id": ObjectId(media_id)})
    
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    new_status = not media.get("enabled", True)
    
    await db.notification_media.update_one(
        {"_id": ObjectId(media_id)},
        {"$set": {"enabled": new_status}}
    )
    
    return {"success": True, "enabled": new_status}