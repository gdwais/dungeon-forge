import { describe, it, expect } from '@jest/globals';
import { DiceRoller } from '../utils/DiceRoller';

describe('DiceRoller', () => {
  const diceRoller = new DiceRoller();

  describe('parseDiceNotation', () => {
    it('should parse valid dice notation', () => {
      expect(diceRoller.parseDiceNotation('2d6')).toEqual({ count: 2, sides: 6, modifier: 0 });
      expect(diceRoller.parseDiceNotation('1d20')).toEqual({ count: 1, sides: 20, modifier: 0 });
      expect(diceRoller.parseDiceNotation('3d4+2')).toEqual({ count: 3, sides: 4, modifier: 2 });
      expect(diceRoller.parseDiceNotation('1d12-3')).toEqual({ count: 1, sides: 12, modifier: -3 });
    });

    it('should throw error for invalid dice notation', () => {
      expect(() => diceRoller.parseDiceNotation('d')).toThrow();
      expect(() => diceRoller.parseDiceNotation('2d')).toThrow();
      expect(() => diceRoller.parseDiceNotation('d6')).toThrow();
      expect(() => diceRoller.parseDiceNotation('0d6')).toThrow();
      expect(() => diceRoller.parseDiceNotation('2d0')).toThrow();
      expect(() => diceRoller.parseDiceNotation('abc')).toThrow();
    });
  });

  describe('rollDie', () => {
    it('should return a number between 1 and sides (inclusive)', () => {
      // Test with multiple rolls to ensure range is correct
      for (let i = 0; i < 100; i++) {
        const result = diceRoller.rollDie(6);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(6);
      }

      for (let i = 0; i < 100; i++) {
        const result = diceRoller.rollDie(20);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(20);
      }
    });
  });

  describe('roll', () => {
    it('should roll the correct number of dice and apply modifier', () => {
      // Mock the rollDie method to return predictable values
      const originalRollDie = diceRoller.rollDie;
      const mockRollDie = jest.fn().mockReturnValue(3);
      diceRoller.rollDie = mockRollDie;

      const result = diceRoller.roll('2d6+4');
      expect(result.rolls).toEqual([3, 3]);
      expect(result.total).toBe(10); // 3 + 3 + 4

      // Restore the original method
      diceRoller.rollDie = originalRollDie;
    });

    it('should handle negative modifiers correctly', () => {
      // Mock the rollDie method
      const originalRollDie = diceRoller.rollDie;
      const mockRollDie = jest.fn().mockReturnValue(4);
      diceRoller.rollDie = mockRollDie;

      const result = diceRoller.roll('3d4-5');
      expect(result.rolls).toEqual([4, 4, 4]);
      expect(result.total).toBe(7); // 4 + 4 + 4 - 5

      // Restore the original method
      diceRoller.rollDie = originalRollDie;
    });

    it('should throw error for invalid dice notation', () => {
      expect(() => diceRoller.roll('invalid')).toThrow();
    });
  });
}); 