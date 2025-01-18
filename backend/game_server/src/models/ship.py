from dataclasses import dataclass
from typing import Dict
from .player import Player
from .enums import Position

@dataclass
class Ship:
    id: str
    position: dict  # {x: float, y: float}
    velocity: dict  # {x: float, y: float}
    players: Dict[str, Player]
    health: int = 100
    score: int = 0
    last_update: float = 0

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
