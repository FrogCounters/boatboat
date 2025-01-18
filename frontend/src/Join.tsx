import { PointerEventHandler, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Vec2D } from "./game/util";
import { WS_URL } from "./config";
import SimplePeer from "simple-peer";

const Button = ({
  btnUpdate,
}: {
  btnUpdate: (isButtonPressed: boolean) => void;
}) => {
  return (
    <button
      onPointerDown={() => btnUpdate(true)}
      onPointerUp={() => btnUpdate(false)}
      className="w-24 h-24 bg-gray-400 flex justify-center items-center shadow-xl"
    >
      <div className="w-20 h-20 rounded-full bg-red-700 shadow-xl"></div>
    </button>
  );
};

const Joystick = ({
  joyUpdate,
}: {
  joyUpdate: (magnitude: number, angle: number) => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const joystickPosRef = useRef<Vec2D>(new Vec2D(125, 125));
  const anchorPosRef = useRef<Vec2D>(new Vec2D(125, 125));

  const drawAndUpdate = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const joystickPos = joystickPosRef.current!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the joystick
    ctx.beginPath();
    ctx.arc(125, 125, 125, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(joystickPos.x, joystickPos.y, 50, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Update
    const delta = joystickPos.subtract(new Vec2D(125, 125));
    joyUpdate(delta.magnitude() / 50, delta.angle());
  };

  const onTouchStart = (touchEvent: TouchEvent) => {
    touchEvent.preventDefault();
    anchorPosRef.current!.x = touchEvent.touches[0].clientX;
    anchorPosRef.current!.y = touchEvent.touches[0].clientY;
  };

  const onTouchMove = (touchEvent: TouchEvent) => {
    touchEvent.preventDefault();
    const endPos = new Vec2D(
      touchEvent.touches[0].clientX,
      touchEvent.touches[0].clientY
    );
    let delta = endPos.subtract(anchorPosRef.current!);
    if (delta.magnitude() > 50) {
      delta = delta.normalize().multiply(50);
    }

    joystickPosRef.current!.x = 125 + delta.x;
    joystickPosRef.current!.y = 125 + delta.y;
    drawAndUpdate();
  };

  const onTouchEnd = (touchEvent: TouchEvent) => {
    touchEvent.preventDefault();
    anchorPosRef.current!.x = 125;
    anchorPosRef.current!.x = 125;
    joystickPosRef.current!.x = 125;
    joystickPosRef.current!.y = 125;
    drawAndUpdate();
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    drawAndUpdate();

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [joyUpdate]);

  return <canvas ref={canvasRef} width={250} height={250}></canvas>;
};

const Join = () => {
  const [searchParams] = useSearchParams();
  const shipId = searchParams.get("shipId");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [peer, setPeer] = useState<SimplePeer.Instance | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!shipId) return;
    const ws_ = new WebSocket(`${WS_URL}/joinship?ship_id=${shipId}`);
    const peer = new SimplePeer({
      initiator: false,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun.nextcloud.com:443" },
        ],
      },
    });
    peer.on("signal", (data) => {
      ws_.send(JSON.stringify({ type: "signal", data }));
    });
    peer.on("connect", () => {
      console.log("Connected to peer");
      setIsConnected(true);
    });
    peer.on("close", () => {
      peer.destroy();
      setPeer(null);
      setIsConnected(false);
    });
    setPeer(peer);

    ws_.onopen = () => {
      setWs(ws_);
      ws_.send(JSON.stringify({ type: "ready" }));
    };
    ws_.onmessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data);
      if (message.type === "player_communication") {
        peer.signal(message.data);
      } else {
        console.log("Unknown message type", message);
      }
    };
    ws_.onclose = () => {
      setWs(null);
    };

    return () => {
      ws_.close();
    };
  }, [shipId]);

  return (
    <main className="w-screen h-screen bg-gray-400 p-4">
      <div className="w-full h-full bg-gray-800 flex flex-col justify-around">
        <div className="mx-auto">
          <Joystick
            joyUpdate={(magnitude, angle) => {
              if (isConnected && peer != null) {
                // console.log("joyUpdate", magnitude, angle, isConnected, peer);
                peer.send(
                  JSON.stringify({
                    type: "joystick",
                    magnitude,
                    angle,
                  })
                );
              }
            }}
          />
        </div>
        <div className="buttons flex flex-col gap-4 ml-12">
          <Button
            btnUpdate={(isButtonPressed) => {
              if (isConnected && peer != null) {
                // console.log("isConnected", isConnected);
                peer.send(
                  JSON.stringify({
                    type: "a",
                    data: isButtonPressed,
                  })
                );
              }
            }}
          />
          <Button
            btnUpdate={(isButtonPressed) => {
              if (isConnected && peer != null) {
                peer.send(
                  JSON.stringify({
                    type: "b",
                    data: isButtonPressed,
                  })
                );
              }
            }}
          />
        </div>
      </div>
    </main>
  );
};

export default Join;
