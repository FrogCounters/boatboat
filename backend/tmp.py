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

class Team(Enum):
    TEAM_A = "team_a"
    TEAM_B = "team_b"

@dataclass
class Player:
    id: str
    controlled_ship_id: Optional[str] = None

@dataclass
class Ship:
    id: str
    position: dict  # {x: float, y: float}
    velocity: dict  # {x: float, y: float}
    team: Team
    controller_id: Optional[str] = None
    health: int = 100 # TODO: REMOVE
    score: int = 0
    last_update: float = 0

@dataclass
class Bomb:
    id: str
    position: dict  # {x: float, y: float}
    ship_id: str    # Ship that placed the bomb
    team: Team      # Team of the ship that placed the bomb
    timestamp: float

class GameState:
    def __init__(self):
        self.ships: Dict[str, Ship] = {}
        self.bombs: Dict[str, Bomb] = {}
        self.connections: Dict[str, WebSocket] = {}
        self.players: Dict[str, Player] = {}
        self.team_sizes: Dict[Team, int] = {Team.TEAM_A: 0, Team.TEAM_B: 0}
    
    def initialize_ships(self):
        """Create 10 ships for each team"""
        for team in Team:
            for i in range(10):
                ship_id = str(uuid.uuid4())
                self.ships[ship_id] = Ship(
                    id=ship_id,
                    # Spawn Ships slightly adjacent to each other for us to easily know which ship we are controlling
                    position={"x": i, "y": i},
                    velocity={"x": 0, "y": 0},
                    team=team
                )

    def add_bomb(self, ship_id: str, bomb_data) -> Bomb:
        bomb_id = str(uuid.uuid4())
        ship = self.ships[ship_id]
        bomb = Bomb(
            id=bomb_id,
            position=bomb_data["position"],
            ship_id=ship_id,
            team=ship.team,
            timestamp=bomb_data["timestmap"]
        )
        self.bombs[bomb_id] = bomb
        return bomb

    def get_available_ship(self, team: Team) -> Optional[str]:
        """Find an uncontrolled ship for the given team"""
        for ship_id, ship in self.ships.items():
            if ship.team == team and ship.controller_id is None:
                return ship_id
        return None

    # def get_leaderboard(self) -> List[dict]:
    #     """Get leaderboard grouped by team"""
    #     team_ships = {
    #         Team.TEAM_A: [],
    #         Team.TEAM_B: []
    #     }
        
    #     # Group ships by team
    #     for ship in self.ships.values():
    #         team_ships[ship.team].append({
    #             "ship_id": ship.id,
    #             "score": ship.score
    #         })
        
    #     # Sort ships within each team by score
    #     for team in team_ships:
    #         team_ships[team].sort(key=lambda x: x["score"], reverse=True)
        
    #     return {
    #         "team_a": team_ships[Team.TEAM_A],
    #         "team_b": team_ships[Team.TEAM_B]
    #     }

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
            message = {
                "type": "state_update",
                "ships": [
                    {
                        "id": ship.id,
                        "position": ship.position,
                        "velocity": ship.velocity,
                        "health": ship.health,
                        "team": ship.team.value,
                        "has_controller": ship.controller_id is not None,
                        "timestamp": ship.last_update
                    }
                    for ship in game_state.ships.values()
                ],
                "bombs": [
                    {
                        "id": bomb.id,
                        "position": bomb.position,
                        "ship_id": bomb.ship_id,
                        "team": bomb.team.value,
                        "timestamp": bomb.timestamp
                    }
                    for bomb in game_state.bombs.values()
                ],
                # "leaderboard": game_state.get_leaderboard()
            }
            
            for connection in game_state.connections.values():
                try:
                    await connection.send_text(json.dumps(message))
                except:
                    pass
        await asyncio.sleep(10)

@app.on_event("startup")
async def startup_event():
    game_state.initialize_ships()
    asyncio.create_task(broadcast_game_state())

@app.websocket("/joingame")
async def join_game_websocket(websocket: WebSocket, team: str):
    await websocket.accept()
    
    try:
        selected_team = Team(team)
    except ValueError:
        await websocket.close(code=4000, reason="Invalid team")
        return

    # Try to get available ship
    ship_id = game_state.get_available_ship(selected_team)
    if not ship_id:
        await websocket.close(code=4001, reason="No available ships")
        return
    
    # Generate player_id and setup player
    player_id = str(uuid.uuid4())
    game_state.players[player_id] = Player(id=player_id)
    game_state.ships[ship_id].controller_id = player_id
    game_state.players[player_id].controlled_ship_id = ship_id
    game_state.team_sizes[selected_team] += 1
    
    try:
        await websocket.send_text(json.dumps({
            "type": "init",
            "player_id": player_id,
            "team": selected_team.value,
            "ship_id": ship_id
        }))

        while True:
            data = await websocket.receive_text()
            message = json.loads(data)


    except WebSocketDisconnect:
        if player_id in game_state.players:
            if ship_id and ship_id in game_state.ships:
                game_state.ships[ship_id].controller_id = None
            del game_state.players[player_id]
            game_state.team_sizes[selected_team] -= 1

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    ship_id = str(uuid.uuid4())
    game_state.add_ship(ship_id)
    game_state.connections[ship_id] = websocket
    
    try:
        await websocket.send_text(json.dumps({
            "type": "init",
            "ship_id": ship_id
        }))
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "location_update":
                game_state.update_ship_location(ship_id, message["data"])
                
            elif message["type"] == "bomb_update":
                position = message["data"]["position"]
                game_state.add_bomb(position, ship_id)
            
            elif message["type"] == "player_communication":
                if "player_id" in message and message["player_id"] in game_state.player_connections:
                    player_socket = game_state.player_connections[message["player_id"]]
                    await player_socket.send_text(json.dumps(message))
                    
    except WebSocketDisconnect:
        del game_state.connections[ship_id]
        if ship_id in game_state.ships:
            del game_state.ships[ship_id]

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)