/*
  Money core: rounding, remainder distribution, balances, and settle-up.

  Kept free of DOM and storage so it can be tested directly (see tests/), and
  so the two invariants it upholds are checkable in isolation:

    1. an expense's splits always sum to the expense amount
    2. a group's balances always sum to zero
*/

/* Currencies whose smallest unit is 1, not 0.01. */
export const ZERO_DECIMAL = { JPY: true, KRW: true, VND: true, CLP: true, ISK: true };

/* Balances below half a minor unit are treated as settled. */
export const EPSILON = 0.005;

export function decimalsFor(currency) {
  return ZERO_DECIMAL[currency] ? 0 : 2;
}

export function unitFor(currency) {
  return ZERO_DECIMAL[currency] ? 1 : 0.01;
}

export function roundTo(amount, currency) {
  const factor = Math.pow(10, decimalsFor(currency));
  return Math.round(amount * factor) / factor;
}

/*
  Split `totalUnits` across `weights` in whole units, handing the leftover
  units to the largest fractional parts first. Integer arithmetic throughout,
  so the result always sums back to totalUnits — no cent goes missing and none
  is invented.
*/
export function distributeUnits(totalUnits, weights) {
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const shares = weights.map((w) => {
    const exact = weightSum > 0 ? (totalUnits * w) / weightSum : totalUnits / weights.length;
    return { base: Math.floor(exact), frac: exact - Math.floor(exact) };
  });

  const assigned = shares.reduce((a, s) => a + s.base, 0);
  const remainder = totalUnits - assigned;
  const order = shares
    .map((s, idx) => idx)
    .sort((a, b) => shares[b].frac - shares[a].frac || a - b);

  for (let k = 0; k < remainder; k++) shares[order[k % order.length]].base += 1;
  return shares.map((s) => s.base);
}

/*
  Net position per member, in the group's currency. Positive means the member
  is owed money; negative means they owe it. Derived from expenses and
  settlements on every call — never cached, so it cannot drift.
*/
export function computeBalances(group) {
  const bal = {};
  group.members.forEach((m) => { bal[m.id] = 0; });

  group.expenses.forEach((e) => {
    const rate = e.exchangeRate || 1;
    bal[e.paidBy] = (bal[e.paidBy] || 0) + e.amount * rate;
    e.splits.forEach((s) => {
      bal[s.memberId] = (bal[s.memberId] || 0) - s.amount * rate;
    });
  });

  (group.settlements || []).forEach((s) => {
    const rate = s.exchangeRate || 1;
    bal[s.from] = (bal[s.from] || 0) + s.amount * rate;
    bal[s.to] = (bal[s.to] || 0) - s.amount * rate;
  });

  return bal;
}

/*
  Greedy pairwise netting: the largest debtor pays the largest creditor until
  everyone is square. Minimises the number of transfers, not who pays whom.
*/
export function suggestSettlements(group, bal) {
  const debtors = [];
  const creditors = [];

  Object.keys(bal).forEach((id) => {
    const v = bal[id];
    if (v < -EPSILON) debtors.push({ id, amt: -v });
    else if (v > EPSILON) creditors.push({ id, amt: v });
  });

  debtors.sort((a, b) => b.amt - a.amt);
  creditors.sort((a, b) => b.amt - a.amt);

  const out = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    out.push({ from: debtors[i].id, to: creditors[j].id, amount: roundTo(pay, group.currency) });
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt < EPSILON) i++;
    if (creditors[j].amt < EPSILON) j++;
  }
  return out;
}

/* What `from` still owes `to` under the current plan; 0 if nothing. */
export function outstandingBetween(group, from, to) {
  const suggestions = suggestSettlements(group, computeBalances(group));
  const match = suggestions.find((s) => s.from === from && s.to === to);
  return match ? match.amount : 0;
}
