// Maison Soleil — booking confirmation interactions
// Wi-Fi password copy-to-clipboard + mobile menu toggle.

(function () {
  'use strict';

  /* ---------- Wi-Fi copy button ---------- */

  const copyBtn = document.getElementById('copy-wifi');
  const wifiPassword = document.getElementById('wifi-password');

  // Returns whether the copy actually landed, so the caller never claims
  // success on a browser that refused the clipboard.
  function fallbackCopy(text) {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'absolute';
    field.style.left = '-9999px';
    document.body.appendChild(field);
    field.select();

    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (error) {
      copied = false;
    }

    document.body.removeChild(field);
    return copied;
  }

  if (copyBtn && wifiPassword) {
    let resetTimer;

    function flash(label, stateClass) {
      copyBtn.textContent = label;
      copyBtn.classList.remove('is-copied', 'is-failed');
      if (stateClass) copyBtn.classList.add(stateClass);

      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(function () {
        copyBtn.textContent = 'Copy';
        copyBtn.classList.remove('is-copied', 'is-failed');
      }, 2000);
    }

    copyBtn.addEventListener('click', async function () {
      const text = wifiPassword.textContent.trim();
      let copied = false;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          copied = true;
        } catch (error) {
          copied = fallbackCopy(text);
        }
      } else {
        copied = fallbackCopy(text);
      }

      if (copied) {
        flash('Copied', 'is-copied');
      } else {
        flash('Copy failed', 'is-failed');
      }
    });
  }

  /* ---------- Mobile menu toggle ---------- */

  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menu-toggle');
  const menuClose = document.getElementById('menu-close');
  const scrim = document.getElementById('scrim');

  if (!sidebar || !menuToggle) return;

  // Mirrors the breakpoint where the sidebar becomes an off-canvas panel.
  const offCanvasQuery = window.matchMedia('(max-width: 900px)');

  // While the panel sits off-screen its links stay in the document, so without
  // inert a keyboard user tabs through navigation they cannot see.
  function syncHiddenState() {
    const hidden = offCanvasQuery.matches && !sidebar.classList.contains('is-open');
    sidebar.toggleAttribute('inert', hidden);

    if (hidden) {
      sidebar.setAttribute('aria-hidden', 'true');
    } else {
      sidebar.removeAttribute('aria-hidden');
    }
  }

  function openMenu() {
    sidebar.classList.add('is-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    if (scrim) scrim.hidden = false;
    syncHiddenState();
    if (menuClose) menuClose.focus();
  }

  function closeMenu() {
    sidebar.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    if (scrim) scrim.hidden = true;
    syncHiddenState();
    menuToggle.focus();
  }

  menuToggle.addEventListener('click', openMenu);
  if (menuClose) menuClose.addEventListener('click', closeMenu);
  if (scrim) scrim.addEventListener('click', closeMenu);

  // Close on Escape for keyboard users.
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && sidebar.classList.contains('is-open')) {
      closeMenu();
    }
  });

  // Close the menu when a nav link is chosen.
  sidebar.querySelectorAll('.nav-link').forEach(function (link) {
    link.addEventListener('click', function () {
      if (sidebar.classList.contains('is-open')) closeMenu();
    });
  });

  offCanvasQuery.addEventListener('change', syncHiddenState);
  syncHiddenState();
})();
