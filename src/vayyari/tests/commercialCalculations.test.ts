import test, { describe } from 'node:test';
import assert from 'node:assert';
import {
  calculateDiscountPercent,
  calculateGrossMargin,
  calculateMarginPercent,
  formatIndianCurrency,
} from '../utils/commercialRules';

describe('Commercial Calculations & Profit Margins', () => {
  test('calculateDiscountPercent returns correct rounded discount when MRP > Sale Price', () => {
    // ₹1,999 MRP discounted to ₹1,199 -> (800 / 1999) * 100 = 40.02% -> 40%
    const discount = calculateDiscountPercent(1999, 1199);
    assert.strictEqual(discount, 40);

    // ₹1,000 MRP discounted to ₹750 -> 25%
    assert.strictEqual(calculateDiscountPercent(1000, 750), 25);
  });

  test('calculateDiscountPercent returns 0 when Sale Price >= MRP or invalid numbers', () => {
    assert.strictEqual(calculateDiscountPercent(1000, 1000), 0);
    assert.strictEqual(calculateDiscountPercent(1000, 1200), 0);
    assert.strictEqual(calculateDiscountPercent(0, 500), 0);
    assert.strictEqual(calculateDiscountPercent(-100, 500), 0);
  });

  test('calculateGrossMargin returns exact spread between Sale Price and Base Cost', () => {
    // Sale price 1169, base cost 700 -> gross margin 469
    assert.strictEqual(calculateGrossMargin(1169, 700), 469);
    // Negative margin when selling below cost
    assert.strictEqual(calculateGrossMargin(500, 700), -200);
  });

  test('calculateMarginPercent returns correct rounded gross margin percentage', () => {
    // Sale: 1169, Cost: 700, Margin: 469 -> (469 / 1169) * 100 = 40.11% -> 40%
    assert.strictEqual(calculateMarginPercent(1169, 700), 40);

    // Sale: 2000, Cost: 1000, Margin: 1000 -> 50%
    assert.strictEqual(calculateMarginPercent(2000, 1000), 50);

    // Clamps gracefully on 0 sale price
    assert.strictEqual(calculateMarginPercent(0, 500), 0);
  });

  test('formatIndianCurrency formats numbers according to Indian numbering system', () => {
    const formatted = formatIndianCurrency(125000);
    assert.strictEqual(formatted, '1,25,000');
  });
});
