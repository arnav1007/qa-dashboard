"""
WebSocket connection manager for real-time updates
"""
from fastapi import WebSocket
from typing import List, Dict
import json
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections and broadcasts messages
    """
    
    def __init__(self):
        # Store all active WebSocket connections
        self.active_connections: List[WebSocket] = []
        # Store connections by user ID for targeted messaging
        self.user_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str = None):
        """
        Accept and register a new WebSocket connection
        
        Args:
            websocket: WebSocket connection object
            user_id: Optional user ID for authenticated users
        """
        await websocket.accept()
        self.active_connections.append(websocket)
        
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = []
            self.user_connections[user_id].append(websocket)
        
        logger.info(f"Client connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket, user_id: str = None):
        """
        Remove a WebSocket connection
        
        Args:
            websocket: WebSocket connection to remove
            user_id: Optional user ID if connection was authenticated
        """
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        if user_id and user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
            # Clean up empty user connection lists
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        
        logger.info(f"Client disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        """
        Send a message to all connected clients
        
        Args:
            message: Dictionary to send as JSON
        """
        disconnected = []
        
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error sending message: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)
        
        logger.info(f"Broadcasted message to {len(self.active_connections) - len(disconnected)} clients")
    
    async def send_to_user(self, user_id: str, message: dict):
        """
        Send a message to a specific user's connections
        
        Args:
            user_id: User ID to send message to
            message: Dictionary to send as JSON
        """
        if user_id not in self.user_connections:
            return
        
        disconnected = []
        
        for connection in self.user_connections[user_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to user {user_id}: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn, user_id)
    
    async def send_to_admins(self, message: dict):
        """
        Send a message to all admin users
        Note: This would require tracking which connections are admins
        For now, we broadcast to all (admins will filter on frontend)
        
        Args:
            message: Dictionary to send as JSON
        """
        await self.broadcast(message)


# Global connection manager instance
manager = ConnectionManager()

