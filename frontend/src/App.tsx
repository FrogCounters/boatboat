import { useEffect, useRef, useState } from "react";
import Game from "./game/Game";
import HealthBar from "./game/HealthBar";
import Leaderboard from "./game/Leaderboard";
import { WS_URL } from "./config";
import SimplePeer from "simple-peer";
import { Vec2D } from "./game/util";

const users = [
  { rank: 1, name: "Alice", uid: "1", point: 100 },
  { rank: 2, name: "Bob", uid: "2", point: 90 },
  { rank: 3, name: "Charlie", uid: "3", point: 80 },
  { rank: 4, name: "Donkey", uid: "4", point: 70 },
  { rank: 5, name: "Elephant", uid: "5", point: 75 },
  { rank: 6, name: "Flower", uid: "6", point: 70 },
];

type Player = {
  peer: SimplePeer.Instance;
  joystick: Vec2D;
  a: boolean;
  b: boolean;
};

function App() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const playersRef = useRef<{ [key: string]: Player }>({});
  const players = playersRef.current!;

  const uid = "6"; // Current player's unique ID

  useEffect(() => {
    const ws_ = new WebSocket(`${WS_URL}/ws`);
    ws_.onopen = () => {
      console.log("Connected to server");
      setWs(ws_);
    };

    ws_.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "signal") {
        const playerId = message.player_id;
        players[playerId].peer.signal(message.data);
      } else if (message.type == "ready") {
        const playerId = message.player_id;
        const peer = new SimplePeer({
          initiator: true,
          config: {
            iceServers: [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun.nextcloud.com:443" },
            ],
          },
        });
        peer.on("signal", (data) => {
          ws_.send(
            JSON.stringify({
              type: "player_communication",
              player_id: playerId,
              data,
            })
          );
        });
        peer.on("connect", () => {
          console.log("Connected to new controller", playerId);
        });
        peer.on("data", (data) => {
          console.log("Data from peer", playerId, data);
        });
        peer.on("disconnect", () => {
          peer.destroy();
          delete players[playerId];
        });
        players[playerId] = {
          peer,
          joystick: new Vec2D(0, 0),
          a: false,
          b: false,
        };
      } else {
        console.log("Unknown message type", message);
      }
    };

    return () => {
      ws_.close();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new Game(canvas);
    gameRef.current = game;

    const shipId = "1";
    const shipPosition = { x: 1000, y: 200, angle: 0 };
    game.initShip(shipId, shipPosition, [], { x: 0, y: 0 }, { x: 0, y: 0 });

    // Add obstacles
    for (let i = 0; i < 200; i++) {
      game.initObstacle({
        x: Math.random() * 5000,
        y: Math.random() * 5000,
      });
    }

    // Add current player to the ship
    // game.initPlayer(shipId, uid);

    // Center map on the ship
    game.centerMapOnShip(shipId);

    game.gameStart();

    return () => {
      game.stopGame();
    };
  }, []);

  return (
    <div className="w-[90vw] m-auto">
      <div className="justify-between flex my-5">
        <div className="box-border h-32 w-32 p-4 border-4">QR here</div>
        <HealthBar health={20} />
      </div>
      <div className="relative mt-5">
        <canvas
          ref={canvasRef}
          className="bg-blue-200"
          width={1280}
          height={720}
          style={{ width: "auto", height: "600px" }}
        />
        <div className="absolute top-1 right-1 opacity-70 bg-transparent">
          <Leaderboard users={users} uid={uid} />
        </div>
      </div>
    </div>
  );
}

export default App;
