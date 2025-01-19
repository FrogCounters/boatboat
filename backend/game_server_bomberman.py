from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
import uvicorn
from typing import Dict
import json
import asyncio
from enum import Enum
import uuid

app = FastAPI()

class Team(Enum):
    TEAM_A = "team_a"
    TEAM_B = "team_b"

    @classmethod
    def get_opposite_team(cls, team):
        return cls.TEAM_B if team == cls.TEAM_A else cls.TEAM_A

# Track WebSocket connections
team_connections: Dict[Team, WebSocket] = {}  # Team websocket connections
player_connections: Dict[str, WebSocket] = {}  # Player websocket connections

@app.websocket("/joingame")
async def join_game_websocket(websocket: WebSocket, team: str):
    """
    WebSocket endpoint for player-server communication.
    Simply forwards messages to the team.
    """
    await websocket.accept()
    
    try:
        selected_team = Team(team)
    except ValueError:
        await websocket.close(code=4000, reason="Invalid team")
        return
        
    if selected_team not in team_connections:
        await websocket.close(code=4001, reason="Team not connected")
        return

    # Generate player_id for identification
    player_id = str(uuid.uuid4())

    # Store player connection
    player_connections[player_id] = websocket
    
    try:
        # Send initial player_id created back to the player
        await websocket.send_text(json.dumps({
            "type": "init",
            "player_id": player_id
        }))

        # Forward all messages to the team
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Add player_id to message before forwarding
            message["player_id"] = player_id
            
            # Forward to team connection
            team_socket = team_connections[selected_team]
            await team_socket.send_text(json.dumps(message))
                
    except WebSocketDisconnect:
        if player_id in player_connections:
            del player_connections[player_id]

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, team: str):
    """
    WebSocket endpoint for team-server communication.
    Each team maintains one connection.
    """
    await websocket.accept()
    
    try:
        selected_team = Team(team)
    except ValueError:
        await websocket.close(code=4000, reason="Invalid team")
        return

    if selected_team in team_connections:
        await websocket.close(code=4001, reason="Team already connected")
        return
        
    # Store team connection
    team_connections[selected_team] = websocket
    
    try:
        # Send initial confirmation
        await websocket.send_text(json.dumps({
            "type": "init",
            "team": selected_team.value
        }))
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "bomb_update":
                # Forward bomb update to opposite team
                opposite_team = Team.get_opposite_team(selected_team)
                if opposite_team in team_connections:
                    await team_connections[opposite_team].send_text(json.dumps(message))
            
            elif message["type"] == "player_communication":
                if "player_id" in message and message["player_id"] in player_connections:
                    player_socket = player_connections[message["player_id"]]
                    await player_socket.send_text(json.dumps(message))
                    
    except WebSocketDisconnect:
        del team_connections[selected_team]

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)