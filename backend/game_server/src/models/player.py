from dataclasses import dataclass
from enums import Position

@dataclass
class Player:
    id: str
    position: Position
    relative_pos: dict  # {x: float, y: float}