from typing import Dict, List
from fastapi import WebSocket
import json
from ..models.ship import Ship
from ..models.bullet import Bullet
from ..config import BROADCAST_INTERVAL
import uuid

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

    def serialize_state(self) -> dict:
        """Convert current game state to JSON-serializable format"""
        return {
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
                for ship in self.ships.values()
            ],
            "bullets": [
                {
                    "id": bullet.id,
                    "position": bullet.position,
                    "angle": bullet.angle,
                    "timestamp": bullet.timestamp
                }
                for bullet in self.bullets.values()
            ],
            "leaderboard": self.get_leaderboard()
        }