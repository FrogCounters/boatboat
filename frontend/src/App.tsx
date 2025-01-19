import { useEffect, useRef, useState } from "react";
import Game from "./game/Hmm";
import HealthBar from "./game/HealthBar";
import Leaderboard from "./game/Leaderboard";
import { WS_URL } from "./config";
import SimplePeer from "simple-peer";
import { Vec2D, Controller } from "./game/util";
import { QRCodeSVG } from "qrcode.react";

const users = [
  { rank: 1, name: "Alice", uid: "1", point: 100 },
  { rank: 2, name: "Bob", uid: "2", point: 90 },
  { rank: 3, name: "Charlie", uid: "3", point: 80 },
  { rank: 4, name: "Donkey", uid: "4", point: 70 },
  { rank: 5, name: "Elephant", uid: "5", point: 75 },
  { rank: 6, name: "Flower", uid: "6", point: 70 },
];

function App() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const playersRef = useRef<Map<string, Controller>>(new Map());
  const players = playersRef.current!;
  const [shipId, setShipId] = useState<string | null>(null);
  const shipIdRef = useRef<string | null>(null);

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
        players.get(playerId)?.peer.signal(message.data);
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
        const player = {
          peer,
          joystick: { magnitude: 0, angle: 0 },
          a: false,
          b: false,
        };
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
          // gameRef.current?.initPlayer(shipIdRef.current!, playerId);
        });
        peer.on("data", (data) => {
          const message = JSON.parse(data);
          // console.log("Data from peer", playerId, message);
          if (message.type == "a") {
            player.a = message.data;
          } else if (message.type == "b") {
            player.b = message.data;
          } else if (message.type == "joystick") {
            player.joystick.magnitude = message.magnitude;
            player.joystick.angle = message.angle;
          } else {
            console.log("unknown webrtc message from", playerId);
          }
        });
        peer.on("disconnect", () => {
          peer.destroy();
          players.delete(playerId);
        });
        players.set(playerId, player);
      } else if (message.type == "init") {
        setShipId(message.ship_id);
        shipIdRef.current = message.ship_id;
        console.log("Ship ID", message.ship_id);
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
    if (!shipId) return;

    const game = new Game(canvas, players);
    gameRef.current = game;
    game.init();
    game.start();

    return () => {
      game.stop();
    };
  }, [shipId]);

  return (
    <div className="w-[90vw] m-auto">
      <div className="justify-between flex my-5">
        <div className="box-border h-32 w-32">
          <QRCodeSVG value={shipId ? shipId : ""} />
        </div>
        <HealthBar health={20} />
      </div>
      <div className="relative mt-5 w-[100%]">
        <canvas
          ref={canvasRef}
          className="bg-blue-200"
          width={1280}
          height={720}
          style={{ width: "auto", height: "600px" }}
        />
        <div className="absolute top-1 right-1 opacity-70 bg-transparent">
          {/*<Leaderboard users={users} uid={uid} />*/}
        </div>
      </div>
    </div>
  );
}

export default App;
