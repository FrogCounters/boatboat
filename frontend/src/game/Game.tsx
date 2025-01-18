import { Vec2D, Controller } from "./util";
import Ship from "./Ship";
import Player from "./Player";

class Game {
  private context: CanvasRenderingContext2D | null;

  private shipId: string;
  private ships: Map<string, Ship> = new Map();
  private players: Map<string, Player> = new Map();
  private obstacles: Vec2D[] = [];
  private canvas: HTMLCanvasElement;
  private controllers: Map<string, Controller>;

  private mapCoordinates = { x: 0, y: 0 };
  private viewportWidth = 1280;
  private viewportHeight = 720;

  private previousTimestamp = 0;
  private isRunning = false;

  private acceleration = 100;
  private deceleration = 50;
  private maxSpeed = 200;

  constructor(canvas: HTMLCanvasElement, shipId: string, controllers: Map<string, Controller>) {
    this.canvas = canvas;
    this.shipId = shipId;
    this.controllers = controllers;
    this.context = canvas.getContext("2d");
    if (!this.context) {
      throw new Error("Failed to get canvas context");
    }

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  initShip(shipId: string, position: Vec2D, controllers: Map<string, Controller> = new Map(), players: Map<string, Player> = new Map()) {
    this.ships.set(shipId, new Ship(shipId, position, controllers, players));
  }

  initObstacle(position: Vec2D) {
    this.obstacles.push(position);
  }

  initPlayer(shipId: string, uid: string) {
    const ship = this.ships.get(shipId);
    if (!ship) {
      console.error(`Ship with ID ${shipId} does not exist.`);
      return;
    }

    const player = new Player(uid);
    player.assignToShip(ship);

    this.players.set(uid, player);
    ship.addPlayer(uid);
  }

  handleKeyDown = (event: KeyboardEvent) => {
    event.preventDefault();
    const ship = this.ships.get(this.shipId);

    if (ship) {
      switch (event.key) {
        case "ArrowUp":
          ship.acceleration.y = -this.acceleration;
          break;
        case "ArrowDown":
          ship.acceleration.y = this.acceleration;
          break;
        case "ArrowLeft":
          ship.acceleration.x = -this.acceleration;
          break;
        case "ArrowRight":
          ship.acceleration.x = this.acceleration;
          break;
        default:
          return;
      }
    }
  };

  handleKeyUp = (event: KeyboardEvent) => {
    event.preventDefault();
    const ship = this.ships.get(this.shipId);

    if (ship) {
      switch (event.key) {
        case "ArrowUp":
          ship.acceleration.y =
            ship.velocity.y > 0 ? -this.deceleration : this.deceleration;
          break;
        case "ArrowDown":
          ship.acceleration.y =
            ship.velocity.y < 0 ? this.deceleration : -this.deceleration;
          break;
        case "ArrowLeft":
          ship.acceleration.x =
            ship.velocity.x > 0 ? -this.deceleration : this.deceleration;
          break;
        case "ArrowRight":
          ship.acceleration.x =
            ship.velocity.x < 0 ? this.deceleration : -this.deceleration;
          break;
        default:
          return;
      }
    }
  };

  centerMapOnShip(shipId: string) {
    const ship = this.ships.get(shipId);

    if (ship) {
      const { position } = ship;

      this.mapCoordinates.x = position.x - this.viewportWidth / 2;
      this.mapCoordinates.y = position.y - this.viewportHeight / 2;
    }
  }

  update(delta: number) {
    this.players.forEach((player) => {
      player.update(delta, this.maxSpeed);
    });

    this.ships.forEach((ship, shipId) => {
      ship.update(delta, this.maxSpeed);

      // Recenter map on the ship being controlled
      this.centerMapOnShip(this.shipId);
    });
  }

  drawObstacle(position: Vec2D) {
    if (this.context) {
      this.context.fillStyle = "#00ff00";
      const width = 30;
      const height = 30;

      const mappedX = position.x - this.mapCoordinates.x;
      const mappedY = position.y - this.mapCoordinates.y;

      this.context.fillRect(
        mappedX - width / 2,
        mappedY - height / 2,
        width,
        height
      );
    }
  }

  draw() {
    if (this.context) {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Draw obstacles
      this.obstacles.forEach((obstacle) => {
        this.drawObstacle(obstacle);
      });

      // Draw ships
      this.ships.forEach((ship) => {
        ship.draw(this.context, this.mapCoordinates);
      });

      // Draw players
      this.players.forEach((player) => {
        player.draw(this.context, this.mapCoordinates);
      });

      // Display debug information
      this.context.fillStyle = "#000000";
      this.context.font = "16px Arial";
      this.context.fillText(
        `Map Coordinates: x: ${this.mapCoordinates.x}, y: ${
          this.mapCoordinates.y
        }\n
          Acceleration: ${this.ships.get(this.shipId)?.acceleration.x}, ${
          this.ships.get(this.shipId)?.acceleration.y
        }\n
          Velocity: ${this.ships.get(this.shipId)?.velocity.x}, ${
          this.ships.get(this.shipId)?.velocity.y
        }`,
        10,
        20
      );
    }
  }

  gameStart(shipPosition: Vec2D) {
    this.isRunning = true;

    this.initShip(this.shipId, shipPosition, this.controllers, this.players);

    // Add obstacles
    for (let i = 0; i < 200; i++) {
      this.initObstacle(new Vec2D(Math.random() * 5000, Math.random() * 5000));
    }

    // Center map on the ship
    this.centerMapOnShip(this.shipId);

    this.previousTimestamp = performance.now();
    window.requestAnimationFrame(this.doTick);
  }

  doTick = (currentTimestamp: number) => {
    if (!this.isRunning) return;

    const delta = (currentTimestamp - this.previousTimestamp) / 1000;
    this.previousTimestamp = currentTimestamp;

    this.update(delta);
    this.draw();

    window.requestAnimationFrame(this.doTick);
  };

  stopGame() {
    this.isRunning = false;
  }

  getPlayersInShip(shipId: string) {
    const ship = this.ships.get(shipId);
    return ship ? ship.players : [];
  }

  getShipById(shipId: string) {
    return this.ships.get(shipId);
  }
}

export default Game;
