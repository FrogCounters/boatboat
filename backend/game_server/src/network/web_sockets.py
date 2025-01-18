from fastapi import WebSocket, WebSocketDisconnect
import json
import asyncio
from ..core.game_state import GameState
from .messages import handle_message
from ..config import BROADCAST_INTERVAL

game_state = GameState()

async def broadcast_game_state():
    """Broadcast game state to all connected clients"""
    while True:
        if game_state.connections:
            state_data = game_state.serialize_state()
            
            for connection in game_state.connections.values():
                try:
                    await connection.send_text(json.dumps(state_data))
                except:
                    pass
                    
        await asyncio.sleep(BROADCAST_INTERVAL)

async def handle_websocket_connection(
    websocket: WebSocket,
    ship_id: str,
    player_id: str
):
    await websocket.accept()
    
    # Initialize ship if it doesn't exist
    if ship_id not in game_state.ships:
        game_state.add_ship(ship_id)
    
    game_state.connections[player_id] = websocket
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            await handle_message(message, game_state, ship_id, player_id, websocket)
                            
    except WebSocketDisconnect:
        del game_state.connections[player_id]
        if ship_id in game_state.ships:
            game_state.ships[ship_id].remove_player(player_id)
            if not game_state.ships[ship_id].players:
                del game_state.ships[ship_id]