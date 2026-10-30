import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  levenshteinDistance,
  scoreFuzzyMatch,
  isFuzzyMatch,
  fuzzyFilter,
} from '../utils/fuzzySearch';

describe('DeepLens Fuzzy Search Engine Tests', () => {
  test('levenshteinDistance computes correct edit distances', () => {
    assert.equal(levenshteinDistance('', ''), 0);
    assert.equal(levenshteinDistance('saree', 'saree'), 0);
    assert.equal(levenshteinDistance('sare', 'saree'), 1);
    assert.equal(levenshteinDistance('kanjivarm', 'kanjivaram'), 1);
    assert.equal(levenshteinDistance('banaras', 'banarasi'), 1);
    assert.equal(levenshteinDistance('banaras', 'banarasii'), 2);
  });

  test('isFuzzyMatch matches exact, prefix, and typo variations', () => {
    assert.equal(isFuzzyMatch('Kanjivaram Silk Saree', 'kanjivaram'), true);
    assert.equal(isFuzzyMatch('Kanjivaram Silk Saree', 'kanjivarm'), true); // 1 letter omitted
    assert.equal(isFuzzyMatch('Banarasi Georgette Saree', 'banaras'), true); // Typo / root word
    assert.equal(isFuzzyMatch('Organza Floral Printed', 'organza'), true);
    assert.equal(isFuzzyMatch('Organza Floral Printed', 'organz'), true);
    assert.equal(isFuzzyMatch('Pure Tussar Silk Saree', 'tusser'), true);
  });

  test('isFuzzyMatch rejects non-matching strings', () => {
    assert.equal(isFuzzyMatch('Cotton Daily Wear Kurti', 'kanjivaram'), false);
    assert.equal(isFuzzyMatch('Banarasi Georgette Saree', 'linen'), false);
  });

  test('scoreFuzzyMatch prioritizes exact and high-similarity matches', () => {
    const exactScore = scoreFuzzyMatch('Kanjivaram Silk', 'kanjivaram');
    const typoScore = scoreFuzzyMatch('Kanjivaram Silk', 'kanjivarm');
    assert.ok(exactScore > typoScore);
    assert.ok(typoScore >= 0.7);
  });

  test('fuzzyFilter ranks closer matches higher', () => {
    const items = [
      { id: '1', title: 'Banarasi Soft Silk Saree' },
      { id: '2', title: 'Banaras Brocade Dupatta' },
      { id: '3', title: 'Pure Kanjivaram Bridal Saree' },
    ];

    const results = fuzzyFilter(items, 'banarasi', (item) => [item.title]);
    assert.equal(results.length, 2);
    assert.equal(results[0].id, '1'); // Exact match first
    assert.equal(results[1].id, '2'); // Related typo/root match second
  });

  test('fuzzyFilter handles multi-field search', () => {
    const items = [
      { id: '1', title: 'Bridal Saree', code: 'VAY-KANJ-01', desc: 'Handwoven in pure zari' },
      { id: '2', title: 'Festive Kurti', code: 'VAY-KURT-02', desc: 'Chanderi silk embroidered' },
    ];

    const results = fuzzyFilter(items, 'kanj', (item) => [item.title, item.code, item.desc]);
    assert.equal(results.length, 1);
    assert.equal(results[0].id, '1');
  });
});
