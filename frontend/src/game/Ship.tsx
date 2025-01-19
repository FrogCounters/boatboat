import { Vec2D, Controller } from "./util";
import Player from "./Player";
import BoatSrc from "../assets/sprites/boat.png";
const BoatImg = new Image();
BoatImg.src = BoatSrc;

class Ship {
  constructor(
    public id: string,
    public position: Vec2D,
    public controllers: Map<string, Controller>,
    public players: Map<string, Player>,
    public velocity: Vec2D = new Vec2D(0, 0),
    public acceleration: Vec2D = new Vec2D(0, 0)
  ) {}

  update(delta: number, maxSpeed: number) {
    this.position = this.position.add(this.velocity.multiply(delta));
    this.velocity = this.velocity.add(this.acceleration.multiply(delta));
    // console.log(this.velocity, this.velocity.angle());

    // TODO: Cap velocity to max speed
    this.velocity = this.capVelocity(maxSpeed);

    if (Math.abs(this.velocity.x) < 0.1) {
      this.velocity.x = 0;
      this.acceleration.x = 0;
    }
    if (Math.abs(this.velocity.y) < 0.1) {
      this.velocity.y = 0;
      this.acceleration.y = 0;
    }

    // Update players
    for (const [playerId, controller] of this.controllers) {
      const player = this.players.get(playerId);
      if (!player) continue;
      if (controller.joystick.magnitude > 0) {
        player.acceleration = new Vec2D(
          Math.cos(controller.joystick.angle) * controller.joystick.magnitude,
          Math.sin(controller.joystick.angle) * controller.joystick.magnitude
        ).multiply(30);
        console.log("player accel", player.acceleration, playerId);
      } else {
        player.acceleration = player.velocity.normalize().multiply(-40);
      }
    }
  }

  addPlayer(playerId: string) {
    /*
    if (!this.players.includes(playerId)) {
      this.players.push(playerId);
    }
    */
  }

  capVelocity(maxSpeed: number): Vec2D {
    return new Vec2D(
      Math.max(-maxSpeed, Math.min(maxSpeed, this.velocity.x)),
      Math.max(-maxSpeed, Math.min(maxSpeed, this.velocity.y))
    );
  }

  draw(
    context: CanvasRenderingContext2D | null,
    mapCoordinates: { x: number; y: number }
  ) {
    if (!context || !mapCoordinates) {
      return;
    }

    const width = 581;
    const height = 420;

    const mappedX = this.position.x - mapCoordinates.x;
    const mappedY = this.position.y - mapCoordinates.y;

    context.save();
    context.translate(mappedX, mappedY);
    context.rotate(this.velocity.angle());
    context.drawImage(BoatImg, -width / 2, -height / 2);
    context.restore();

    context.fillStyle = "red";
    context.beginPath();
    context.arc(mappedX, mappedY, 20, 0, 2 * Math.PI);
    context.fill();
  }
}

export default Ship;
