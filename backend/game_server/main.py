from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse
import asyncio
import json
import uuid
from typing import Dict, Optional

app = FastAPI()

# Track player to ship mapping
player_ship_mapping: Dict[str, str] = {}

@app.get("/joinship")
async def join_ship(ship_id: str):
    """
    REST endpoint to join a ship.
    Generates and returns a player UUID that will be used for WebSocket connection.
    """
    player_id = str(uuid.uuid4())
    player_ship_mapping[player_id] = ship_id
    
    return JSONResponse({
        "player_id": player_id,
        "ship_id": ship_id
    })

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for game communication.
    Requires player_id in initial connection message to identify the player and their ship.
    """
    await websocket.accept()
    
    try:
        # Wait for initial connection message with player_id
        initial_msg = await websocket.receive_text()
        data = json.loads(initial_msg)
        
        if 'player_id' not in data:
            await websocket.close(code=4000, reason="No player_id provided")
            return
            
        player_id = data['player_id']
        
        # Check if player_id exists in our mapping
        if player_id not in player_ship_mapping:
            await websocket.close(code=4001, reason="Invalid player_id")
            return
            
        ship_id = player_ship_mapping[player_id]
        
        # Initialize ship if it doesn't exist
        if ship_id not in game_state.ships:
            game_state.add_ship(ship_id)
        
        game_state.connections[player_id] = websocket
        
        try:
            while True:
                message = await websocket.receive_text()
                data = json.loads(message)
                
                if data["type"] == "location_update":
                    game_state.update_ship_location(ship_id, data["data"])
                    
                elif data["type"] == "bullet_update":
                    bullet = game_state.add_bullet(data["data"], ship_id, player_id)
                    
                    # Check for collisions
                    for other_ship in game_state.ships.values():
                        if other_ship.id != ship_id:
                            if check_collision(bullet, other_ship):
                                other_ship.health -= 10
                                game_state.ships[ship_id].score += 1
                                del game_state.bullets[bullet.id]
                                break

                elif data["type"] == "position_update":
                    new_position = Position(data["data"]["position"])
                    success = game_state.ships[ship_id].move_player(
                        player_id,
                        new_position
                    )
                    await websocket.send_text(json.dumps({
                        "type": "position_update_response",
                        "success": success
                    }))
                    
                elif data["type"] == "join_position":
                    position = Position(data["data"]["position"])
                    success = game_state.ships[ship_id].add_player(
                        player_id,
                        position
                    )
                    await websocket.send_text(json.dumps({
                        "type": "join_position_response",
                        "success": success
                    }))
                    
        except WebSocketDisconnect:
            # Cleanup on disconnect
            del game_state.connections[player_id]
            if ship_id in game_state.ships:
                game_state.ships[ship_id].remove_player(player_id)
                if not game_state.ships[ship_id].players:
                    del game_state.ships[ship_id]
            del player_ship_mapping[player_id]
            
    except WebSocketDisconnect:
        # Handle disconnect during initial setup
        pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)