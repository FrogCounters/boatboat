import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { Vec2D } from "./game/util";

const Button = () => {
  return (
    <button className="w-24 h-24 bg-gray-400 flex justify-center items-center shadow-xl">
      <div className="w-20 h-20 rounded-full bg-red-700 shadow-xl"></div>
    </button>
  );
};

const Joystick = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const joystickPosRef = useRef<Vec2D>(new Vec2D(125, 125));
  const anchorPosRef = useRef<Vec2D>(new Vec2D(125, 125));

  const draw = () => {
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
  };

  const onTouchStart = (touchEvent: TouchEvent) => {
    touchEvent.preventDefault();
    anchorPosRef.current!.x = touchEvent.touches[0].clientX
    anchorPosRef.current!.y = touchEvent.touches[0].clientY;
  }
  
  const onTouchMove = (touchEvent: TouchEvent) => {
    touchEvent.preventDefault();
    const endPos = new Vec2D(touchEvent.touches[0].clientX, touchEvent.touches[0].clientY);
    let delta = endPos.subtract(anchorPosRef.current!);
    if (delta.magnitude() > 50) {
      delta = delta.normalize().multiply(50);
    }

    joystickPosRef.current!.x = 125 + delta.x;
    joystickPosRef.current!.y = 125 + delta.y;
    draw();
  }

  const onTouchEnd = (touchEvent: TouchEvent) => {
    touchEvent.preventDefault();
    anchorPosRef.current!.x = 125;
    anchorPosRef.current!.x = 125;
    joystickPosRef.current!.x = 125;
    joystickPosRef.current!.y = 125;
    draw();
  }

  useEffect(() => {
    const canvas = canvasRef.current!;
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    draw();

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, []);


  return (
    <canvas ref={canvasRef} width={250} height={250}></canvas>
  );
}

const Join = () => {
  const [searchParams] = useSearchParams();
  const shipId = searchParams.get("shipId");
  return (
    <main className="w-screen h-screen bg-gray-400 p-4">
      <div className="w-full h-full bg-gray-800 flex flex-col justify-around">
        <div className="mx-auto">
          <Joystick />
        </div>
        <div className="buttons flex flex-col gap-4 ml-12">
          <Button />
          <Button />
        </div>
      </div>
    </main>
  );
};

export default Join;
