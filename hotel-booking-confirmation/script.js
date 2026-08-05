// Maison Soleil — booking confirmation interactions
// Wi-Fi password copy-to-clipboard + mobile menu toggle.

(function () {
  'use strict';

  /* ---------- Wi-Fi copy button ---------- */

  var copyBtn = document.getElementById('copy-wifi');
  var wifiPassword = document.getElementById('wifi-password');

  if (copyBtn && wifiPassword) {
    copyBtn.addEventListener('click', function () {
      var text = wifiPassword.textContent.trim();

      function showCopied() {
        copyBtn.textContent = 'Copied';
        copyBtn.classList.add('is-copied');
        window.setTimeout(function () {
          copyBtn.textContent = 'Copy';
          copyBtn.classList.remove('is-copied');
        }, 2000);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(showCopied, function () {
          fallbackCopy(text);
          showCopied();
        });
      } else {
        fallbackCopy(text);
        showCopied();
      }
    });
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch (e) {
      // Clipboard unavailable — nothing else to do.
    }
    document.body.removeChild(ta);
  }

  /* ---------- Mobile menu toggle ---------- */

  var sidebar = document.getElementById('sidebar');
  var menuToggle = document.getElementById('menu-toggle');
  var menuClose = document.getElementById('menu-close');
  var scrim = document.getElementById('scrim');

  if (!sidebar || !menuToggle) return;

  function openMenu() {
    sidebar.classList.add('is-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    if (scrim) scrim.hidden = false;
    if (menuClose) menuClose.focus();
  }

  function closeMenu() {
    sidebar.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    if (scrim) scrim.hidden = true;
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
})();
