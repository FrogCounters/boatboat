from dataclasses import dataclass

@dataclass
class Bullet:
    id: str
    position: dict  # {x: float, y: float}
    angle: float
    ship_id: str
    player_id: str
    timestamp: float
