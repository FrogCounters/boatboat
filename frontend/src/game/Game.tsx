class Game {
  private context: CanvasRenderingContext2D | null;
  private ships: Map<
    string,
    {
      position: { x: number; y: number; angle: number };
      players: string[];
      velocity: { x: number; y: number };
      acceleration: { x: number; y: number };
    }
  > = new Map();
  private obstacles: { x: number; y: number }[] = [];
  private canvas: HTMLCanvasElement;
  private mapCoordinates = { x: 0, y: 0 };
  private viewportWidth = 1280;
  private viewportHeight = 720;

  private previousTimestamp = 0;
  private isRunning = false;

  private acceleration = 5;
  private deceleration = 3;
  private maxSpeed = 10;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    if (!this.context) {
      throw new Error("Failed to get canvas context");
    }

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  initShip(shipId: string, position: { x: number; y: number; angle: number }) {
    if (this.context) {
      this.context.imageSmoothingEnabled = false;
      this.context.fillStyle = "grey";
      const width = 70;
      const height = 40;

      const mappedX = position.x - this.mapCoordinates.x;
      const mappedY = position.y - this.mapCoordinates.y;

      this.context.fillRect(
        mappedX - width / 2,
        mappedY - height / 2,
        width,
        height
      );

      this.ships.set(shipId, {
        position,
        players: [],
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
      });
    }
  }

  initObstacle(position: { x: number; y: number }) {
    this.obstacles.push(position);
  }

  drawObstacle(position: { x: number; y: number }) {
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

  initPlayer(shipId: string, uid: string) {
    const ship = this.ships.get(shipId);
    if (ship) {
      ship.players.push(uid);
    } else {
      console.error(`Ship with ID ${shipId} does not exist.`);
    }
  }

  handleKeyDown = (event: KeyboardEvent) => {
    const shipId = "1"; // Assume controlling ship with ID 1
    const ship = this.ships.get(shipId);

    if (ship) {
      switch (event.key) {
        case "ArrowUp":
          ship.acceleration.y = -this.acceleration; // Accelerate upwards
          break;
        case "ArrowDown":
          ship.acceleration.y = this.acceleration; // Accelerate downwards
          break;
        case "ArrowLeft":
          ship.acceleration.x = -this.acceleration; // Accelerate left
          break;
        case "ArrowRight":
          ship.acceleration.x = this.acceleration; // Accelerate right
          break;
        default:
          return;
      }
    }
  };

  handleKeyUp = (event: KeyboardEvent) => {
    const shipId = "1"; // Assume controlling ship with ID 1
    const ship = this.ships.get(shipId);

    if (ship) {
      switch (event.key) {
        case "ArrowUp":
        case "ArrowDown":
          ship.acceleration.y = -this.deceleration; // Begin deceleration
          break;
        case "ArrowLeft":
        case "ArrowRight":
          ship.acceleration.x = -this.deceleration; // Begin deceleration
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
    const speedMultiplier = 200; // Adjust for smoother movement

    this.ships.forEach((ship, shipId) => {
      // Apply acceleration if keys are pressed

      if (ship.acceleration.x !== 0 || ship.acceleration.y !== 0) {
        // Apply acceleration in the direction of the velocity
        ship.velocity.x += ship.acceleration.x * delta;
        ship.velocity.y += ship.acceleration.y * delta;

        console.log(
          ship.velocity.x,
          ship.velocity.y,
          ship.acceleration.x,
          ship.acceleration.y
        );

        // Clamp velocity to max speed
        if (ship.velocity.x > this.maxSpeed) ship.velocity.x = this.maxSpeed;
        if (ship.velocity.x < -this.maxSpeed) ship.velocity.x = -this.maxSpeed;
        if (ship.velocity.y > this.maxSpeed) ship.velocity.y = this.maxSpeed;
        if (ship.velocity.y < -this.maxSpeed) ship.velocity.y = -this.maxSpeed;
      }

      //   // Apply deceleration when no keys are pressed
      //   if (ship.acceleration.x === 0 && ship.acceleration.y === 0) {
      //     // Gradual deceleration
      //     if (ship.velocity.x > 0) {
      //       ship.velocity.x = Math.max(
      //         0,
      //         ship.velocity.x - this.deceleration * delta
      //       );
      //     } else if (ship.velocity.x < 0) {
      //       ship.velocity.x = Math.min(
      //         0,
      //         ship.velocity.x + this.deceleration * delta
      //       );
      //     }

      //     if (ship.velocity.y > 0) {
      //       ship.velocity.y = Math.max(
      //         0,
      //         ship.velocity.y - this.deceleration * delta
      //       );
      //     } else if (ship.velocity.y < 0) {
      //       ship.velocity.y = Math.min(
      //         0,
      //         ship.velocity.y + this.deceleration * delta
      //       );
      //     }
      //   }

      // Update ship position
      ship.position.x += ship.velocity.x * delta * speedMultiplier;
      ship.position.y += ship.velocity.y * delta * speedMultiplier;

      // Recenter map on the ship being controlled
      if (shipId === "1") {
        this.centerMapOnShip(shipId);
      }
    });
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
        const { position } = ship;

        this.initShip("1", position);
        ship.players.forEach((uid) => this.initPlayer("1", uid));
      });

      // Display debug information
      this.context.fillStyle = "#000000";
      this.context.font = "16px Arial";
      this.context.fillText(
        `Map Coordinates: x: ${this.mapCoordinates.x}, y: ${this.mapCoordinates.y}`,
        10,
        20
      );
    }
  }

  gameStart() {
    this.isRunning = true;
    this.previousTimestamp = performance.now();
    window.requestAnimationFrame(this.doTick);
  }

  doTick = (currentTimestamp: number) => {
    if (!this.isRunning) return;

    const delta = (currentTimestamp - this.previousTimestamp) / 1000;
    this.previousTimestamp = currentTimestamp;

    // console.log(`Delta: ${delta}`);
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
