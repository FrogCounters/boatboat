import { useEffect, useRef, useState } from "react";
import Game from "./game/Hmm";
import HealthBar from "./game/HealthBar";
import { URL, WS_URL } from "./config";
import SimplePeer from "simple-peer";
import { Vec2D, Controller } from "./game/util";
import { QRCodeSVG } from "qrcode.react";
import { useSearchParams } from "react-router";

function App() {
  const [searchParams] = useSearchParams();
  const teamIdParam = searchParams.get("teamId");
  console.log(teamIdParam)

  const [ws, setWs] = useState<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const playersRef = useRef<Map<string, Controller>>(new Map());
  const players = playersRef.current!;
  const [shipId, setShipId] = useState<string | null>(null);
  const shipIdRef = useRef<string | null>(null);
  const bombQRef = useRef<Array<Vec2D>>([]);

  useEffect(() => {
    const ws_ = new WebSocket(`${WS_URL}/ws?team=${teamIdParam}`);
    ws_.onopen = () => {
      console.log("Connected to server");
      setWs(ws_);
    };

    ws_.onmessage = (event) => {
      const message = JSON.parse(event.data);
      // console.log("recvd", message)
      if (message.type === "signal") {
        const playerId = message.player_id;
        players.get(playerId)?.peer.signal(message.data);
      } else if (message.type == "a") {
        const player = players.get(message.player_id)!;
        player.a = message.data;
      } else if (message.type == "b") {
        const player = players.get(message.player_id)!;
        player.b = message.data;
      } else if (message.type == "joystick") {
        const player = players.get(message.player_id)!;
        player.joystick.magnitude = message.magnitude;
        player.joystick.angle = message.angle;
      } else if (message.type == "ready") {
        const playerId = message.player_id;
        const player = {
          peer: new SimplePeer({}),
          joystick: { magnitude: 0, angle: 0 },
          a: false,
          b: false,
        };
        players.set(playerId, player);
        return;
        /*
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
        */
      } else if (message.type == "init") {
        setShipId(message.team);
        shipIdRef.current = message.team;
        console.log("Ship ID", message.team);
      } else if (message.type == "bomb_update") {
        const position = new Vec2D(message.x, message.y);
        bombQRef.current.push(position);
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
    if (!ws) return;

    const game = new Game(canvas, players, ws, bombQRef.current);
    gameRef.current = game;
    game.init();
    game.start();

    return () => {
      game.stop();
    };
  }, [ws, shipId]);

  const url = `${URL}/join?shipId=${shipId}`;
  return (
    <div className="w-[95vw] m-auto mt-5 flex">
      <canvas
        ref={canvasRef}
        className="bg-blue-200"
        width={1280}
        height={720}
        style={{ width: "auto", height: "90vh" }}
      />
      <div className="m-[auto] flex flex-col items-center justify-center ml-3">
        <div className="box-border">
          <QRCodeSVG value={url} size={200} />
        </div>

        <div className="mt-5">
          <HealthBar yourHealth={100} opponentHealth={30} />
        </div>
      </div>
    </div>
  );
}

export default App;
