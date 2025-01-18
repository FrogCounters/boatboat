from fastapi import FastAPI
from src.network.websocket import handle_websocket_connection, broadcast_game_state
import asyncio

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(broadcast_game_state())



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)