from typing import Tuple
from ..models.ship import Ship
from ..models.bullet import Bullet

def check_collision(bullet: Bullet, ship: Ship) -> bool:
    bullet_pos = bullet.position
    ship_pos = ship.position
    
    dx = bullet_pos["x"] - ship_pos["x"]
    dy = bullet_pos["y"] - ship_pos["y"]
    distance = (dx * dx + dy * dy) ** 0.5
    
    return distance < 50  # Collision radius