from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict
import logging
import asyncio

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, admin_id: str):
        await websocket.accept()
        self.active_connections[admin_id] = websocket
        logger.info(f"Admin {admin_id} connected to chat")
    
    async def disconnect(self, admin_id: str):
        if admin_id in self.active_connections:
            del self.active_connections[admin_id]
            logger.info(f"Admin {admin_id} disconnected from chat")
    
    async def send_message(self, message: dict, admin_id: str):
        if admin_id in self.active_connections:
            try:
                await self.active_connections[admin_id].send_json(message)
            except:
                await self.disconnect(admin_id)
    
    async def broadcast(self, message: dict):
        disconnected = []
        for admin_id, connection in self.active_connections.items():
            try:
                await connection.send_json(message)
            except:
                disconnected.append(admin_id)
        
        for admin_id in disconnected:
            await self.disconnect(admin_id)

manager = ConnectionManager()
new_message_event = asyncio.Event()
new_message_telegram_id = None
