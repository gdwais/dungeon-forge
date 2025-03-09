interface DiceParams {
  count: number;
  sides: number;
  modifier: number;
}

interface RollResult {
  rolls: number[];
  total: number;
  notation: string;
}

export class DiceRoller {
  /**
   * Parse dice notation string (e.g., "2d6+3") into its components
   * @param notation Dice notation in format XdY+Z or XdY-Z
   * @returns Parsed dice parameters
   */
  parseDiceNotation(notation: string): DiceParams {
    // Regular expression to match dice notation
    const diceRegex = /^(\d+)d(\d+)(?:([+-])(\d+))?$/;
    const match = notation.match(diceRegex);

    if (!match) {
      throw new Error(`Invalid dice notation: ${notation}`);
    }

    const count = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);
    
    // Parse modifier if present
    let modifier = 0;
    if (match[3] && match[4]) {
      modifier = parseInt(match[4], 10);
      if (match[3] === '-') {
        modifier = -modifier;
      }
    }

    // Validate the values
    if (count <= 0 || sides <= 0) {
      throw new Error('Dice count and sides must be positive numbers');
    }

    return { count, sides, modifier };
  }

  /**
   * Roll a single die with the given number of sides
   * @param sides Number of sides on the die
   * @returns Random roll result between 1 and sides
   */
  rollDie(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
  }

  /**
   * Roll dice according to the provided notation
   * @param notation Dice notation (e.g., "2d6+3")
   * @returns Object containing individual rolls and total
   */
  roll(notation: string): RollResult {
    const params = this.parseDiceNotation(notation);
    const rolls: number[] = [];

    // Roll each die
    for (let i = 0; i < params.count; i++) {
      rolls.push(this.rollDie(params.sides));
    }

    // Calculate total with modifier
    const total = rolls.reduce((sum, roll) => sum + roll, 0) + params.modifier;

    return {
      rolls,
      total,
      notation
    };
  }
} 