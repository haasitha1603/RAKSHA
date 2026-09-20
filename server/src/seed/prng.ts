/**
 * Deterministic Pseudo-Random Number Generator (Mulberry32)
 */
export class SeededPRNG {
  private state: number;

  constructor(seed: number = 42) {
    this.state = seed >>> 0;
  }

  /**
   * Returns a float in [0, 1)
   */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let z = this.state;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns an integer in [min, max]
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Returns a float in [min, max]
   */
  nextFloat(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Picks a random element from an array
   */
  pick<T>(items: readonly T[] | T[]): T {
    return items[this.nextInt(0, items.length - 1)];
  }
}
