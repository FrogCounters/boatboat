export class Vec2D {
    constructor(public x: number, public y: number) {}

    add(vec: Vec2D): Vec2D {
        return new Vec2D(this.x + vec.x, this.y + vec.y);
    }

    subtract(vec: Vec2D): Vec2D {
        return new Vec2D(this.x - vec.x, this.y - vec.y);
    }

    multiply(scalar: number): Vec2D {
        return new Vec2D(this.x * scalar, this.y * scalar);
    }

    divide(scalar: number): Vec2D {
        if (scalar === 0) throw new Error("Cannot divide by zero");
        return new Vec2D(this.x / scalar, this.y / scalar);
    }

    magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize(): Vec2D {
        const mag = this.magnitude();
        if (mag === 0) return new Vec2D(0, 0);
        return new Vec2D(this.x / mag, this.y / mag);
    }

    dot(vec: Vec2D): number {
        return this.x * vec.x + this.y * vec.y;
    }

    toString(): string {
        return `(${this.x}, ${this.y})`;
    }

    angle(): number {
        console.log(this.x, this.y, Math.atan2(-this.x, this.y));
        return Math.atan2(-this.x, this.y);
    }
}