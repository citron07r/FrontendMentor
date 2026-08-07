/* ============================================================
   Tastemap — a personal, honestly-ranked restaurant map.
   Frontend-only: data/sample-places.json seeds the app,
   localStorage is the source of truth after first load.
   ============================================================ */
'use strict';

const STORAGE_KEY = 'tastemap:v1';
const THEME_KEY = 'tastemap:theme';
const DATA_URL = 'data/sample-places.json';

const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
  '&copy; <a href="https://carto.com/attributions">CARTO</a>';

/* ---------- state ---------- */
let meta = { center: { lat: 51.5155, lng: -0.098 }, defaultZoom: 12, cuisineGroups: [], priceLevels: {} };
let places = [];
let comparisons = [];
const filters = { status: 'all', cuisine: 'all', price: 'all', q: '' };
let selectedId = null;
let duel = null; // { placeId, low, high, question, total, sides: {left, right} }
let editingId = null;
let placedId = null; // row to animate after next render

/* ---------- tiny helpers ---------- */
const $ = (sel) => document.querySelector(sel);
const byId = (id) => places.find((p) => p.id === id);
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Escaping alone does not make a URL safe to put in href: "javascript:…"
// survives it untouched and runs on click. Only http(s) links are rendered.
function safeUrl(value) {
  try {
    const url = new URL(String(value ?? '').trim(), location.href);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

function announce(msg) {
  const el = $('#announcer');
  el.textContent = '';
  // Force a live-region update even for repeated messages.
  requestAnimationFrame(() => { el.textContent = msg; });
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ places, comparisons }));
  } catch (err) {
    console.error('Could not persist to localStorage', err);
    announce('Could not save your changes in this browser.');
  }
}

function readSaved() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed.places)) return null;
    return {
      places: parsed.places,
      comparisons: Array.isArray(parsed.comparisons) ? parsed.comparisons : [],
    };
  } catch {
    return null;
  }
}

// Saved places are the source of truth once they exist, so a return visit works
// offline. The sample file is fetched for meta (map centre, cuisine groups) and
// as the seed on a first visit — but a failed fetch must never hide places the
// visitor already has.
async function loadData() {
  const saved = readSaved();

  let data = null;
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`Failed to load ${DATA_URL}: ${res.status}`);
    data = await res.json();
  } catch (err) {
    if (!saved) throw err;
    announce('Offline — showing your saved places.');
  }

  if (data?.meta) meta = data.meta;

  if (saved) {
    places = saved.places;
    comparisons = saved.comparisons;
    return;
  }

  places = data.places;
  comparisons = data.comparisons;
  saveData();
}

const rankedPlaces = () =>
  places.filter((p) => p.status === 'ranked').sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
const wantPlaces = () => places.filter((p) => p.status === 'want');

function priceText(level) {
  if (!level) return '';
  return meta.priceLevels?.[String(level)] || '£'.repeat(level);
}

function cuisineVar(place) {
  const group = (place.cuisineGroup || 'other').toLowerCase();
  return `var(--cuisine-${meta.cuisineGroups?.includes(group) ? group : 'other'})`;
}

function avatarHtml(place, extra = '') {
  const initial = esc((place.name || '?').trim().charAt(0).toUpperCase());
  return `<span class="avatar ${extra}" style="background:${cuisineVar(place)}" aria-hidden="true">${initial}</span>`;
}

function visiblePlaces(list) {
  const q = filters.q.trim().toLowerCase();
  return list.filter((p) => {
    if (filters.status === 'been' && p.status !== 'ranked') return false;
    if (filters.status === 'want' && p.status !== 'want') return false;
    if (filters.cuisine !== 'all' && (p.cuisineGroup || 'other') !== filters.cuisine) return false;
    if (filters.price !== 'all' && String(p.priceLevel || '') !== filters.price) return false;
    if (q) {
      const hay = [p.name, p.cuisine, p.specialty, p.area, ...(p.tags || [])].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/* ============================================================
   Map
   ============================================================ */
let map = null;
let tileLayer = null;
let clusterLayer = null;
const markers = new Map(); // placeId -> L.Marker
let tileFailed = false;

function isDark() {
  const t = document.documentElement.dataset.theme;
  if (t) return t === 'dark';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

function addTileLayer() {
  if (tileLayer) tileLayer.remove();
  tileLayer = L.tileLayer(isDark() ? TILE_DARK : TILE_LIGHT, {
    attribution: TILE_ATTR,
    maxZoom: 19,
  });
  tileLayer.on('tileerror', () => {
    if (tileFailed) return;
    tileFailed = true;
    $('#map-notice').hidden = false;
    announce("Couldn't load the map tiles — your list still works.");
  });
  tileLayer.addTo(map);
}

function initMap() {
  if (typeof L === 'undefined') {
    // Leaflet itself failed (offline CDN) — the list must still work.
    $('#map-notice').hidden = false;
    $('#map-notice p').textContent = "Couldn't load the map — your list still works.";
    return;
  }
  map = L.map('map', { zoomControl: true }).setView([meta.center.lat, meta.center.lng], meta.defaultZoom);
  addTileLayer();

  // Soho alone holds seven places within a few hundred metres, so pins are
  // grouped through a cluster layer rather than added to the map directly.
  // Without the plugin the markers still render — they just stop clustering.
  clusterLayer = typeof L.markerClusterGroup === 'function'
    ? L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 44,
        spiderfyDistanceMultiplier: 1.4,
      })
    : L.layerGroup();
  clusterLayer.addTo(map);
  $('#map-retry').addEventListener('click', () => {
    tileFailed = false;
    $('#map-notice').hidden = true;
    addTileLayer();
  });
}

function pinIcon(place) {
  const ranked = place.status === 'ranked';
  const top = ranked && place.rank === 1;
  const inner = ranked
    ? `<span aria-hidden="true">${place.rank ?? ''}</span>`
    : '<span aria-hidden="true">★</span>';
  return L.divIcon({
    className: `pin-wrap${selectedId === place.id ? ' pin-selected' : ''}`,
    html: `<div class="pin ${ranked ? 'pin-ranked' : 'pin-want'}${top ? ' pin-top' : ''}">${inner}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

function markerLabel(place) {
  const bits = [place.name];
  if (place.status === 'ranked') bits.push(`ranked number ${place.rank}`);
  else bits.push('want to try');
  if (place.cuisine) bits.push(place.cuisine);
  if (place.area) bits.push(place.area);
  return bits.join(', ');
}

function renderMarkers() {
  if (!map) return;
  const visible = new Set(visiblePlaces(places).map((p) => p.id));
  for (const [id, marker] of markers) {
    if (!visible.has(id) || !byId(id)) {
      clusterLayer.removeLayer(marker);
      markers.delete(id);
    }
  }
  for (const place of places) {
    if (!visible.has(place.id) || typeof place.lat !== 'number' || typeof place.lng !== 'number') continue;
    let marker = markers.get(place.id);
    if (!marker) {
      marker = L.marker([place.lat, place.lng], {
        icon: pinIcon(place),
        title: place.name,
        keyboard: true,
        riseOnHover: true,
      });
      marker.on('click', () => selectPlace(place.id, { source: 'map' }));
      marker.on('mouseover', () => highlightRow(place.id, true));
      marker.on('mouseout', () => highlightRow(place.id, false));
      clusterLayer.addLayer(marker);
      markers.set(place.id, marker);
    } else {
      marker.setIcon(pinIcon(place));
      marker.setLatLng([place.lat, place.lng]);
    }
    const el = marker.getElement();
    if (el) el.setAttribute('aria-label', markerLabel(place));
  }
}

function fitMapToVisible() {
  if (!map) return;
  const pts = visiblePlaces(places).filter((p) => typeof p.lat === 'number');
  if (!pts.length) return;
  const bounds = L.latLngBounds(pts.map((p) => [p.lat, p.lng]));
  map.fitBounds(bounds.pad(0.15), { maxZoom: 14 });
}

/* ============================================================
   List rendering
   ============================================================ */
function rowHtml(place, rank) {
  const sub = [place.cuisine, place.specialty, place.area].filter(Boolean).join(' · ');
  const price = priceText(place.priceLevel);
  return `
    ${rank ? `<span class="rank-num" aria-hidden="true">${rank}</span>` : ''}
    ${avatarHtml(place)}
    <span class="row-main">
      <span class="row-name">${esc(place.name)}</span>
      <span class="row-sub">${esc(sub)}</span>
    </span>
    ${price ? `<span class="row-price" aria-label="${esc(price)}">${esc('£'.repeat(place.priceLevel))}</span>` : ''}`;
}

function makeRow(place, rank) {
  const li = document.createElement('li');
  li.className = 'place-row';
  li.tabIndex = 0;
  li.dataset.id = place.id;
  if (place.id === placedId) li.classList.add('row-placed');
  const label = rank
    ? `${place.name}, ranked number ${rank}. ${place.cuisine || ''} ${place.area || ''}`
    : `${place.name}, want to try. ${place.cuisine || ''} ${place.area || ''}`;
  li.setAttribute('aria-label', label.trim());
  li.setAttribute('aria-current', place.id === selectedId ? 'true' : 'false');
  li.innerHTML = rowHtml(place, rank);

  if (place.status === 'want') {
    const been = document.createElement('button');
    been.type = 'button';
    been.className = 'row-been';
    been.textContent = "I've been";
    been.setAttribute('aria-label', `I've been to ${place.name} — rank it`);
    been.addEventListener('click', (e) => {
      e.stopPropagation();
      markBeen(place.id);
    });
    li.appendChild(been);
  }

  li.addEventListener('click', () => selectPlace(place.id, { source: 'list' }));
  li.addEventListener('keydown', (e) => {
    if (e.target !== li) return; // let inner buttons handle their own keys
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectPlace(place.id, { source: 'list' });
    }
  });
  li.addEventListener('mouseenter', () => highlightPin(place.id, true));
  li.addEventListener('mouseleave', () => highlightPin(place.id, false));
  li.addEventListener('focus', () => highlightPin(place.id, true));
  li.addEventListener('blur', () => highlightPin(place.id, false));
  return li;
}

function renderList() {
  const ranked = visiblePlaces(rankedPlaces());
  const want = visiblePlaces(wantPlaces());
  const total = places.length;
  const shown = ranked.length + want.length;

  $('#result-count').textContent =
    shown === total ? `Showing all ${total} places` : `Showing ${shown} of ${total} places`;

  const rankedEl = $('#ranked-list');
  rankedEl.innerHTML = '';
  ranked.forEach((p) => rankedEl.appendChild(makeRow(p, p.rank)));
  $('#ranked-empty').hidden = ranked.length > 0;

  const wantEl = $('#want-list');
  wantEl.innerHTML = '';
  want.forEach((p) => wantEl.appendChild(makeRow(p, null)));
  $('#want-empty').hidden = want.length > 0;

  placedId = null;
}

function highlightRow(id, on) {
  const row = document.querySelector(`.place-row[data-id="${CSS.escape(id)}"]`);
  if (row) row.classList.toggle('row-hover', on);
}

function highlightPin(id, on) {
  const marker = markers.get(id);
  const el = marker?.getElement();
  if (el) el.classList.toggle('pin-hover', on);
}

/* ============================================================
   Selection sync (map <-> list) + detail sheet
   ============================================================ */
function selectPlace(id, { source } = {}) {
  selectedId = id;
  const place = byId(id);
  if (!place) return;

  document.querySelectorAll('.place-row').forEach((row) => {
    row.setAttribute('aria-current', row.dataset.id === id ? 'true' : 'false');
  });
  for (const [mid, marker] of markers) {
    const el = marker.getElement();
    if (el) el.classList.toggle('pin-selected', mid === id);
  }

  if (map && typeof place.lat === 'number') {
    const marker = markers.get(id);
    // A clustered pin has no element until its cluster opens, so picking a
    // place from the list has to expand the cluster, not just pan over it.
    if (marker && typeof clusterLayer?.zoomToShowLayer === 'function') {
      clusterLayer.zoomToShowLayer(marker, () => {
        marker.getElement()?.classList.add('pin-selected');
      });
    } else {
      map.panTo([place.lat, place.lng], { animate: true });
    }
  }
  if (source === 'map') {
    const row = document.querySelector(`.place-row[data-id="${CSS.escape(id)}"]`);
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  openSheet(id, source);
}

function openSheet(id, source) {
  const place = byId(id);
  if (!place) return;

  const ranked = place.status === 'ranked';
  const price = priceText(place.priceLevel);
  const website = safeUrl(place.website);
  const facts = [];
  if (ranked && place.rank) facts.push(`<li class="fact fact-rank">Ranked #${place.rank}</li>`);
  if (!ranked) facts.push('<li class="fact fact-want">Want to try</li>');
  if (place.cuisine) facts.push(`<li class="fact">${esc(place.cuisine)}</li>`);
  if (price) facts.push(`<li class="fact">${esc(price)}</li>`);
  if (place.visits) facts.push(`<li class="fact">${place.visits} visit${place.visits === 1 ? '' : 's'}</li>`);
  (place.tags || []).forEach((t) => facts.push(`<li class="fact">#${esc(t)}</li>`));

  $('#sheet').innerHTML = `
    <div class="sheet-head">
      ${avatarHtml(place)}
      <div>
        <h2 id="sheet-name" class="sheet-name">${esc(place.name)}</h2>
        <p class="sheet-meta">${esc([place.cuisine, place.specialty].filter(Boolean).join(' · '))}</p>
      </div>
    </div>
    <ul class="sheet-facts">${facts.join('')}</ul>
    ${place.note ? `<blockquote class="sheet-note">${esc(place.note)}</blockquote>` : ''}
    <p class="sheet-address">
      ${esc(place.address || '')}
      ${website ? ` · <a href="${esc(website)}" target="_blank" rel="noopener noreferrer">Website</a>` : ''}
    </p>
    <div class="sheet-actions">
      ${ranked
        ? '<button type="button" class="btn btn-primary" data-action="rerank">Re-rank</button>'
        : '<button type="button" class="btn btn-primary" data-action="been">I\'ve been — rank it</button>'}
      <button type="button" class="btn btn-ghost" data-action="edit">Edit</button>
      <button type="button" class="btn btn-danger" data-action="delete">Delete</button>
      <button type="button" class="btn btn-ghost" data-action="close">Close</button>
    </div>`;

  $('#sheet').querySelector('[data-action="close"]').addEventListener('click', closeSheet);
  $('#sheet').querySelector('[data-action="edit"]').addEventListener('click', () => {
    closeSheet();
    openForm(id);
  });
  $('#sheet').querySelector('[data-action="delete"]').addEventListener('click', () => deletePlace(id));
  const primary = $('#sheet').querySelector('[data-action="been"], [data-action="rerank"]');
  primary?.addEventListener('click', () => {
    closeSheet();
    if (ranked) startDuel(id);
    else markBeen(id);
  });

  $('#sheet-backdrop').showModal();
  $('#sheet').querySelector('[data-action="close"]').focus();
  announce(`${place.name}. ${ranked ? `Ranked number ${place.rank}.` : 'On your want-to-try list.'}`);
}

function closeSheet() {
  const dialog = $('#sheet-backdrop');
  if (dialog.open) dialog.close();
}

// Runs however the sheet was dismissed: the close button, a backdrop click, or
// Escape handled by the browser.
function onSheetClosed() {
  selectedId = null;
  document.querySelectorAll('.place-row[aria-current="true"]').forEach((r) => r.setAttribute('aria-current', 'false'));
  for (const marker of markers.values()) marker.getElement()?.classList.remove('pin-selected');
}

function deletePlace(id) {
  const place = byId(id);
  if (!place) return;
  if (!window.confirm(`Delete ${place.name}? This can't be undone.`)) return;
  places = places.filter((p) => p.id !== id);
  comparisons = comparisons.filter((c) => c.aId !== id && c.bId !== id);
  renumber();
  saveData();
  closeSheet();
  renderAll();
  announce(`${place.name} deleted.`);
}

/* ============================================================
   Comparison duel — binary insertion, ~log2(n) questions
   ============================================================ */
function markBeen(id) {
  const place = byId(id);
  if (!place) return;
  place.status = 'ranked';
  place.rank = null;
  place.visits = Math.max(1, place.visits || 0);
  startDuel(id);
}

function startDuel(placeId) {
  const ranked = rankedPlaces().filter((p) => p.id !== placeId);
  const place = byId(placeId);
  if (!place) return;

  if (ranked.length === 0) {
    // First ranked place takes #1 — nothing to compare against.
    place.rank = 1;
    renumber();
    saveData();
    renderAll();
    placedId = placeId;
    renderList();
    announce(`${place.name} is your first ranked place — it takes number 1.`);
    return;
  }

  duel = {
    placeId,
    low: 0,
    high: ranked.length, // insertion point in [low, high]
    question: 1,
    total: Math.max(1, Math.ceil(Math.log2(ranked.length + 1))),
  };
  renderDuel();
  const duelDialog = $('#duel-backdrop');
  // returnValue survives from the previous duel, so clear it before opening:
  // a stale 'placed' would make the close handler skip the bail path.
  duelDialog.returnValue = '';
  duelDialog.showModal();
  $('#duel-a').focus();
}

function duelOpponent() {
  const ranked = rankedPlaces().filter((p) => p.id !== duel.placeId);
  const mid = Math.floor((duel.low + duel.high - 1) / 2);
  return { opponent: ranked[mid], mid };
}

function renderDuel() {
  const place = byId(duel.placeId);
  const { opponent } = duelOpponent();
  $('#duel-progress').textContent = `Question ${duel.question} of ~${duel.total}`;
  $('#duel-sub').innerHTML = `Placing <strong>${esc(place.name)}</strong> among your ${rankedPlaces().length} ranked places`;

  // Randomise sides so the new place isn't always on the same button.
  const leftFirst = Math.random() < 0.5;
  const [left, right] = leftFirst ? [place, opponent] : [opponent, place];
  duel.sides = { left: left.id, right: right.id };

  const optionHtml = (p, key) => `
    ${avatarHtml(p)}
    <span class="duel-option-name">${esc(p.name)}</span>
    <span class="duel-option-sub">${esc([p.cuisine, p.specialty, p.area].filter(Boolean).join(' · '))}</span>
    ${p.id !== place.id && p.rank ? `<span class="duel-option-rank">Currently #${p.rank}</span>` : '<span class="duel-option-rank">The challenger</span>'}
    <kbd>${key}</kbd>`;
  $('#duel-a').innerHTML = optionHtml(left, '←');
  $('#duel-b').innerHTML = optionHtml(right, '→');
  $('#duel-a').setAttribute('aria-label', `${left.name} was better`);
  $('#duel-b').setAttribute('aria-label', `${right.name} was better`);
}

function answerDuel(winnerSide /* 'left' | 'right' | 'tie' */) {
  const place = byId(duel.placeId);
  const { opponent, mid } = duelOpponent();
  const leftId = duel.sides.left;
  const today = new Date().toISOString().slice(0, 10);

  if (winnerSide === 'tie') {
    comparisons.push({ aId: place.id, bId: opponent.id, result: 'tie', date: today });
    // A tie slots the challenger just below its equal — no false order forced.
    duel.low = mid + 1;
    finishDuel();
    return;
  }

  const winnerId = winnerSide === 'left' ? leftId : duel.sides.right;
  const challengerWon = winnerId === place.id;
  comparisons.push(
    challengerWon
      ? { aId: place.id, bId: opponent.id, result: 'a', date: today }
      : { aId: opponent.id, bId: place.id, result: 'a', date: today }
  );

  if (challengerWon) duel.high = mid; // challenger ranks above the opponent
  else duel.low = mid + 1;

  if (duel.low >= duel.high) {
    finishDuel();
  } else {
    duel.question += 1;
    renderDuel();
    announce(challengerWon ? `${place.name} wins — moving up.` : `${opponent.name} holds its spot.`);
  }
}

function finishDuel() {
  const place = byId(duel.placeId);
  place.rank = duel.low + 1; // provisional; renumber fixes the rest
  insertAtRank(place, duel.low);
  const finalRank = place.rank;
  duel = null;
  // 'placed' tells the close handler this was a completed ranking, not a bail.
  $('#duel-backdrop').close('placed');
  saveData();
  renderAll();
  placedId = place.id;
  renderList();
  announce(`${place.name} placed at number ${finalRank}.`);
}

// Escape and "Finish later" both land here, via the dialog's close event.
function bailDuel() {
  if (!duel) return;
  // Keep the work: slot the challenger at the current best-guess position.
  const place = byId(duel.placeId);
  insertAtRank(place, duel.low);
  const tentative = place.rank;
  duel = null;
  saveData();
  renderAll();
  announce(`${place.name} tentatively placed at number ${tentative}. Re-rank it anytime from its details.`);
}

function insertAtRank(place, index) {
  const ranked = rankedPlaces().filter((p) => p.id !== place.id);
  ranked.splice(Math.max(0, Math.min(index, ranked.length)), 0, place);
  ranked.forEach((p, i) => { p.rank = i + 1; });
}

function renumber() {
  rankedPlaces().forEach((p, i) => { p.rank = i + 1; });
}

/* ============================================================
   Add / edit form
   ============================================================ */
// Keeps the message, the field's validity state, and the link between them in
// step, so the error is never announced without saying which field it belongs to.
function setNameError(hasError) {
  const field = $('#f-name');
  $('#f-name-error').hidden = !hasError;
  field.setAttribute('aria-invalid', String(hasError));
  if (hasError) field.setAttribute('aria-describedby', 'f-name-error');
  else field.removeAttribute('aria-describedby');
}

function openForm(id = null) {
  editingId = id;
  const form = $('#place-form');
  form.reset();
  setNameError(false);

  const groupSel = $('#f-cuisine-group');
  groupSel.innerHTML = meta.cuisineGroups
    .map((g) => `<option value="${esc(g)}">${esc(g)}</option>`)
    .join('');

  if (id) {
    const p = byId(id);
    $('#form-title').textContent = `Edit ${p.name}`;
    $('#f-name').value = p.name || '';
    $('#f-cuisine').value = p.cuisine || '';
    groupSel.value = p.cuisineGroup || 'other';
    $('#f-specialty').value = p.specialty || '';
    $('#f-area').value = p.area || '';
    $('#f-address').value = p.address || '';
    $('#f-website').value = p.website || '';
    $('#f-lat').value = p.lat ?? '';
    $('#f-lng').value = p.lng ?? '';
    $('#f-price').value = p.priceLevel ? String(p.priceLevel) : '';
    $('#f-tags').value = (p.tags || []).join(', ');
    $('#f-note').value = p.note || '';
    form.elements.status.value = p.status === 'ranked' ? 'been' : 'want';
  } else {
    $('#form-title').textContent = 'Add a place';
    groupSel.value = 'other';
  }

  $('#form-backdrop').showModal();
  $('#f-name').focus();
}

function closeForm() {
  const dialog = $('#form-backdrop');
  if (dialog.open) dialog.close();
}

function submitForm(e) {
  e.preventDefault();
  const form = e.target;
  const name = $('#f-name').value.trim();
  if (!name) {
    setNameError(true);
    $('#f-name').focus();
    return;
  }
  setNameError(false);

  const wasRanked = editingId ? byId(editingId)?.status === 'ranked' : false;
  const status = form.elements.status.value === 'been' ? 'ranked' : 'want';
  const lat = parseFloat($('#f-lat').value);
  const lng = parseFloat($('#f-lng').value);

  const fields = {
    name,
    cuisine: $('#f-cuisine').value.trim(),
    cuisineGroup: $('#f-cuisine-group').value,
    specialty: $('#f-specialty').value.trim(),
    area: $('#f-area').value.trim(),
    address: $('#f-address').value.trim(),
    website: $('#f-website').value.trim(),
    lat: Number.isFinite(lat) ? lat : meta.center.lat + (Math.random() - 0.5) * 0.02,
    lng: Number.isFinite(lng) ? lng : meta.center.lng + (Math.random() - 0.5) * 0.02,
    priceLevel: $('#f-price').value ? Number($('#f-price').value) : null,
    tags: $('#f-tags').value.split(',').map((t) => t.trim()).filter(Boolean),
    note: $('#f-note').value.trim(),
  };

  if (editingId) {
    const place = byId(editingId);
    Object.assign(place, fields);
    const id = editingId;
    closeForm();
    if (status === 'ranked' && !wasRanked) {
      place.status = 'ranked';
      place.rank = null;
      saveData();
      renderAll();
      startDuel(id);
      return;
    }
    place.status = status === 'ranked' ? 'ranked' : 'want';
    if (place.status === 'want') place.rank = null;
    renumber();
    saveData();
    renderAll();
    announce(`${place.name} updated.`);
  } else {
    const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`;
    const place = {
      id,
      ...fields,
      status: 'want',
      rank: null,
      visits: 0,
      photo: null,
      dateAdded: new Date().toISOString().slice(0, 10),
    };
    places.push(place);
    closeForm();
    if (status === 'ranked') {
      place.status = 'ranked';
      place.visits = 1;
      saveData();
      renderAll();
      startDuel(id);
      return;
    }
    saveData();
    renderAll();
    announce(`${place.name} added to your want-to-try list.`);
  }
}

/* ============================================================
   Focus trapping for dialogs
   ============================================================ */
/* ============================================================
   Filters
   ============================================================ */
function initFilters() {
  const cuisineSel = $('#filter-cuisine');
  const groups = [...new Set(places.map((p) => p.cuisineGroup || 'other'))].sort();
  cuisineSel.innerHTML =
    '<option value="all">All cuisines</option>' +
    groups.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join('');

  document.querySelectorAll('.status-filter .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      filters.status = chip.dataset.status;
      document.querySelectorAll('.status-filter .chip').forEach((c) =>
        c.setAttribute('aria-pressed', String(c === chip))
      );
      applyFilters();
    });
  });

  cuisineSel.addEventListener('change', () => { filters.cuisine = cuisineSel.value; applyFilters(); });
  $('#filter-price').addEventListener('change', (e) => { filters.price = e.target.value; applyFilters(); });
  $('#filter-q').addEventListener('input', (e) => { filters.q = e.target.value; applyFilters(); });
  $('#filter-clear').addEventListener('click', () => {
    filters.status = 'all';
    filters.cuisine = 'all';
    filters.price = 'all';
    filters.q = '';
    $('#filter-q').value = '';
    cuisineSel.value = 'all';
    $('#filter-price').value = 'all';
    document.querySelectorAll('.status-filter .chip').forEach((c) =>
      c.setAttribute('aria-pressed', String(c.dataset.status === 'all'))
    );
    applyFilters();
    announce('Filters cleared.');
  });
}

function applyFilters() {
  renderList();
  renderMarkers();
  fitMapToVisible();
}

/* ============================================================
   Theme
   ============================================================ */
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) document.documentElement.dataset.theme = saved;
  syncThemeButton();
  $('#theme-toggle').addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
    syncThemeButton();
    if (map) addTileLayer();
    announce(`${next === 'dark' ? 'Dark' : 'Light'} theme on.`);
  });
}
function syncThemeButton() {
  $('#theme-toggle').setAttribute('aria-pressed', String(isDark()));
}

/* ============================================================
   Mobile view tabs
   ============================================================ */
function initViewTabs() {
  document.querySelectorAll('.view-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.body.dataset.view = tab.dataset.view;
      document.querySelectorAll('.view-tab').forEach((t) =>
        t.setAttribute('aria-pressed', String(t === tab))
      );
      if (tab.dataset.view === 'map' && map) map.invalidateSize();
    });
  });
}

/* ============================================================
   Boot
   ============================================================ */
function renderAll() {
  renderList();
  renderMarkers();
}

async function boot() {
  try {
    await loadData();
  } catch (err) {
    console.error(err);
    $('#result-count').textContent = "Couldn't load the sample data — check that data/sample-places.json is served alongside the app.";
    return;
  }

  initTheme();
  initMap();
  initFilters();
  initViewTabs();
  renderAll();
  fitMapToVisible();

  $('#add-place').addEventListener('click', () => openForm());
  $('#place-form').addEventListener('submit', submitForm);
  $('#form-cancel').addEventListener('click', closeForm);

  $('#duel-a').addEventListener('click', () => duel && answerDuel('left'));
  $('#duel-b').addEventListener('click', () => duel && answerDuel('right'));
  $('#duel-tie').addEventListener('click', () => duel && answerDuel('tie'));
  $('#duel-bail').addEventListener('click', () => duel && $('#duel-backdrop').close());

  document.addEventListener('keydown', (e) => {
    if (!duel) return;
    if (e.key === 'ArrowLeft' || e.key === '1') { e.preventDefault(); answerDuel('left'); }
    else if (e.key === 'ArrowRight' || e.key === '2') { e.preventDefault(); answerDuel('right'); }
    else if (e.key.toLowerCase() === 't') { e.preventDefault(); answerDuel('tie'); }
  });

  // Backdrop clicks close the non-destructive dialogs (never the duel).
  $('#sheet-backdrop').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeSheet();
  });
  $('#form-backdrop').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeForm();
  });

  // Cleanup hangs off 'close', so it runs no matter how a dialog was dismissed:
  // a button, a backdrop click, or the Escape the browser handles for us.
  $('#sheet-backdrop').addEventListener('close', onSheetClosed);
  $('#form-backdrop').addEventListener('close', () => { editingId = null; });
  $('#duel-backdrop').addEventListener('close', (e) => {
    // Anything other than a completed placement means the visitor stepped away.
    if (e.currentTarget.returnValue !== 'placed') bailDuel();
  });
}

document.addEventListener('DOMContentLoaded', boot);
