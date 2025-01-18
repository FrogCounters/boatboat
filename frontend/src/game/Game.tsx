class Game {
  private context: CanvasRenderingContext2D | null;

  private ships: Map<
    number,
    { position: { x: number; y: number }; players: string[] }
  > = new Map();

  private obstacles: { x: number; y: number }[] = [];

  private canvas: HTMLCanvasElement;

  private shipSpeed: number = 5;

  private mapCoordinates = { x: 0, y: 0 };

  private viewportWidth = 1280;
  private viewportHeight = 720;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    if (!this.context) {
      throw new Error("Failed to get canvas context");
    }

    window.addEventListener("keydown", this.handleKeyDown);
  }

  initShip(shipId: number, position: { x: number; y: number }) {
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

      this.ships.set(shipId, { position, players: [] });
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

  initPlayer(shipId: number, uid: string) {
    if (this.context) {
      const ship = this.ships.get(shipId);
      if (ship) {
        ship.players.push(uid);
        this.initShip(shipId, ship.position);

        this.context.fillStyle = "#0000ff";
        const width = 15;
        const height = 8;

        const mappedX = ship.position.x - this.mapCoordinates.x;
        const mappedY = ship.position.y - this.mapCoordinates.y;

        this.context.fillRect(
          mappedX - width / 2,
          mappedY - height / 2,
          width,
          height
        );
      } else {
        console.error(`Ship with ID ${shipId} does not exist.`);
      }
    }
  }

  handleKeyDown = (event: KeyboardEvent) => {
    const shipId = 1; // Assume you are controlling ship with ID 1
    const ship = this.ships.get(shipId);

    if (ship) {
      const { position } = ship;

      switch (event.key) {
        case "ArrowUp":
        case "w":
          position.y -= this.shipSpeed;
          break;
        case "ArrowDown":
        case "s":
          position.y += this.shipSpeed;
          break;
        case "ArrowLeft":
        case "a":
          position.x -= this.shipSpeed;
          break;
        case "ArrowRight":
        case "d":
          position.x += this.shipSpeed;
          break;
        default:
          return;
      }

      this.centerMapOnShip(shipId);
      this.draw();
    }
  };

  centerMapOnShip(shipId: number) {
    const ship = this.ships.get(shipId);

    if (ship) {
      const { position } = ship;

      this.mapCoordinates.x = position.x - this.viewportWidth / 2;
      this.mapCoordinates.y = position.y - this.viewportHeight / 2;
    }
  }

  draw() {
    if (this.context) {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Draw obstacles
      this.obstacles.forEach((obstacle) => {
        this.drawObstacle(obstacle);
      });

      // Draw ships and players
      this.ships.forEach((ship, shipId) => {
        this.initShip(shipId, ship.position);
        ship.players.forEach((uid) => {
          this.initPlayer(shipId, uid);
        });
      });

      // Draw the coordinates for debugging
      this.context.fillStyle = "#000000";
      this.context.font = "16px Arial";
      this.context.fillText(
        `Map Coordinates: x: ${this.mapCoordinates.x}, y: ${this.mapCoordinates.y}`,
        10,
        40
      );
    }
  }

  getPlayersInShip(shipId: number) {
    const ship = this.ships.get(shipId);
    return ship ? ship.players : [];
  }

  getShipById(shipId: number) {
    return this.ships.get(shipId);
  }
}

export default Game;
