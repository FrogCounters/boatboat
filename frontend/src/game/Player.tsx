import { Vec2D } from "./util";
import Ship from "./Ship";
import PlayerSrc from "../assets/sprites/Pirates/Pirate0.png";
const PlayerImg = new Image();
PlayerImg.src = PlayerSrc;

class Person {
  constructor(
    public id: string,

    // position should be relative to ship position
    public position: Vec2D = new Vec2D(0, 0),
    public velocity: Vec2D = new Vec2D(0, 0),
    public acceleration: Vec2D = new Vec2D(0, 0),
    public ship: Ship | null = null
  ) {}

  update(delta: number, maxSpeed: number) {
    this.position = this.position.add(this.velocity.multiply(delta));
    this.velocity = this.velocity.add(this.acceleration.multiply(delta));

    this.velocity.x = Math.max(-maxSpeed, Math.min(maxSpeed, this.velocity.x));
    this.velocity.y = Math.max(-maxSpeed, Math.min(maxSpeed, this.velocity.y));

    /*if (this.ship) {
      this.position.x = this.ship.position.x;
      this.position.y = this.ship.position.y;
    }*/
  }

  draw(
    context: CanvasRenderingContext2D | null,
    mapCoordinates: { x: number; y: number }
  ) {
    if (!context || !mapCoordinates) {
      return;
    }

    const mappedX = this.position.x - mapCoordinates.x;
    const mappedY = this.position.y - mapCoordinates.y;

    context.fillStyle = "blue";
    context.beginPath();
    context.arc(mappedX, mappedY, 20, 0, 2 * Math.PI);
    context.fill();
  }

  assignToShip(ship: Ship) {
    this.ship = ship;
    this.position.x = ship.position.x;
    this.position.y = ship.position.y;
  }
}

export default Person;
