from typing import Dict, Any
from ..core.game_state import GameState
from ..core.collision import check_collision
from ..models.enums import Position
import json

async def handle_message(
    message: Dict[str, Any],
    game_state: GameState,
    ship_id: str,
    player_id: str,
    websocket
):
    """Handle incoming WebSocket messages"""
    if message["type"] == "location_update":
        game_state.update_ship_location(ship_id, message["data"])
        
    elif message["type"] == "bullet_update":
        bullet = game_state.add_bullet(message["data"], ship_id, player_id)
        
        # Check for collisions
        for other_ship in game_state.ships.values():
            if other_ship.id != ship_id:
                if check_collision(bullet, other_ship):
                    other_ship.health -= 10
                    game_state.ships[ship_id].score += 1
                    del game_state.bullets[bullet.id]
                    break

    elif message["type"] == "position_update":
        new_position = Position(message["data"]["position"])
        success = game_state.ships[ship_id].move_player(
            player_id,
            new_position
        )
        await websocket.send_text(json.dumps({
            "type": "position_update_response",
            "success": success
        }))
        
    elif message["type"] == "join_position":
        position = Position(message["data"]["position"])
        success = game_state.ships[ship_id].add_player(
            player_id,
            position
        )
        await websocket.send_text(json.dumps({
            "type": "join_position_response",
            "success": success
        }))