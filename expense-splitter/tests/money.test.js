/*
  Run with:  node --test expense-splitter/tests/money.test.js

  These cover the money core, where a bug is silent: the UI still renders,
  the totals are just wrong.
*/

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  roundTo,
  unitFor,
  distributeUnits,
  computeBalances,
  suggestSettlements,
  outstandingBetween,
} from '../js/money.js';

/* ---- rounding ------------------------------------------------- */

test('rounds to two decimals for normal currencies', () => {
  assert.equal(roundTo(3.333333, 'USD'), 3.33);
  assert.equal(roundTo(3.335, 'USD'), 3.34);
});

test('rounds to whole units for zero-decimal currencies', () => {
  assert.equal(roundTo(1234.6, 'JPY'), 1235);
  assert.equal(unitFor('JPY'), 1);
  assert.equal(unitFor('USD'), 0.01);
});

/* ---- remainder distribution ----------------------------------- */

test('an indivisible amount still sums to the total', () => {
  const units = distributeUnits(1000, [1, 1, 1]); // $10.00 across three
  assert.deepEqual(units, [334, 333, 333]);
  assert.equal(units.reduce((a, b) => a + b, 0), 1000);
});

test('weighted splits sum to the total', () => {
  const units = distributeUnits(1000, [50, 30, 20]);
  assert.equal(units.reduce((a, b) => a + b, 0), 1000);
});

test('zero weights fall back to an even split rather than dividing by zero', () => {
  const units = distributeUnits(300, [0, 0, 0]);
  assert.equal(units.reduce((a, b) => a + b, 0), 300);
});

test('one penny across many people is never duplicated or lost', () => {
  const units = distributeUnits(1, [1, 1, 1, 1, 1]);
  assert.equal(units.reduce((a, b) => a + b, 0), 1);
});

/* ---- balances -------------------------------------------------- */

const group = {
  currency: 'USD',
  members: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
  expenses: [
    {
      paidBy: 'a',
      amount: 90,
      splits: [
        { memberId: 'a', amount: 30 },
        { memberId: 'b', amount: 30 },
        { memberId: 'c', amount: 30 },
      ],
    },
  ],
  settlements: [],
};

test('balances net to zero', () => {
  const bal = computeBalances(group);
  const total = Object.values(bal).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total) < 1e-9, `expected 0, got ${total}`);
});

test('the payer is owed what the others consumed', () => {
  const bal = computeBalances(group);
  assert.equal(bal.a, 60);
  assert.equal(bal.b, -30);
  assert.equal(bal.c, -30);
});

test('a settlement moves the balance and keeps the sum at zero', () => {
  const settled = { ...group, settlements: [{ from: 'b', to: 'a', amount: 30 }] };
  const bal = computeBalances(settled);
  assert.equal(bal.b, 0);
  assert.equal(bal.a, 30);
  const total = Object.values(bal).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total) < 1e-9);
});

test('a foreign-currency expense converts at its stored rate', () => {
  const jpy = {
    currency: 'USD',
    members: [{ id: 'a' }, { id: 'b' }],
    expenses: [
      {
        paidBy: 'a',
        amount: 1000,
        exchangeRate: 0.0067,
        splits: [
          { memberId: 'a', amount: 500 },
          { memberId: 'b', amount: 500 },
        ],
      },
    ],
    settlements: [],
  };
  const bal = computeBalances(jpy);
  assert.ok(Math.abs(bal.a - 3.35) < 1e-9);
  assert.ok(Math.abs(bal.b + 3.35) < 1e-9);
});

/* ---- settle-up -------------------------------------------------- */

test('settle-up clears every debt', () => {
  const bal = computeBalances(group);
  const plan = suggestSettlements(group, bal);
  plan.forEach((s) => {
    bal[s.from] += s.amount;
    bal[s.to] -= s.amount;
  });
  Object.values(bal).forEach((v) => assert.ok(Math.abs(v) < 0.005, `left ${v} outstanding`));
});

test('a settled group needs no payments', () => {
  const square = {
    currency: 'USD',
    members: [{ id: 'a' }, { id: 'b' }],
    expenses: [
      { paidBy: 'a', amount: 10, splits: [{ memberId: 'a', amount: 10 }] },
    ],
    settlements: [],
  };
  assert.deepEqual(suggestSettlements(square, computeBalances(square)), []);
});

test('outstandingBetween reports the debt only in the direction it exists', () => {
  assert.equal(outstandingBetween(group, 'b', 'a'), 30);
  assert.equal(outstandingBetween(group, 'a', 'b'), 0);
});
