import { Controller, Vec2D } from "./util";

interface Drawable {
  draw(position: Vec2D, rotation: number, delta: number, context: CanvasRenderingContext2D): void;
}

class Entity {
  position: Vec2D;
  velocity: Vec2D;
  acceleration: Vec2D;
  maxSpeed: number;
  drawable: Drawable;

  constructor(
    position: Vec2D,
    velocity: Vec2D = new Vec2D(0, 0),
    acceleration: Vec2D = new Vec2D(0, 0),
    maxSpeed: number = 0,
    drawable: Drawable
  ) {
    this.position = position;
    this.velocity = velocity;
    this.acceleration = acceleration;
    this.maxSpeed = maxSpeed;
    this.drawable = drawable;
  }

  update(delta: number) {
    this.position = this.position.add(this.velocity.multiply(delta));
    this.velocity = this.velocity.add(this.acceleration.multiply(delta));
    let speed = Math.min(this.velocity.magnitude(), this.maxSpeed);
    this.velocity = this.velocity.normalize().multiply(speed);
  }

  draw(delta: number, context: CanvasRenderingContext2D) {
    this.drawable.draw(this.position, this.velocity.angle(), delta, context);
  }
}

class ShipSprite implements Drawable {
  draw(position: Vec2D, rotation: number, delta: number, context: CanvasRenderingContext2D): void {
    context.fillStyle = "black";
    context.beginPath();
    context.arc(position.x, position.y, 20, 0, 2 * Math.PI);
    context.fill();
  }
}

class Ship extends Entity {
  hasBomb: boolean = true
  alive: boolean = true
  static readonly MAX_SPEED: number = 200

  constructor(
    position: Vec2D,
  ) {
    super(position, new Vec2D(0, 0), new Vec2D(0, 0), Ship.MAX_SPEED, new ShipSprite());
  }

  update(delta: number) {
    super.update(delta);
  }

  draw(delta: number, context: CanvasRenderingContext2D): void {
    super.draw(delta, context);
  }
}

const WIDTH = 1280;
const HEIGHT = 720;
class Game {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  previousTimestamp: number = -1;
  isRunning: boolean = false;
  ships: Array<Ship> = [];
  controllers: Map<string, Controller> = new Map();
  playerToAlpha: Map<string, string> = new Map();
  playerToBoat: Map<string, number> = new Map();

  constructor(canvas: HTMLCanvasElement, controllers: Map<string, Controller>) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d")!;
    this.doTick = this.doTick.bind(this);
    this.controllers = controllers;
  }

  init() {
    // Initialize 10 ships
    for (let i = 0; i < 1; i++) {
      const position = new Vec2D(Math.random() * WIDTH, Math.random() * HEIGHT);
      this.ships.push(new Ship(position));
    }
  }

  doTick(currentTimestamp: number) {
    // Skip the first frame
    if (this.previousTimestamp < 0) {
      this.previousTimestamp = currentTimestamp;
      window.requestAnimationFrame(this.doTick);
      return;
    }
    if (!this.isRunning) return;

    const delta = (currentTimestamp - this.previousTimestamp) / 1000;
    this.previousTimestamp = currentTimestamp;

    this.update(delta);
    this.draw(delta);
    window.requestAnimationFrame(this.doTick);
  }

  start() {
    this.isRunning = true;
    window.requestAnimationFrame(this.doTick);
  }

  stop() {
    this.isRunning = false;
  }

  update(delta: number) {
    this.ships.forEach(ship => {
      ship.update(delta);
    });

    // Decel
    for (let ship of this.ships) {
      ship.acceleration = ship.velocity.normalize().multiply(-40);
    }

    // Controller
    let inUse = new Set<number>();
    for (let [playerId, controller] of this.controllers) {
      if (!this.playerToBoat.has(playerId)) continue;
      const idx = this.playerToBoat.get(playerId)!;
      const ship = this.ships[idx];
      if (controller.joystick.magnitude > 0) {
        ship.acceleration = new Vec2D(
          Math.cos(controller.joystick.angle),
          Math.sin(controller.joystick.angle)
        ).multiply(controller.joystick.magnitude * 100);
      }
      inUse.add(idx);
    }

    // Assign 
    for (let [playerId, controller] of this.controllers) {
      if (!this.playerToBoat.has(playerId)) {
        for (let i = 0; i < this.ships.length; i++) {
          if (!inUse.has(i)) {
            this.playerToBoat.set(playerId, i);
            break;
          }
        }
      }
    }

    // asdasd
    for (let ship of this.ships) {
      // console.log(ship.velocity, ship.acceleration);
    }
  }

  draw(delta: number) {
    this.context.clearRect(0, 0, WIDTH, HEIGHT);
    this.ships.forEach(ship => {
      ship.draw(delta, this.context);
    });
  }
}

export default Game;
