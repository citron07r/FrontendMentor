/*
  Expense Splitter — frontend-only app.

  Data flow: on first run the sample dataset is fetched from
  data/sample-groups.json and seeded into localStorage. Every mutation
  (new expense, settlement, group, reset) persists back to localStorage,
  so changes survive reloads. No backend, no auth, no live currency API:
  each expense stores the exchange rate used at entry time.
*/
'use strict';

import {
  EPSILON,
  ZERO_DECIMAL,
  unitFor,
  roundTo,
  distributeUnits,
  computeBalances,
  suggestSettlements,
  outstandingBetween,
  validateSplit,
} from './js/money.js';

(function () {
  /* ============ Constants ============ */

  const STORAGE_KEY = 'expense-splitter:data';
  const THEME_KEY = 'expense-splitter:theme';
  const SELECTED_KEY = 'expense-splitter:selected-group';

  const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'MXN'];
  const CATEGORIES = [
    'Accommodation', 'Entertainment', 'Food & Drink', 'Groceries',
    'Housing', 'Other', 'Shopping', 'Transport', 'Utilities'
  ];
  const CATEGORY_COLORS = {
    'Accommodation': '#8b5cf6',
    'Entertainment': '#ec4899',
    'Food & Drink': '#f59e0b',
    'Groceries': '#10b981',
    'Housing': '#3b82f6',
    'Other': '#8b94a6',
    'Shopping': '#f43f5e',
    'Transport': '#06b6d4',
    'Utilities': '#84cc16'
  };
  /* Live rates come from Frankfurter (ECB data, no API key, so nothing secret
     ships in a static build). The per-USD figures below are the fallback when
     the network is unavailable, so expense entry is never blocked. */
  const RATES_URL = 'https://api.frankfurter.dev/v1/latest?base=USD';
  const RATES_CACHE_KEY = 'expense-splitter:rates';
  const RATES_MAX_AGE_MS = 12 * 60 * 60 * 1000; /* rates move slowly; refetch twice a day */
  const RATE_PER_USD = { USD: 1, EUR: 0.92, GBP: 0.79, JPY: 149, CAD: 1.36, AUD: 1.52, CHF: 0.88, CNY: 7.2, INR: 83, MXN: 18.2 };
  const AVATAR_PALETTE = ['#5b8def', '#36d29a', '#e3b341', '#f2606a', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];


  /* ============ State ============ */

  let state = null; /* { groups: Group[] } */
  let selectedGroupId = null;
  let expenseFilters = { category: 'all', member: 'all', from: '', to: '' };

  function resetExpenseFilters() {
    expenseFilters = { category: 'all', member: 'all', from: '', to: '' };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* storage full or unavailable: the app keeps working in memory */
    }
  }

  /* Resolves to { ok: true } when there is usable state, or { ok: false, error }
     when there is not. Deliberately never rejects: leaving a caller to remember
     a .catch is how a failed seed fetch turns into a blank screen. */
  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.groups) && parsed.groups.length) {
          state = parsed;
          return Promise.resolve({ ok: true });
        }
      }
    } catch (e) { /* corrupted storage: reseed from sample data */ }

    return fetch('data/sample-groups.json')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.groups) || !data.groups.length) {
          throw new Error('Sample data contained no groups');
        }
        state = { groups: data.groups };
        saveState();
        return { ok: true };
      })
      .catch(function (error) {
        /* An empty shape rather than null, so every renderer downstream has
           something valid to read while the recovery message is shown. */
        state = { groups: [] };
        return { ok: false, error: error };
      });
  }

  function findGroup(id) {
    if (!state) return null;
    for (var i = 0; i < state.groups.length; i++) {
      if (state.groups[i].id === id) return state.groups[i];
    }
    return null;
  }

  function currentGroup() {
    return findGroup(selectedGroupId) || state.groups[0] || null;
  }

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ============ Money & formatting ============ */

  const formatters = {};
  function formatMoney(amount, currency) {
    var key = currency || 'USD';
    if (!formatters[key]) {
      try {
        formatters[key] = new Intl.NumberFormat('en-US', { style: 'currency', currency: key });
      } catch (e) {
        formatters[key] = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
      }
    }
    return formatters[key].format(amount);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fullDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function relativeDate(iso) {
    var then = new Date(iso).getTime();
    var now = Date.now();
    var days = Math.floor((now - then) / 86400000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return days + 'd ago';
    if (days < 30) return Math.floor(days / 7) + 'w ago';
    if (days < 365) return Math.floor(days / 30) + 'mo ago';
    return fullDate(iso);
  }

  function memberById(group, id) {
    for (var i = 0; i < group.members.length; i++) {
      if (group.members[i].id === id) return group.members[i];
    }
    return { id: id, name: 'Unknown', avatarColor: '#8b94a6' };
  }

  function youMember(group) {
    return group.members[0] || null;
  }

  function displayName(group, id) {
    var you = youMember(group);
    if (you && id === you.id) return 'you';
    return memberById(group, id).name;
  }

  function avatarTextColor(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return '#ffffff';
    var n = parseInt(m[1], 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#131a26' : '#ffffff';
  }

  function avatarHtml(member, large) {
    var initial = (member.name || '?').trim().charAt(0).toUpperCase();
    /* Per-member colour is data, so it has to reach CSS somehow; passing it as
       custom properties keeps the actual declarations in the stylesheet. */
    return '<span class="avatar' + (large ? ' avatar-lg' : '') + '" aria-hidden="true" style="--avatar-bg:' +
      escapeHtml(member.avatarColor) + ';--avatar-fg:' + avatarTextColor(member.avatarColor) + '">' +
      escapeHtml(initial) + '</span>';
  }

  /* ============ Balance math ============ */

  /* Net balance per member in the group's currency.
     Positive: the member is owed money. Negative: the member owes money. */
  /* Greedy pairwise netting: largest debtor pays largest creditor. */
  /* ============ Split engine ============ */

  /* Deterministic rounding: split `amount` into integer currency units and
     distribute leftover units one by one, so splits always sum to the total. */
  function computeSplits(splitType, amount, currency, members, inputs) {
    var unit = unitFor(currency);
    var totalUnits = Math.round(amount / unit);
    var ids = members.map(function (m) { return m.id; });
    if (!ids.length) return [];
    var units, i;

    if (splitType === 'exact') {
      return members.map(function (m) {
        return { memberId: m.id, amount: roundTo(inputs[m.id] || 0, currency) };
      });
    }
    if (splitType === 'percentage') {
      units = distributeUnits(totalUnits, members.map(function (m) { return inputs[m.id] || 0; }));
      return members.map(function (m, idx) {
        return { memberId: m.id, amount: units[idx] * unit, percentage: inputs[m.id] || 0 };
      });
    }
    if (splitType === 'shares') {
      units = distributeUnits(totalUnits, members.map(function (m) { return inputs[m.id] || 0; }));
      return members.map(function (m, idx) {
        return { memberId: m.id, amount: units[idx] * unit, shares: inputs[m.id] || 0 };
      });
    }
    /* equal */
    units = distributeUnits(totalUnits, members.map(function () { return 1; }));
    return members.map(function (m, idx) {
      return { memberId: m.id, amount: units[idx] * unit };
    });
  }

  /* ============ DOM helpers ============ */

  function $(sel) { return document.querySelector(sel); }

  function announce(msg) {
    var el = $('#announcer');
    if (!el) return;
    el.textContent = '';
    setTimeout(function () { el.textContent = msg; }, 30);
  }

  /* A role="alert" on its own announces the problem but not which input caused
     it. Passing the offending field ties the two together and marks it invalid,
     clearing whichever field was flagged last. */
  function showError(el, msg, field) {
    if (!el) return;

    var previous = el.invalidField;
    if (previous) {
      previous.removeAttribute('aria-invalid');
      if (previous.getAttribute('aria-describedby') === el.id) previous.removeAttribute('aria-describedby');
      el.invalidField = null;
    }

    if (!msg) { el.hidden = true; el.textContent = ''; return; }
    el.textContent = msg;
    el.hidden = false;

    if (field) {
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', el.id);
      el.invalidField = field;
    }
  }

  function openDialog(dialog) {
    if (!dialog || dialog.open) return;
    dialog.showModal();
  }

  function closeDialog(dialog) {
    if (dialog && dialog.open) dialog.close();
  }

  /* ============ Theme ============ */

  function effectiveTheme() {
    var t = document.documentElement.dataset.theme;
    if (t === 'dark' || t === 'light') return t;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function toggleTheme() {
    var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
    announce(next === 'dark' ? 'Dark theme on' : 'Light theme on');
  }

  /* ============ Routing ============ */

  function route() {
    var hash = location.hash || '#/';
    if (hash.indexOf('#/app') === 0) {
      var m = /^#\/app\/g\/([\w-]+)/.exec(hash);
      if (m && findGroup(m[1]) && m[1] !== selectedGroupId) { selectedGroupId = m[1]; resetExpenseFilters(); }
      if (!findGroup(selectedGroupId)) selectedGroupId = state.groups.length ? state.groups[0].id : null;
      try { localStorage.setItem(SELECTED_KEY, selectedGroupId || ''); } catch (e) { /* ignore */ }
      showApp();
    } else {
      showLanding();
    }
  }

  /* Both views ship their own <main>, and only one is visible at a time. The
     skip link has to follow, or it drops keyboard users into the hidden view. */
  function pointSkipLinkAt(id) {
    var link = document.querySelector('.skip-link');
    if (link) link.setAttribute('href', '#' + id);
  }

  function showLanding() {
    $('#landing-view').hidden = false;
    $('#app-view').hidden = true;
    pointSkipLinkAt('main');
    document.title = 'Expense Splitter — Split expenses. Settle up. Stay friends.';
  }

  function showApp() {
    $('#landing-view').hidden = true;
    $('#app-view').hidden = false;
    pointSkipLinkAt('app-main');
    renderApp();
  }

  /* ============ Rendering ============ */

  function renderApp() {
    renderSidebar();
    renderGroup();
  }

  function renderSidebar() {
    var list = $('#group-list');
    var html = '';
    state.groups.forEach(function (g) {
      var bal = computeBalances(g);
      var you = youMember(g);
      var net = you ? (bal[you.id] || 0) : 0;
      var active = g.id === selectedGroupId;
      var balClass = Math.abs(net) < EPSILON ? 'is-zero' : (net > 0 ? 'is-owed' : 'is-owe');
      var balText = Math.abs(net) < EPSILON ? 'settled' : formatMoney(Math.abs(net), g.currency);
      html += '<li><a class="group-item" href="#/app/g/' + escapeHtml(g.id) + '"' +
        (active ? ' aria-current="page"' : '') + '>' +
        '<span class="group-item-name">' + escapeHtml(g.name) + '</span>' +
        '<span class="group-item-bal ' + balClass + '">' + escapeHtml(balText) + '</span>' +
        '</a></li>';
    });
    list.innerHTML = html;
  }

  function renderGroup() {
    var root = $('#group-root');
    var group = currentGroup();
    if (!group) {
      root.innerHTML = '<div class="empty-state"><h3>No groups yet</h3>' +
        '<p>Create your first group to start splitting expenses.</p>' +
        '<button class="btn btn-primary" type="button" data-action="open-group">New group</button></div>';
      $('#crumb-group').textContent = 'Dashboard';
      document.title = 'Expense Splitter';
      return;
    }

    $('#crumb-group').textContent = group.name;
    document.title = group.name + ' · Expense Splitter';

    var bal = computeBalances(group);
    var suggestions = suggestSettlements(group, bal);
    var you = youMember(group);

    root.innerHTML =
      '<div class="group-wrap">' +
      groupHeadHtml(group) +
      '<div class="group-grid">' +
      '<div class="group-side">' +
      balanceCardHtml(group, bal, you) +
      suggestionsHtml(group, suggestions) +
      '</div>' +
      '<div class="group-main">' +
      expensesHtml(group) +
      settlementsHtml(group) +
      '</div>' +
      '</div>' +
      '</div>';
  }

  function groupHeadHtml(group) {
    var total = group.expenses.reduce(function (a, e) { return a + e.amount * (e.exchangeRate || 1); }, 0);
    return '<header class="group-head">' +
      '<h1 class="group-title">' + escapeHtml(group.name) + '</h1>' +
      (group.description ? '<p class="group-desc">' + escapeHtml(group.description) + '</p>' : '') +
      '<p class="group-meta">' +
      '<span class="chip">' + escapeHtml(group.currency) + '</span>' +
      '<span>' + group.members.length + ' members</span>' +
      '<span aria-hidden="true">·</span>' +
      '<span>' + group.expenses.length + ' expenses</span>' +
      '<span aria-hidden="true">·</span>' +
      '<span class="mono">' + escapeHtml(formatMoney(roundTo(total, group.currency), group.currency)) + ' total</span>' +
      '</p></header>';
  }

  function balanceCardHtml(group, bal, you) {
    var yourNet = you ? (bal[you.id] || 0) : 0;
    var yourClass = Math.abs(yourNet) < EPSILON ? 'is-zero' : (yourNet > 0 ? 'is-owed' : 'is-owe');
    var yourNote = Math.abs(yourNet) < EPSILON ? 'You are all settled up'
      : (yourNet > 0 ? 'you are owed overall' : 'you owe overall');

    var rows = group.members.map(function (m) {
      var net = bal[m.id] || 0;
      var cls = Math.abs(net) < EPSILON ? 'is-zero' : (net > 0 ? 'is-owed' : 'is-owe');
      var sign = net > EPSILON ? '+' : (net < -EPSILON ? '−' : '');
      var note = Math.abs(net) < EPSILON ? 'settled' : (net > 0 ? 'is owed' : 'owes');
      var nameHtml = escapeHtml(m.name) + (you && m.id === you.id ? ' <span class="you-tag">(you)</span>' : '');
      return '<li class="balance-row">' + avatarHtml(m) +
        '<span class="balance-row-name">' + nameHtml + '</span>' +
        '<span class="balance-row-amt">' +
        '<span class="bal-amt ' + cls + '" aria-label="' + escapeHtml(m.name + ' ' + note + ' ' + formatMoney(Math.abs(net), group.currency)) + '">' +
        sign + escapeHtml(formatMoney(Math.abs(net), group.currency)) + '</span>' +
        '<span class="bal-note">' + note + '</span>' +
        '</span></li>';
    }).join('');

    return '<section class="balance-card" aria-label="Balances">' +
      '<div class="balance-you">' +
      '<span class="balance-you-label">Your balance</span>' +
      '<span class="balance-you-amt ' + yourClass + '">' +
      (yourNet > EPSILON ? '+' : (yourNet < -EPSILON ? '−' : '')) +
      escapeHtml(formatMoney(Math.abs(yourNet), group.currency)) + '</span>' +
      '<span class="balance-you-note">' + yourNote + '</span>' +
      '</div>' +
      '<ul class="balance-list">' + rows + '</ul>' +
      '</section>';
  }

  function suggestionsHtml(group, suggestions) {
    if (!suggestions.length) {
      return '<section class="suggestions" aria-label="Settlement suggestions">' +
        '<h2 class="section-title">Settle up</h2>' +
        '<p class="all-settled">' +
        '<span class="feature-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg></span>' +
        'All settled up! Nothing left to square.</p></section>';
    }
    var rows = suggestions.map(function (s) {
      var from = memberById(group, s.from);
      var to = memberById(group, s.to);
      var text = '<strong>' + escapeHtml(displayName(group, s.from)) + '</strong> owes <strong>' +
        escapeHtml(displayName(group, s.to)) + '</strong> <span class="amt">' +
        escapeHtml(formatMoney(s.amount, group.currency)) + '</span>';
      return '<div class="suggestion-row">' + avatarHtml(from) +
        '<p class="suggestion-text">' + text + '</p>' +
        '<button class="btn btn-ghost" type="button" data-action="suggest-settle" data-from="' +
        escapeHtml(s.from) + '" data-to="' + escapeHtml(s.to) + '" data-amount="' + s.amount + '">Record</button>' +
        '</div>';
    }).join('');
    return '<section class="suggestions" aria-label="Settlement suggestions">' +
      '<h2 class="section-title">Settle up</h2>' + rows + '</section>';
  }

  function expensesHtml(group) {
    if (!group.expenses.length) {
      return '<section aria-label="Expenses"><h2 class="section-title section-title-tight">Expenses</h2>' +
        '<div class="empty-state"><h3>No expenses yet</h3>' +
        '<p>Add your first shared expense and Expense Splitter keeps track of who owes what.</p>' +
        '<button class="btn btn-primary" type="button" data-action="open-expense">Add expense</button></div></section>';
    }
    var visible = visibleExpenses(group);
    var sorted = visible.slice().sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });

    var body = sorted.length
      ? '<ul class="expense-list">' +
        sorted.map(function (e) { return expenseItemHtml(group, e); }).join('') + '</ul>'
      : '<div class="empty-state"><h3>No expenses match these filters</h3>' +
        '<p>Widen the filters to see the rest of this group\'s spending.</p>' +
        '<button class="btn btn-ghost" type="button" data-action="clear-filters">Clear filters</button></div>';

    return '<section aria-label="Expenses">' +
      '<h2 class="section-title section-title-tight">Expenses</h2>' +
      filtersHtml(group, visible) +
      breakdownHtml(group, sorted) +
      body + '</section>';
  }

  /* ---- Filtering & breakdown ---------------------------------------
     Filters live in memory, not in storage: they describe how you are
     looking at a group right now, not something worth persisting. */

  function matchesFilters(e) {
    if (expenseFilters.category !== 'all' && (e.category || 'Other') !== expenseFilters.category) return false;
    if (expenseFilters.member !== 'all' && e.paidBy !== expenseFilters.member) return false;
    if (expenseFilters.from && e.date.slice(0, 10) < expenseFilters.from) return false;
    if (expenseFilters.to && e.date.slice(0, 10) > expenseFilters.to) return false;
    return true;
  }

  function visibleExpenses(group) {
    return group.expenses.filter(matchesFilters);
  }

  function filtersActive() {
    return expenseFilters.category !== 'all' || expenseFilters.member !== 'all' ||
      Boolean(expenseFilters.from) || Boolean(expenseFilters.to);
  }

  function filtersHtml(group, visible) {
    var cats = CATEGORIES.map(function (c) {
      return '<option value="' + escapeHtml(c) + '"' +
        (expenseFilters.category === c ? ' selected' : '') + '>' + escapeHtml(c) + '</option>';
    }).join('');
    var members = group.members.map(function (m) {
      return '<option value="' + escapeHtml(m.id) + '"' +
        (expenseFilters.member === m.id ? ' selected' : '') + '>' + escapeHtml(m.name) + '</option>';
    }).join('');

    return '<div class="expense-filters" role="group" aria-label="Filter expenses">' +
      '<label class="filter-field"><span class="filter-label">Category</span>' +
      '<select id="filter-category" data-filter="category"><option value="all">All categories</option>' + cats + '</select></label>' +
      '<label class="filter-field"><span class="filter-label">Paid by</span>' +
      '<select id="filter-member" data-filter="member"><option value="all">Anyone</option>' + members + '</select></label>' +
      '<label class="filter-field"><span class="filter-label">From</span>' +
      '<input type="date" id="filter-from" data-filter="from" value="' + escapeHtml(expenseFilters.from) + '"></label>' +
      '<label class="filter-field"><span class="filter-label">To</span>' +
      '<input type="date" id="filter-to" data-filter="to" value="' + escapeHtml(expenseFilters.to) + '"></label>' +
      (filtersActive()
        ? '<button class="btn btn-ghost" type="button" data-action="clear-filters">Clear filters</button>'
        : '') +
      '<p class="filter-count" role="status">' +
      (filtersActive()
        ? 'Showing ' + visible.length + ' of ' + group.expenses.length + ' expenses'
        : 'Showing all ' + group.expenses.length + ' expenses') +
      '</p></div>';
  }

  /* Totals recompute from the filtered set, so the breakdown always
     describes exactly what is listed below it. */
  function breakdownHtml(group, visible) {
    if (!visible.length) return '';

    var totals = {};
    var total = 0;
    visible.forEach(function (e) {
      var value = e.amount * (e.exchangeRate || 1);
      var key = e.category || 'Other';
      totals[key] = (totals[key] || 0) + value;
      total += value;
    });

    var rows = Object.keys(totals).sort(function (a, b) { return totals[b] - totals[a]; }).map(function (cat) {
      var share = total > 0 ? (totals[cat] / total) * 100 : 0;
      return '<li class="breakdown-row">' +
        '<span class="breakdown-swatch" aria-hidden="true" style="--swatch-color:' +
        escapeHtml(CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other) + '"></span>' +
        '<span class="breakdown-name">' + escapeHtml(cat) + '</span>' +
        '<span class="breakdown-bar" aria-hidden="true"><span style="--bar-width:' + share.toFixed(1) + '%;--bar-color:' +
        escapeHtml(CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other) + '"></span></span>' +
        '<span class="breakdown-amt">' + escapeHtml(formatMoney(roundTo(totals[cat], group.currency), group.currency)) +
        ' <span class="breakdown-pct">' + share.toFixed(0) + '%</span></span>' +
        '</li>';
    }).join('');

    return '<details class="breakdown" open>' +
      '<summary>Spending breakdown · ' +
      escapeHtml(formatMoney(roundTo(total, group.currency), group.currency)) + '</summary>' +
      '<ul class="breakdown-list">' + rows + '</ul></details>';
  }

  function expenseItemHtml(group, e) {
    var payer = memberById(group, e.paidBy);
    var catColor = CATEGORY_COLORS[e.category] || CATEGORY_COLORS.Other;
    var converted = e.currency !== group.currency
      ? '<span class="expense-converted">≈ ' + escapeHtml(formatMoney(roundTo(e.amount * (e.exchangeRate || 1), group.currency), group.currency)) + '</span>'
      : '';
    var tag = e.splitType && e.splitType !== 'equal'
      ? '<span class="split-tag">' + escapeHtml(e.splitType) + '</span>' : '';
    var recurring = e.recurring ? '<span class="split-tag">' + escapeHtml(e.recurring) + '</span>' : '';

    var detailRows = e.splits.map(function (s) {
      var m = memberById(group, s.memberId);
      var extra = s.percentage != null ? ' · ' + s.percentage + '%' : (s.shares != null ? ' · ' + s.shares + ' sh' : '');
      return '<div class="expense-detail-row"><span>' + escapeHtml(displayName(group, s.memberId)) +
        '<span class="hide-sm">' + escapeHtml(extra) + '</span></span>' +
        '<span class="amt">' + escapeHtml(formatMoney(s.amount, e.currency)) + '</span></div>';
    }).join('');
    var notes = e.notes ? '<p class="expense-notes">' + escapeHtml(e.notes) + '</p>' : '';
    var rateNote = e.currency !== group.currency
      ? '<div class="expense-detail-row"><span>Rate at entry</span><span class="amt">1 ' + escapeHtml(e.currency) +
        ' = ' + escapeHtml(String(e.exchangeRate)) + ' ' + escapeHtml(group.currency) + '</span></div>'
      : '';

    return '<li class="expense-item">' +
      '<button class="expense-main" type="button" data-action="toggle-expense" aria-expanded="false" aria-controls="detail-' + escapeHtml(e.id) + '">' +
      '<span class="cat-dot" style="--dot-color:' + catColor + '" aria-hidden="true"></span>' +
      '<span class="expense-body">' +
      '<span class="expense-desc">' + escapeHtml(e.description) + '</span>' +
      '<span class="expense-sub">' + avatarHtml(payer) +
      '<span>' + escapeHtml(displayName(group, e.paidBy)) + ' paid</span>' +
      '<span aria-hidden="true">·</span>' +
      '<time datetime="' + escapeHtml(e.date) + '" title="' + escapeHtml(fullDate(e.date)) + '">' + escapeHtml(relativeDate(e.date)) + '</time>' +
      '<span class="hide-sm" aria-hidden="true">·</span><span class="hide-sm">' + escapeHtml(e.category) + '</span>' +
      tag + recurring +
      '</span></span>' +
      '<span class="expense-amounts">' +
      '<span class="expense-amount">' + escapeHtml(formatMoney(e.amount, e.currency)) + '</span>' +
      converted +
      '</span>' +
      '<svg class="expense-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>' +
      '</button>' +
      '<div class="expense-detail" id="detail-' + escapeHtml(e.id) + '" hidden>' +
      '<div class="expense-detail-table">' + detailRows + rateNote + '</div>' + notes +
      '</div></li>';
  }

  function settlementsHtml(group) {
    if (!group.settlements || !group.settlements.length) return '';
    var sorted = group.settlements.slice().sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    var items = sorted.map(function (s) {
      var converted = s.currency !== group.currency
        ? ' <span class="amt">(≈ ' + escapeHtml(formatMoney(roundTo(s.amount * (s.exchangeRate || 1), group.currency), group.currency)) + ')</span>'
        : '';
      return '<li class="settle-item">' +
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-owed)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 11.5h12m0 0-3.5-3.5M20 11.5l-3.5 3.5M16 17.5H4m0 0 3.5-3.5M4 17.5l3.5 3.5" transform="translate(0 -1.5)"/></svg>' +
        '<span class="settle-item-text"><strong>' + escapeHtml(displayName(group, s.from)) + '</strong> paid <strong>' +
        escapeHtml(displayName(group, s.to)) + '</strong> <span class="amt">' +
        escapeHtml(formatMoney(s.amount, s.currency)) + '</span>' + converted + '</span>' +
        '<time datetime="' + escapeHtml(s.date) + '" title="' + escapeHtml(fullDate(s.date)) + '">' + escapeHtml(relativeDate(s.date)) + '</time>' +
        '</li>';
    }).join('');
    return '<section class="settlement-history" aria-label="Settlement history">' +
      '<h2 class="section-title section-title-tight">Settlements</h2>' +
      '<ul class="settle-list">' + items + '</ul></section>';
  }

  /* ============ Select population ============ */

  function fillSelect(select, options, selected) {
    select.innerHTML = options.map(function (o) {
      return '<option value="' + escapeHtml(o.value) + '"' +
        (o.value === selected ? ' selected' : '') + '>' + escapeHtml(o.label) + '</option>';
    }).join('');
  }

  function currencyOptions() {
    return CURRENCIES.map(function (c) { return { value: c, label: c }; });
  }

  function memberOptions(group) {
    return group.members.map(function (m) {
      return { value: m.id, label: m.name + (youMember(group) && m.id === youMember(group).id ? ' (you)' : '') };
    });
  }

  /* ============ Expense dialog ============ */

  function openExpenseDialog() {
    var group = currentGroup();
    if (!group) return;
    var form = $('#expense-form');
    form.reset();
    showError($('#expense-error'), null);

    fillSelect($('#exp-currency'), currencyOptions(), group.currency);
    fillSelect($('#exp-paidby'), memberOptions(group), youMember(group) ? youMember(group).id : null);
    fillSelect($('#exp-category'), CATEGORIES.map(function (c) { return { value: c, label: c }; }), 'Food & Drink');
    $('#exp-date').value = new Date().toISOString().slice(0, 10);
    form.dataset.groupId = group.id;

    updateRateField();
    renderSplitMembers();
    updateSplitPreview();
    openDialog($('#expense-dialog'));
    $('#exp-desc').focus();
  }

  function splitType() {
    var checked = document.querySelector('input[name="splitType"]:checked');
    return checked ? checked.value : 'equal';
  }

  function selectedSplitMembers() {
    var group = findGroup($('#expense-form').dataset.groupId);
    if (!group) return [];
    var checked = {};
    document.querySelectorAll('#split-members input[type="checkbox"]').forEach(function (cb) {
      if (cb.checked) checked[cb.value] = true;
    });
    return group.members.filter(function (m) { return checked[m.id]; });
  }

  function splitInputValues() {
    var values = {};
    document.querySelectorAll('#split-members input[data-split-input]').forEach(function (inp) {
      var v = parseFloat(inp.value);
      values[inp.dataset.memberId] = isNaN(v) ? 0 : v;
    });
    return values;
  }

  function renderSplitMembers() {
    var group = findGroup($('#expense-form').dataset.groupId);
    if (!group) return;
    var type = splitType();
    var currency = $('#exp-currency').value || group.currency;
    var host = $('#split-members');

    /* Preserve current input values across re-renders */
    var prev = splitInputValues();
    var prevChecked = {};
    document.querySelectorAll('#split-members input[type="checkbox"]').forEach(function (cb) {
      prevChecked[cb.value] = cb.checked;
    });
    var hasPrev = Object.keys(prevChecked).length > 0;

    host.innerHTML = group.members.map(function (m) {
      var isChecked = hasPrev ? prevChecked[m.id] !== false : true;
      var inputHtml = '';
      if (type === 'exact') {
        inputHtml = '<span class="split-row-input"><input type="number" min="0" step="any" inputmode="decimal" data-split-input data-member-id="' +
          escapeHtml(m.id) + '" value="' + (prev[m.id] != null ? prev[m.id] : '') + '" placeholder="0.00" aria-label="Amount for ' + escapeHtml(m.name) + '"> ' + escapeHtml(currency) + '</span>';
      } else if (type === 'percentage') {
        inputHtml = '<span class="split-row-input"><input type="number" min="0" max="100" step="any" inputmode="decimal" data-split-input data-member-id="' +
          escapeHtml(m.id) + '" value="' + (prev[m.id] != null ? prev[m.id] : '') + '" placeholder="0" aria-label="Percentage for ' + escapeHtml(m.name) + '"> %</span>';
      } else if (type === 'shares') {
        inputHtml = '<span class="split-row-input"><input type="number" min="0" step="1" inputmode="numeric" data-split-input data-member-id="' +
          escapeHtml(m.id) + '" value="' + (prev[m.id] != null ? prev[m.id] : 1) + '" aria-label="Shares for ' + escapeHtml(m.name) + '"> sh</span>';
      }
      return '<label class="split-row' + (isChecked ? '' : ' is-excluded') + '">' +
        '<input type="checkbox" value="' + escapeHtml(m.id) + '"' + (isChecked ? ' checked' : '') + '>' +
        avatarHtml(m) +
        '<span class="split-row-name">' + escapeHtml(m.name) + '</span>' +
        inputHtml +
        '</label>';
    }).join('');
  }

  function updateSplitPreview() {
    var preview = $('#split-preview');
    var group = findGroup($('#expense-form').dataset.groupId);
    if (!group) { preview.textContent = ''; return; }
    var amount = parseFloat($('#exp-amount').value);
    var currency = $('#exp-currency').value || group.currency;
    var members = selectedSplitMembers();
    var type = splitType();

    if (!members.length) { preview.textContent = 'Select at least one member to split with.'; return; }
    if (!(amount > 0)) { preview.textContent = ''; return; }

    if (type === 'exact') {
      var inputs = splitInputValues();
      var sum = members.reduce(function (a, m) { return a + (inputs[m.id] || 0); }, 0);
      preview.textContent = formatMoney(roundTo(sum, currency), currency) + ' of ' +
        formatMoney(amount, currency) + ' assigned';
      return;
    }
    if (type === 'percentage') {
      var pcts = splitInputValues();
      var psum = members.reduce(function (a, m) { return a + (pcts[m.id] || 0); }, 0);
      preview.textContent = roundTo(psum, currency) + '% of 100% assigned';
      return;
    }

    var splits = computeSplits(type, amount, currency, members, splitInputValues());
    var amounts = splits.map(function (s) { return s.amount; });
    var uniform = amounts.every(function (a) { return a === amounts[0]; });
    if (uniform) {
      preview.textContent = formatMoney(amounts[0], currency) + ' each';
    } else {
      preview.textContent = splits.map(function (s) {
        return displayName(group, s.memberId) + ' ' + formatMoney(s.amount, currency);
      }).join(' · ');
    }
  }

  function updateRateField() {
    var group = findGroup($('#expense-form').dataset.groupId);
    if (!group) return;
    var currency = $('#exp-currency').value;
    var field = $('#rate-field');
    if (currency === group.currency) {
      field.hidden = true;
      return;
    }
    field.hidden = false;
    var rate = defaultRate(currency, group.currency);
    $('#exp-rate').value = rate;
    $('#rate-hint').textContent = '1 ' + currency + ' ≈ ' + rate + ' ' + group.currency;
    applyRateStatus();
  }

  function defaultRate(fromCurrency, toCurrency) {
    var table = rates.table;
    var from = table[fromCurrency] || 1;
    var to = table[toCurrency] || 1;
    var rate = to / from;
    return Math.round(rate * 1000000) / 1000000;
  }

  /* ============ Exchange rates ============

     One place owns rate data: a cached fetch with an explicit provenance flag,
     so the UI can say where a number came from. Rendering code only ever reads
     `rates`, never the network. */

  let rates = { table: RATE_PER_USD, source: 'fallback', fetchedAt: null };
  let rateGaps = []; /* currencies the provider did not return */

  function readCachedRates() {
    try {
      var raw = localStorage.getItem(RATES_CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.table || !parsed.fetchedAt) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function rateStatusText() {
    var gapNote = rateGaps.length
      ? ' No live rate for ' + rateGaps.join(', ') + ' — using built-in values for those.'
      : '';
    if (rates.source === 'live') return 'Live rates, updated ' + relativeDate(rates.fetchedAt) + '.' + gapNote;
    if (rates.source === 'cache') return 'Cached rates from ' + relativeDate(rates.fetchedAt) + ' — may be outdated.';
    return 'Live rates unavailable — using built-in rates, which may be outdated.';
  }

  function applyRateStatus() {
    var el = $('#rate-status');
    if (!el) return;
    el.textContent = rateStatusText();
    el.dataset.source = rates.source;
  }

  /* Never rejects: a failed refresh degrades to cache, then to the built-in
     table, because being unable to reach the API must not stop someone
     logging an expense. */
  function refreshRates() {
    var cached = readCachedRates();
    var fresh = cached && (Date.now() - cached.fetchedAt) < RATES_MAX_AGE_MS;

    if (cached) {
      rates = { table: cached.table, source: 'cache', fetchedAt: cached.fetchedAt };
      applyRateStatus();
      if (fresh) return Promise.resolve(rates);
    }

    return fetch(RATES_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.rates) throw new Error('Unexpected rates payload');

        /* A currency missing from the payload used to fall through to 1,
           which silently converts at par — a far worse outcome than an
           openly stale rate. Anything absent keeps its built-in value and is
           reported, so the conversion is never quietly wrong. */
        var table = { USD: 1 };
        var missing = [];
        CURRENCIES.forEach(function (c) {
          var v = data.rates[c];
          if (typeof v === 'number' && isFinite(v) && v > 0) {
            table[c] = v;
          } else if (c !== 'USD') {
            table[c] = RATE_PER_USD[c];
            missing.push(c);
          }
        });
        if (missing.length === CURRENCIES.length - 1) throw new Error('Rates payload had no usable currencies');
        rateGaps = missing;
        rates = { table: table, source: 'live', fetchedAt: Date.now() };
        try {
          localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ table: table, fetchedAt: rates.fetchedAt }));
        } catch (e) { /* cache is an optimisation, not a requirement */ }
        applyRateStatus();
        return rates;
      })
      .catch(function () {
        applyRateStatus();
        return rates;
      });
  }

  /* validateSplit reports what is wrong; turning that into a sentence is the
     view's job, so the rules stay testable without any copy in them. */
  function splitErrorText(problem, group, amount, currency, members) {
    var named = problem.memberId
      ? memberById(group, problem.memberId).name
      : '';
    switch (problem.code) {
      case 'no-members': return 'Select at least one member to split with.';
      case 'bad-amount': return 'Please enter a valid amount greater than zero.';
      case 'negative-or-nan': return 'Split values must be zero or more. Check ' + named + '.';
      case 'percentage-over-100': return 'A percentage cannot be more than 100%. Check ' + named + '.';
      case 'percentage-sum': return 'Percentages must add up to 100%. Currently: ' + roundTo(problem.sum, currency) + '%.';
      case 'shares-not-positive': return 'Shares must add up to more than zero.';
      case 'exact-mismatch':
        return 'Exact amounts must add up to ' + formatMoney(amount, currency) +
          '. Currently: ' + formatMoney(roundTo(problem.sum, currency), currency) + '.';
      default: return 'Please check the split values.';
    }
  }

  function submitExpense() {
    var form = $('#expense-form');
    var group = findGroup(form.dataset.groupId);
    var errorEl = $('#expense-error');
    if (!group) return;

    var description = $('#exp-desc').value.trim();
    var amount = parseFloat($('#exp-amount').value);
    var currency = $('#exp-currency').value;
    var paidBy = $('#exp-paidby').value;
    var dateVal = $('#exp-date').value;
    var category = $('#exp-category').value;
    var type = splitType();
    var members = selectedSplitMembers();
    var inputs = splitInputValues();

    if (!description) { showError(errorEl, 'Please enter a description.', $('#exp-desc')); $('#exp-desc').focus(); return; }
    if (!(amount > 0)) { showError(errorEl, 'Please enter a valid amount greater than zero.', $('#exp-amount')); $('#exp-amount').focus(); return; }
    if (!dateVal) { showError(errorEl, 'Please pick a date.', $('#exp-date')); $('#exp-date').focus(); return; }
    if (!members.length) { showError(errorEl, 'Select at least one member to split with.'); return; }

    var problem = validateSplit({ type: type, amount: amount, currency: currency, members: members, inputs: inputs });
    if (problem) {
      showError(errorEl, splitErrorText(problem, group, amount, currency, members));
      return;
    }

    var rate = 1;
    if (currency !== group.currency) {
      rate = parseFloat($('#exp-rate').value);
      if (!(rate > 0)) { showError(errorEl, 'Please enter a valid exchange rate.', $('#exp-rate')); $('#exp-rate').focus(); return; }
    }

    var expense = {
      id: uid('exp'),
      description: description,
      amount: roundTo(amount, currency),
      currency: currency,
      exchangeRate: rate,
      paidBy: paidBy,
      splitType: type,
      splits: computeSplits(type, amount, currency, members, inputs),
      date: new Date(dateVal + 'T12:00:00Z').toISOString(),
      category: category
    };

    group.expenses.push(expense);
    saveState();
    closeDialog($('#expense-dialog'));
    renderApp();
    announce('Expense added: ' + description + ', ' + formatMoney(expense.amount, currency) +
      ', paid by ' + displayName(group, paidBy) + '.');
  }

  /* ============ Settle dialog ============ */

  function openSettleDialog(prefill) {
    var group = currentGroup();
    if (!group) return;
    var form = $('#settle-form');
    form.reset();
    showError($('#settle-error'), null);
    form.dataset.groupId = group.id;

    var options = memberOptions(group);
    fillSelect($('#settle-from'), options, prefill && prefill.from ? prefill.from : null);
    fillSelect($('#settle-to'), options, prefill && prefill.to ? prefill.to : null);
    $('#settle-date').value = new Date().toISOString().slice(0, 10);
    if (prefill && prefill.amount) $('#settle-amount').value = prefill.amount;

    updateSettleHint();
    openDialog($('#settle-dialog'));
    $('#settle-amount').focus();
  }

  function updateSettleHint() {
    var group = findGroup($('#settle-form').dataset.groupId);
    if (!group) return;
    var from = $('#settle-from').value;
    var to = $('#settle-to').value;
    var hint = $('#settle-hint');
    if (from === to) {
      hint.textContent = 'Pick two different members.';
      return;
    }
    var bal = computeBalances(group);
    var suggestions = suggestSettlements(group, bal);
    var match = null;
    for (var i = 0; i < suggestions.length; i++) {
      if (suggestions[i].from === from && suggestions[i].to === to) { match = suggestions[i]; break; }
    }
    hint.textContent = match
      ? displayName(group, from) + ' currently owes ' + displayName(group, to) + ' ' +
        formatMoney(match.amount, group.currency) + '.'
      : 'No outstanding balance from ' + displayName(group, from) + ' to ' + displayName(group, to) + '.';
  }

  // What `from` still owes `to`, per the current settle-up plan. 0 when the
  // pair has nothing outstanding in that direction.
  function submitSettlement() {
    var form = $('#settle-form');
    var group = findGroup(form.dataset.groupId);
    var errorEl = $('#settle-error');
    if (!group) return;

    var from = $('#settle-from').value;
    var to = $('#settle-to').value;
    var amount = parseFloat($('#settle-amount').value);
    var dateVal = $('#settle-date').value;

    if (from === to) { showError(errorEl, 'Pick two different members.'); return; }
    if (!(amount > 0)) { showError(errorEl, 'Please enter a valid amount greater than zero.', $('#settle-amount')); $('#settle-amount').focus(); return; }
    if (!dateVal) { showError(errorEl, 'Please pick a date.', $('#settle-date')); $('#settle-date').focus(); return; }

    /* Paying more than the outstanding debt flips the pair's balance and makes
       the next settle-up suggestion point the wrong way, so cap it here. */
    var owed = outstandingBetween(group, from, to);
    if (owed <= 0) {
      showError(errorEl, displayName(group, from) + ' does not owe ' + displayName(group, to) + ' anything.', $('#settle-amount'));
      $('#settle-amount').focus();
      return;
    }
    if (amount - owed > unitFor(group.currency) / 2) {
      showError(errorEl, 'That is more than the ' + formatMoney(owed, group.currency) + ' outstanding. ' +
        'Record ' + formatMoney(owed, group.currency) + ' or less.', $('#settle-amount'));
      $('#settle-amount').focus();
      return;
    }

    var settlement = {
      id: uid('stl'),
      from: from,
      to: to,
      amount: roundTo(amount, group.currency),
      currency: group.currency,
      exchangeRate: 1,
      date: new Date(dateVal + 'T12:00:00Z').toISOString()
    };

    group.settlements = group.settlements || [];
    group.settlements.push(settlement);
    saveState();
    closeDialog($('#settle-dialog'));
    renderApp();
    announce('Settlement recorded: ' + displayName(group, from) + ' paid ' + displayName(group, to) +
      ' ' + formatMoney(settlement.amount, group.currency) + '.');
  }

  /* ============ Group dialog ============ */

  function openGroupDialog() {
    var form = $('#group-form');
    form.reset();
    showError($('#group-error'), null);
    fillSelect($('#grp-currency'), currencyOptions(), 'USD');
    openDialog($('#group-dialog'));
    $('#grp-name').focus();
  }

  function submitGroup() {
    var errorEl = $('#group-error');
    var name = $('#grp-name').value.trim();
    var description = $('#grp-desc').value.trim();
    var currency = $('#grp-currency').value;
    var memberLines = $('#grp-members').value.split('\n')
      .map(function (l) { return l.trim(); })
      .filter(function (l) { return l.length > 0; });

    if (!name) { showError(errorEl, 'Please give the group a name.', $('#grp-name')); $('#grp-name').focus(); return; }
    if (!memberLines.length) { showError(errorEl, 'Add at least one member (the first one is you).', $('#grp-members')); $('#grp-members').focus(); return; }

    var group = {
      id: uid('grp'),
      name: name,
      description: description,
      currency: currency,
      createdAt: new Date().toISOString(),
      members: memberLines.map(function (memberName, i) {
        return {
          id: uid('mem'),
          name: memberName,
          avatarColor: AVATAR_PALETTE[i % AVATAR_PALETTE.length]
        };
      }),
      expenses: [],
      settlements: []
    };

    state.groups.push(group);
    saveState();
    closeDialog($('#group-dialog'));
    location.hash = '#/app/g/' + group.id;
    announce('Group created: ' + name + '.');
  }

  /* ============ Reset ============ */

  function resetData() {
    if (!window.confirm('Reset all data back to the sample groups? Your changes will be lost.')) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SELECTED_KEY);
    } catch (e) { /* ignore */ }
    loadState().then(function (result) {
      if (!result.ok) { announce('Could not restore the demo data.'); return; }
      selectedGroupId = state.groups.length ? state.groups[0].id : null;
      if (location.hash.indexOf('#/app') === 0) {
        route();
      } else {
        location.hash = '#/app';
      }
      announce('Demo data restored.');
    });
  }

  /* ============ Sidebar (mobile) ============ */

  /* The sidebar only slides off-screen on narrow viewports; transform hides it
     visually but leaves its links tabbable, so inert has to track the state. */
  const sidebarQuery = window.matchMedia('(max-width: 900px)');

  function syncSidebarState() {
    var sidebar = $('#sidebar');
    var toggle = $('[data-action="open-sidebar"]');
    var offCanvas = sidebarQuery.matches && !document.body.classList.contains('sidebar-open');
    sidebar.toggleAttribute('inert', offCanvas);
    if (offCanvas) sidebar.setAttribute('aria-hidden', 'true');
    else sidebar.removeAttribute('aria-hidden');
    if (toggle) toggle.setAttribute('aria-expanded', String(!offCanvas && sidebarQuery.matches));
  }

  function openSidebar() {
    document.body.classList.add('sidebar-open');
    $('#sidebar-backdrop').hidden = false;
    syncSidebarState();
    var firstLink = $('#sidebar').querySelector('a, button');
    if (firstLink) firstLink.focus();
  }

  function closeSidebar() {
    document.body.classList.remove('sidebar-open');
    $('#sidebar-backdrop').hidden = true;
    syncSidebarState();
    var toggle = $('[data-action="open-sidebar"]');
    if (toggle) toggle.focus();
  }

  /* ============ Events ============ */

  function bindEvents() {
    /* Filter controls are rebuilt on every render, so listen on the document
       and read the intent off data-filter rather than rebinding each time. */
    document.addEventListener('change', function (ev) {
      var field = ev.target && ev.target.getAttribute && ev.target.getAttribute('data-filter');
      if (!field) return;
      expenseFilters[field] = ev.target.value;
      renderApp();
      var again = document.getElementById(ev.target.id);
      if (again) again.focus();
    });

    document.addEventListener('click', function (ev) {
      var actionEl = ev.target.closest('[data-action]');
      if (actionEl) {
        var action = actionEl.dataset.action;
        if (action === 'toggle-theme') toggleTheme();
        else if (action === 'open-expense') openExpenseDialog();
        else if (action === 'open-settle') openSettleDialog(null);
        else if (action === 'open-group') openGroupDialog();
        else if (action === 'reset-data') resetData();
        else if (action === 'clear-filters') { resetExpenseFilters(); renderApp(); }
        else if (action === 'open-sidebar') openSidebar();
        else if (action === 'close-sidebar') closeSidebar();
        else if (action === 'close-dialog') closeDialog(actionEl.closest('dialog'));
        else if (action === 'suggest-settle') {
          openSettleDialog({ from: actionEl.dataset.from, to: actionEl.dataset.to, amount: actionEl.dataset.amount });
        } else if (action === 'toggle-expense') {
          var expanded = actionEl.getAttribute('aria-expanded') === 'true';
          actionEl.setAttribute('aria-expanded', String(!expanded));
          var detail = document.getElementById(actionEl.getAttribute('aria-controls'));
          if (detail) detail.hidden = expanded;
        }
        return;
      }
      /* Selecting a group in the sidebar closes the mobile drawer */
      if (ev.target.closest('.group-item')) closeSidebar();
    });

    /* Forms */
    $('#expense-form').addEventListener('submit', function (ev) { ev.preventDefault(); submitExpense(); });
    $('#settle-form').addEventListener('submit', function (ev) { ev.preventDefault(); submitSettlement(); });
    $('#group-form').addEventListener('submit', function (ev) { ev.preventDefault(); submitGroup(); });

    /* Expense dialog live behavior */
    $('#split-type-group').addEventListener('change', function () {
      renderSplitMembers();
      updateSplitPreview();
    });
    $('#split-members').addEventListener('input', updateSplitPreview);
    $('#split-members').addEventListener('change', function (ev) {
      if (ev.target.matches('input[type="checkbox"]')) {
        ev.target.closest('.split-row').classList.toggle('is-excluded', !ev.target.checked);
      }
      updateSplitPreview();
    });
    $('#exp-amount').addEventListener('input', updateSplitPreview);
    $('#exp-currency').addEventListener('change', function () {
      updateRateField();
      renderSplitMembers();
      updateSplitPreview();
    });

    /* Settle dialog live behavior */
    $('#settle-from').addEventListener('change', updateSettleHint);
    $('#settle-to').addEventListener('change', updateSettleHint);

    /* Routing */
    window.addEventListener('hashchange', route);
  }

  /* ============ Init ============ */

  function init() {
    try {
      selectedGroupId = localStorage.getItem(SELECTED_KEY) || null;
    } catch (e) { /* ignore */ }
    bindEvents();
    refreshRates();
    syncSidebarState();
    sidebarQuery.addEventListener('change', syncSidebarState);
    $('#group-root').innerHTML = '<p class="loading-state">Loading your groups…</p>';
    loadState().then(function (result) {
      if (result.ok) {
        route();
        return;
      }
      /* showApp() re-renders #group-root, so the message has to be written
         after it or the render silently replaces the explanation with a
         generic "no groups yet" empty state. */
      location.hash = '#/app';
      showApp();
      $('#group-root').innerHTML = '<div class="empty-state"><h3>Couldn’t load the sample data</h3>' +
        '<p>The file data/sample-groups.json could not be fetched. Serve the app over HTTP and reload.</p></div>';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
