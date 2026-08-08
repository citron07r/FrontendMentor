/*
  Run with:  node --test expense-splitter/tests/money.test.js

  These cover the money core, where a bug is silent: the UI still renders,
  the totals are just wrong.
*/

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  roundTo,
  validateSplit,
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

test('weighted splits allocate by weight, not just to the right total', () => {
  // asserting the allocation catches an implementation that dumps
  // everything on one member while still summing correctly
  assert.deepEqual(distributeUnits(1000, [50, 30, 20]), [500, 300, 200]);
});

test('an uneven weighting gives the spare unit to the largest fraction', () => {
  // 100 across 3:2:1 is 50 / 33.33 / 16.67; the spare unit goes to the
  // biggest fractional part rather than to whoever is first
  const units = distributeUnits(100, [3, 2, 1]);
  assert.deepEqual(units, [50, 33, 17]);
  assert.equal(units.reduce((a, b) => a + b, 0), 100);
});

test('zero weights fall back to an even split rather than dividing by zero', () => {
  assert.deepEqual(distributeUnits(300, [0, 0, 0]), [100, 100, 100]);
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

test('settle-up names the right payers, recipients, and amounts', () => {
  // a paid 90 for three, so b and c each owe 30 back to a — two payments,
  // not some other arrangement that happens to balance
  const plan = suggestSettlements(group, computeBalances(group));
  assert.deepEqual(plan, [
    { from: 'b', to: 'a', amount: 30 },
    { from: 'c', to: 'a', amount: 30 },
  ]);
});

test('settle-up uses the fewest payments across several creditors', () => {
  // two debtors, two creditors: greedy netting should pair largest with
  // largest and finish in three transfers rather than four
  const wide = {
    currency: 'USD',
    members: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
    expenses: [
      { paidBy: 'a', amount: 100, splits: [{ memberId: 'c', amount: 60 }, { memberId: 'd', amount: 40 }] },
      { paidBy: 'b', amount: 50, splits: [{ memberId: 'c', amount: 20 }, { memberId: 'd', amount: 30 }] },
    ],
    settlements: [],
  };
  const bal = computeBalances(wide);
  const plan = suggestSettlements(wide, bal);
  assert.equal(plan.length, 3);
  plan.forEach((s) => { bal[s.from] += s.amount; bal[s.to] -= s.amount; });
  Object.values(bal).forEach((v) => assert.ok(Math.abs(v) < 0.005, `left ${v} outstanding`));
});

test('applying the plan clears every debt', () => {
  const bal = computeBalances(group);
  suggestSettlements(group, bal).forEach((s) => {
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

/* ---- split validation ------------------------------------------ */

const members = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const check = (over) => validateSplit({
  type: 'exact', amount: 100, currency: 'USD', members, inputs: {}, ...over,
});

test('an equal split needs no per-member input', () => {
  assert.equal(check({ type: 'equal' }), null);
});

test('a split with no participants is rejected', () => {
  assert.equal(check({ members: [] }).code, 'no-members');
});

test('a zero or non-finite amount is rejected', () => {
  assert.equal(check({ amount: 0 }).code, 'bad-amount');
  assert.equal(check({ amount: NaN }).code, 'bad-amount');
  assert.equal(check({ amount: Infinity }).code, 'bad-amount');
});

test('a correct total does not excuse a negative share', () => {
  const problem = check({ inputs: { a: 110, b: -10, c: 0 } });
  assert.equal(problem.code, 'negative-or-nan');
  assert.equal(problem.memberId, 'b');
});

test('NaN in a split is rejected rather than poisoning the balances', () => {
  assert.equal(check({ inputs: { a: NaN, b: 50, c: 50 } }).code, 'negative-or-nan');
});

test('exact amounts must reconcile with the expense total', () => {
  assert.equal(check({ inputs: { a: 40, b: 30, c: 30 } }), null);
  assert.equal(check({ inputs: { a: 40, b: 30, c: 20 } }).code, 'exact-mismatch');
});

test('exact amounts are judged against half a minor unit', () => {
  // 33.33 x3 = 99.99, a penny short of 100 — outside the tolerance
  assert.equal(check({ inputs: { a: 33.33, b: 33.33, c: 33.33 } }).code, 'exact-mismatch');
  // giving the spare penny to one member reconciles exactly
  assert.equal(check({ inputs: { a: 33.33, b: 33.33, c: 33.34 } }), null);
});

test('zero-decimal currencies use a whole unit of tolerance', () => {
  const yen = { type: 'exact', amount: 1000, currency: 'JPY', members, inputs: { a: 334, b: 333, c: 333 } };
  assert.equal(validateSplit(yen), null);
});

test('percentages must total 100 and stay within range', () => {
  assert.equal(check({ type: 'percentage', inputs: { a: 50, b: 30, c: 20 } }), null);
  assert.equal(check({ type: 'percentage', inputs: { a: 50, b: 30, c: 10 } }).code, 'percentage-sum');
  assert.equal(check({ type: 'percentage', inputs: { a: 150, b: 0, c: 0 } }).code, 'percentage-over-100');
});

test('shares must be positive overall', () => {
  assert.equal(check({ type: 'shares', inputs: { a: 2, b: 1, c: 1 } }), null);
  assert.equal(check({ type: 'shares', inputs: { a: 0, b: 0, c: 0 } }).code, 'shares-not-positive');
});
