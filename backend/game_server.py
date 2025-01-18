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
            Position.HELM: {"x": 0, "y": 0},  # Center of ship
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
    player_id: str  # Track which player fired the bullet
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
    
    def add_bullet(self, bullet_data: dict, ship_id: str, player_id: str) -> Bullet:
        bullet_id = str(uuid.uuid4())
        bullet = Bullet(
            id=bullet_id,
            position=bullet_data["position"],
            angle=bullet_data["angle"],
            ship_id=ship_id,
            player_id=player_id,
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
        await asyncio.sleep(0.005)  # TODO: change this 5ms update interval

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(broadcast_game_state())

# Player : Ship Mapping (To know which player moved)
player_ship_mapping: Dict[str, str] = {}

@app.get("/joinship")
async def join_ship(ship_id: str):
    """
    REST Endpoint for players to join a ship.
    Verifies the ship exists before allowing join.
    """
    # Check if ship exists in game state
    if ship_id not in game_state.ships:
        return JSONResponse(
            status_code=404,
            content={"error": "Ship not found"}
        )
    
    player_id = str(uuid.uuid4())

    # Return success if ship exists
    return JSONResponse({
        "success": True,
        "ship_id": ship_id,
        "player_id": player_id
    })

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for ship-server communication.
    Generates a ship_id on initial connection and sends it to the ship.
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
                # Bullet updates should include player_id from ship's WebRTC connection
                if "player_id" not in message["data"]:
                    continue
                    
                bullet = game_state.add_bullet(message["data"], ship_id, message["data"]["player_id"])
                
                # Check for collisions (simplified)
                bullet_pos = bullet.position
                for other_ship in game_state.ships.values():
                    if other_ship.id != ship_id:
                        # Simple circular collision detection
                        ship_pos = other_ship.position
                        dx = bullet_pos["x"] - ship_pos["x"]
                        dy = bullet_pos["y"] - ship_pos["y"]
                        distance = (dx * dx + dy * dy) ** 0.5
                        
                        if distance < 50:  # Temporary Collision radius
                            other_ship.health -= 10
                            game_state.ships[ship_id].score += 1
                            del game_state.bullets[bullet.id]
                            break
                    
    except WebSocketDisconnect:
        # Cleanup on disconnect
        del game_state.connections[ship_id]
        if ship_id in game_state.ships:
            del game_state.ships[ship_id]

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
