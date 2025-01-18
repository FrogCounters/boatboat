from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
import uvicorn
from typing import Dict, List, Optional
import json
import asyncio
from dataclasses import dataclass
from datetime import datetime
import uuid
from enum import Enum
import math

app = FastAPI()

# TODO: Add a free position and change move_player logic subsequently to allow infinite number of players on board
class Position(Enum):
    HELM = "helm"
    CANNON_LEFT_1 = "cannon_left_1"
    CANNON_LEFT_2 = "cannon_left_2"
    CANNON_RIGHT_1 = "cannon_right_1"
    CANNON_RIGHT_2 = "cannon_right_2"

@dataclass
class Player:
    id: str
    position: Position  # Position enum indicating where they are in the ship
    relative_pos: dict  # {x: float, y: float} position relative to ship's center

@dataclass
class Ship:
    id: str
    position: dict  # {x: float, y: float}
    velocity: dict  # {x: float, y: float}
    players: Dict[str, Player]  # player_id -> Player
    health: int = 100 # Tmp initial health of player
    score: int = 0
    last_update: float = 0 # timestamp

    def add_player(self, player_id: str, position: Position) -> bool:
        # Check if position is already taken
        if any(p.position == position for p in self.players.values()):
            return False
            
        # Define relative position based on ship position
        relative_positions = {
            Position.HELM: {"x": 0, "y": 10},  # Front of the ship
            Position.CANNON_LEFT_1: {"x": -20, "y": 10},  # Left side front
            Position.CANNON_LEFT_2: {"x": -20, "y": -10},  # Left side back
            Position.CANNON_RIGHT_1: {"x": 20, "y": 10},  # Right side front
            Position.CANNON_RIGHT_2: {"x": 20, "y": -10},  # Right side back

        }
        
        self.players[player_id] = Player(
            id=player_id,
            position=position,
            relative_pos=relative_positions[position]
        )
        return True

    def remove_player(self, player_id: str):
        if player_id in self.players:
            del self.players[player_id]

    def move_player(self, player_id: str, new_position: Position) -> bool:
        # Check if new position is available
        if any(p.position == new_position for p in self.players.values()):
            return False
            
        if player_id in self.players:
            current_player = self.players[player_id]
            current_player.position = new_position
            # Update relative position
            relative_positions = {
                Position.HELM: {"x": 0, "y": 0},
                Position.CANNON_LEFT_1: {"x": -20, "y": 10},
                Position.CANNON_LEFT_2: {"x": -20, "y": -10},
                Position.CANNON_RIGHT_1: {"x": 20, "y": 10},
                Position.CANNON_RIGHT_2: {"x": 20, "y": -10},
            }
            current_player.relative_pos = relative_positions[new_position]
            return True
        return False

@dataclass
class Bullet:
    id: str
    position: dict  # {x: float, y: float}
    angle: float
    ship_id: str
    timestamp: float

class GameState:
    def __init__(self):
        self.ships: Dict[str, Ship] = {}
        self.bullets: Dict[str, Bullet] = {}
        self.connections: Dict[str, WebSocket] = {}
        
    def add_ship(self, ship_id: str) -> Ship:
        ship = Ship(
            id=ship_id,
            position={"x": 0, "y": 0},
            velocity={"x": 0, "y": 0},
            players={}
        )
        self.ships[ship_id] = ship
        return ship
    
    def add_bullet(self, bullet_data: dict, ship_id: str) -> Bullet:
        bullet_id = str(uuid.uuid4())
        bullet = Bullet(
            id=bullet_id,
            position=bullet_data["position"],
            angle=bullet_data["angle"],
            ship_id=ship_id,
            timestamp=bullet_data["timestamp"]
        )
        self.bullets[bullet_id] = bullet
        return bullet

    def get_leaderboard(self) -> List[dict]:
        return [
            {"ship_id": ship.id, "score": ship.score}
            for ship in sorted(self.ships.values(), key=lambda x: x.score, reverse=True)
        ]

    def update_ship_location(self, ship_id: str, data: dict):
        if ship_id in self.ships:
            ship = self.ships[ship_id]
            ship.position = data["position"]
            ship.velocity = data["velocity"]
            ship.last_update = data["timestamp"]

game_state = GameState()

async def broadcast_game_state():
    while True:
        if game_state.connections:
            # Prepare all game_state update message
            message = {
                "type": "state_update",
                "ships": [
                    {
                        "id": ship.id,
                        "position": ship.position,
                        "velocity": ship.velocity,
                        "health": ship.health,
                        "players": [
                            {
                                "id": player.id,
                                "position": player.position.value,
                                "relative_pos": player.relative_pos
                            }
                            for player in ship.players.values()
                        ],
                        "timestamp": ship.last_update
                    }
                    for ship in game_state.ships.values()
                ],
                "bullets": [
                    {
                        "id": bullet.id,
                        "position": bullet.position,
                        "angle": bullet.angle,
                        "timestamp": bullet.timestamp
                    }
                    for bullet in game_state.bullets.values()
                ],
                "leaderboard": game_state.get_leaderboard()
            }
            
            # Broadcast to all connected clients
            for connection in game_state.connections.values():
                try:
                    await connection.send_text(json.dumps(message))
                except:
                    pass
        await asyncio.sleep(10)  # TODO: change this 5ms update interval

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(broadcast_game_state())

# Player : Ship Mapping (To know which player moved)
player_ship_mapping: Dict[str, str] = {}

# Track WebSocket connections for both ships and players
player_connections: Dict[str, WebSocket] = {}


@app.websocket("/joinship")
async def join_ship_websocket(websocket: WebSocket, ship_id: str):
    """
    WebSocket endpoint for player-server communication.
    Simply forwards messages between player and ship.
    """
    # Check if ship exists
    if ship_id not in game_state.ships:
        await websocket.close(code=4000, reason="Ship not found")
        return
        
    await websocket.accept()
    
    # Generate player_id for identification
    player_id = str(uuid.uuid4())

    # Store player connection
    player_connections[player_id] = websocket
    
    try:
        # Send initial player_id created back to the player
        await websocket.send_text(json.dumps({
            "type": "init",
            "player_id": player_id
        }))

        # Forward all messages to the ship
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Add player_id to message before forwarding
            message["player_id"] = player_id
            
            # Forward to ship if connected
            if ship_id in game_state.connections:
                ship_socket = game_state.connections[ship_id]
                await ship_socket.send_text(json.dumps(message))
                
    except WebSocketDisconnect:
        pass



@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for ship-server communication.
    Handles location updates, bullet updates, and player communication forwarding.
    """
    await websocket.accept()
    
    # Generate ship_id for our initial connection
    ship_id = str(uuid.uuid4())
    
    # Init ship in game state
    game_state.add_ship(ship_id)
    
    # Store connection
    game_state.connections[ship_id] = websocket
    
    try:
        # Send ship_id to the client
        await websocket.send_text(json.dumps({
            "type": "init",
            "ship_id": ship_id
        }))
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "location_update":
                game_state.update_ship_location(ship_id, message["data"])
                
            elif message["type"] == "bullet_update":
                bullet = game_state.add_bullet(message["data"], ship_id)
                
                # Check for collisions (simplified for now)
                bullet_pos = bullet.position
                for other_ship in game_state.ships.values():
                    if other_ship.id != ship_id:
                        # Simple circular collision detection
                        ship_pos = other_ship.position
                        dx = bullet_pos["x"] - ship_pos["x"]
                        dy = bullet_pos["y"] - ship_pos["y"]
                        distance = (dx * dx + dy * dy) ** 0.5

                        # TODO: FIX, assume dx cannot be 0 here since "collision" cannot theoretically happen
                        bullet_angle = math.atan2(dy, dx)

                        # TODO: FIX, Temporary Collision radius and no leeway for angle
                        if distance < 50 and bullet_angle == bullet.angle:  
                            other_ship.health -= 10
                            game_state.ships[ship_id].score += 1
                            del game_state.bullets[bullet.id]
                            break

            elif message["type"] == "player_communication":
                # Forward message to specific player
                if "player_id" in message:
                    player_id = message["player_id"]
                    if player_id in player_connections:
                        player_socket = player_connections[player_id]
                        # Forward the entire message to the player
                        await player_socket.send_text(json.dumps(message))
                    
    except WebSocketDisconnect:
        # Cleanup on disconnect
        del game_state.connections[ship_id]
        if ship_id in game_state.ships:
            del game_state.ships[ship_id]

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
