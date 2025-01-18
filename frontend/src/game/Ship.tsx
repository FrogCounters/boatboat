import { Vec2D } from "./util";

class Ship {
  constructor(
    public id: string,
    public position: Vec2D,
    public players: string[] = [],
    public velocity: Vec2D = new Vec2D(0, 0),
    public acceleration: Vec2D = new Vec2D(0, 0)
  ) {}

  update(delta: number, maxSpeed: number) {
    this.velocity = this.velocity.add(this.acceleration.multiply(delta));
    console.log(this.velocity, this.velocity.angle());

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

    this.position = this.position.add(this.velocity.multiply(delta));
  }

  addPlayer(playerId: string) {
    if (!this.players.includes(playerId)) {
      this.players.push(playerId);
    }
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

    const width = 250;
    const height = 200;

    const mappedX = this.position.x - mapCoordinates.x;
    const mappedY = this.position.y - mapCoordinates.y;

    context.fillStyle = "grey";
    context.fillRect(mappedX - width / 2, mappedY - height / 2, width, height);
  }
}

export default Ship;
