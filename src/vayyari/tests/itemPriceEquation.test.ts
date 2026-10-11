import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatItemPriceEquation } from '../utils/price-equation';

describe('formatItemPriceEquation rules', () => {
  describe('Prepaid orders (isCod = false or undefined)', () => {
    it('shows only the base price with ₹ symbol for single item', () => {
      const result = formatItemPriceEquation({ costPerPiece: 800, quantity: 1 }, false);
      assert.strictEqual(result, '₹800');
    });

    it('shows multiplied price for multi-quantity prepaid item', () => {
      const result = formatItemPriceEquation({ costPerPiece: 1250, quantity: 2 }, false);
      assert.strictEqual(result, '₹2,500');
    });

    it('defaults isCod to false when undefined and displays price', () => {
      const result = formatItemPriceEquation({ costPerPiece: 1000, quantity: 1 });
      assert.strictEqual(result, '₹1,000');
    });

    it('handles zero cost gracefully', () => {
      const result = formatItemPriceEquation({ costPerPiece: 0, quantity: 1 }, false);
      assert.strictEqual(result, '₹0');
    });
  });

  describe('COD orders (isCod = true)', () => {
    it('shows equation price + COD - paid = total with default 50 COD charge and 0 advance paid', () => {
      const result1 = formatItemPriceEquation({ costPerPiece: 800, quantity: 1 }, true);
      assert.strictEqual(result1, '800 + 50 - 0 = 850');

      const result2 = formatItemPriceEquation({ costPerPiece: 1000, quantity: 1 }, true);
      assert.strictEqual(result2, '1000 + 50 - 0 = 1050');
    });

    it('respects custom codChargePerPiece', () => {
      const result = formatItemPriceEquation(
        { costPerPiece: 800, quantity: 1, codChargePerPiece: 100 },
        true
      );
      assert.strictEqual(result, '800 + 100 - 0 = 900');
    });

    it('factors in advance paid amount in the equation', () => {
      const result = formatItemPriceEquation(
        { costPerPiece: 800, quantity: 1, codChargePerPiece: 50, amountPaid: 200 },
        true
      );
      assert.strictEqual(result, '800 + 50 - 200 = 650');
    });

    it('scales price and COD charge by quantity', () => {
      const result = formatItemPriceEquation(
        { costPerPiece: 800, quantity: 2, codChargePerPiece: 50, amountPaid: 100 },
        true
      );
      // price: 1600, COD: 100, paid: 100, total: 1600
      assert.strictEqual(result, '1600 + 100 - 100 = 1600');
    });

    it('clamps total to zero if advance paid exceeds price + COD', () => {
      const result = formatItemPriceEquation(
        { costPerPiece: 800, quantity: 1, codChargePerPiece: 50, amountPaid: 1000 },
        true
      );
      assert.strictEqual(result, '800 + 50 - 1000 = 0');
    });

    it('handles undefined costPerPiece or quantity safely', () => {
      const result = formatItemPriceEquation({}, true);
      // cost: 0, qty: 1, cod: 50, paid: 0, total: 50
      assert.strictEqual(result, '0 + 50 - 0 = 50');
    });
  });
});
