import Boat from "../assets/sprites/Boat.png";

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

  private acceleration = 10;
  private deceleration = 5;
  private maxSpeed = 100;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    if (!this.context) {
      throw new Error("Failed to get canvas context");
    }

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  //   initShip(shipId: string, position: { x: number; y: number; angle: number }) {
  //     if (this.context) {
  //       const boatImage = new Image(); // Create a new Image object
  //       boatImage.src = Boat; // Set the source of the image

  //       boatImage.onload = () => {
  //         const width = 70;
  //         const height = 40;

  //         const mappedX = position.x - this.mapCoordinates.x;
  //         const mappedY = position.y - this.mapCoordinates.y;

  //         // Draw the image once it's loaded
  //         this.context.drawImage(
  //           boatImage,
  //           mappedX - width / 2, // X position for centering the image
  //           mappedY - height / 2, // Y position for centering the image
  //           width, // Width of the image
  //           height // Height of the image
  //         );
  //       };

  //       // Store the ship data
  //       this.ships.set(shipId, {
  //         position,
  //         players: [],
  //         velocity: { x: 0, y: 0 },
  //         acceleration: { x: 0, y: 0 },
  //       });
  //     }
  //   }
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
      console.log(`Key Down: ${event.key}, Acceleration:`, ship.acceleration);
    }
  };

  //   handleKeyUp = (event: KeyboardEvent) => {
  //     const shipId = "1";
  //     const ship = this.ships.get(shipId);

  //     if (ship) {
  //       switch (event.key) {
  //         case "ArrowUp":
  //         case "ArrowDown":
  //           ship.acceleration.y = 0;
  //           break;
  //         case "ArrowLeft":
  //         case "ArrowRight":
  //           ship.acceleration.x = 0;
  //           break;
  //         default:
  //           return;
  //       }
  //       console.log(`Key Up: ${event.key}, Acceleration:`, ship.acceleration);
  //     }
  //   };

  centerMapOnShip(shipId: string) {
    const ship = this.ships.get(shipId);

    if (ship) {
      const { position } = ship;

      this.mapCoordinates.x = position.x - this.viewportWidth / 2;
      this.mapCoordinates.y = position.y - this.viewportHeight / 2;
    }
  }

  update(delta: number) {
    const speedMultiplier = 200;

    this.ships.forEach((ship, shipId) => {
      // Update ship position
      //ship.position.x += ship.velocity.x * delta;
      //ship.position.y += ship.velocity.y * delta;

      // Apply acceleration to velocity
      ship.velocity.x = ship.velocity.x + 10 * delta;
      ship.velocity.y = ship.velocity.y + 10 * delta;

      console.log(ship.velocity, ship.acceleration);

      // Cap velocity to max speed
      //   ship.velocity.x = Math.max(
      //     -this.maxSpeed,
      //     Math.min(this.maxSpeed, ship.velocity.x)
      //   );
      //   ship.velocity.y = Math.max(
      //     -this.maxSpeed,
      //     Math.min(this.maxSpeed, ship.velocity.y)
      //   );

      //   console.log(
      //     ship.velocity.x,
      //     ship.velocity.y
      //     // ship.position.x,
      //     // ship.position.y,
      //   );

      // Recenter map on the ship being controlled
      if (shipId === "1") {
        this.centerMapOnShip(shipId);
      }
    });
  }
  //   update(delta: number) {
  //     const speedMultiplier = 200;
  //     this.ships.forEach((ship, shipId) => {
  //       ship.position.x += ship.velocity.x * delta * speedMultiplier;
  //       ship.position.y += ship.velocity.y * delta * speedMultiplier;

  //       // Recenter map on the ship being controlled
  //       if (shipId === "1") {
  //         this.centerMapOnShip(shipId);
  //       }
  //     });
  //   }

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
