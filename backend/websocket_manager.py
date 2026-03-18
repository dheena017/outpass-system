"""
WebSocket connection manager for real-time location tracking.
Handles connections from warden clients and broadcasts live student locations.
"""

from typing import Set, Dict, List
from fastapi import WebSocket
import json
from datetime import datetime


class ConnectionManager:
    def __init__(self):
        # Store active warden connections by user_id
        self.active_connections: Dict[int, WebSocket] = {}
        # Store active student locations for broadcasting
        self.active_locations: Dict[int, dict] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        """Register a new WebSocket connection from a warden."""
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        """Remove a disconnected warden's connection."""
        self.active_connections.pop(user_id, None)

    async def broadcast_location_update(self, location_data: dict):
        """Broadcast location update to all connected wardens."""
        # Store the latest location
        student_id = location_data.get("student_id")
        if student_id is not None:
            self.active_locations[int(student_id)] = location_data

        # Prepare message
        message = {
            "type": "location_update",
            "data": location_data,
            "timestamp": datetime.utcnow().isoformat(),
        }

        # Send to all connected wardens
        disconnected_users = []
        for user_id, connection in list(self.active_connections.items()):
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error sending to user {user_id}: {e}")
                disconnected_users.append(user_id)

        # Clean up disconnected clients
        for user_id in disconnected_users:
            self.disconnect(user_id)

    async def broadcast_status_update(
        self, request_id: int, status: str, student_id: int
    ):
        """Broadcast when an outpass status changes."""
        message = {
            "type": "status_update",
            "request_id": request_id,
            "student_id": student_id,
            "status": status,
            "timestamp": datetime.utcnow().isoformat(),
        }

        disconnected_users = []
        for user_id, connection in list(self.active_connections.items()):
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error sending status update to user {user_id}: {e}")
                disconnected_users.append(user_id)

        # Clean up disconnected clients
        for user_id in disconnected_users:
            self.disconnect(user_id)

    async def send_active_students(
        self, user_id: int, active_students: List[dict]
    ):
        """Send list of all active students to a specific warden connection."""
        if user_id not in self.active_connections:
            return

        message = {
            "type": "active_students",
            "data": active_students,
            "timestamp": datetime.utcnow().isoformat(),
        }

        try:
            await self.active_connections[user_id].send_json(message)
        except Exception as e:
            print(f"Error sending active students to user {user_id}: {e}")
            self.disconnect(user_id)

    def get_active_student_count(self) -> int:
        """Get count of active tracked students."""
        return len(self.active_locations)

    def get_warden_count(self) -> int:
        """Get count of connected wardens."""
        return len(self.active_connections)


# Global instance
manager = ConnectionManager()
