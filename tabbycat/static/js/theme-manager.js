/**
 * Tabbycat Theme Manager
 * Handles dark mode toggle, persistence, and system preference detection
 *
 * Usage:
 * - Toggle: TabbycatTheme.toggle()
 * - Set: TabbycatTheme.set('dark') or TabbycatTheme.set('light')
 * - Get: TabbycatTheme.get() returns current preference
 * - Get effective: TabbycatTheme.getEffective() returns actual applied theme
 */
(function() {
  'use strict';

  var THEME_KEY = 'tabbycat-theme';
  var THEMES = {
    LIGHT: 'light',
    DARK: 'dark'
  };

  // Get stored preference or default to light
  function getStoredPreference() {
    try {
      return localStorage.getItem(THEME_KEY) || THEMES.LIGHT;
    } catch (e) {
      // localStorage may be unavailable (private browsing, etc.)
      return THEMES.LIGHT;
    }
  }

  // Store preference
  function setStoredPreference(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      // Silently fail if localStorage unavailable
    }
  }

  // Apply theme to document
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    // Update any toggle buttons
    updateToggleButtons(theme);

    // Dispatch custom event for components that may need to react
    if (typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('themechange', {
        detail: { theme: theme }
      }));
    }
  }

  // Update toggle button states and icons
  function updateToggleButtons(theme) {
    var toggles = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < toggles.length; i++) {
      var toggle = toggles[i];
      toggle.setAttribute('aria-pressed', theme === THEMES.DARK ? 'true' : 'false');
      toggle.setAttribute('title', theme === THEMES.DARK ? 'Light Mode' : 'Dark Mode');
    }

    // Re-initialize feather icons if available
    if (typeof feather !== 'undefined' && feather.replace) {
      setTimeout(function() {
        feather.replace();
      }, 10);
    }
  }

  // Toggle between themes
  function toggleTheme() {
    var current = getStoredPreference();
    var next = current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;

    setStoredPreference(next);
    applyTheme(next);

    return next;
  }

  // Set specific theme
  function setTheme(theme) {
    if (theme === THEMES.LIGHT || theme === THEMES.DARK) {
      setStoredPreference(theme);
      applyTheme(theme);
      return theme;
    }
    return null;
  }

  // Initialize theme on page load
  function initTheme() {
    var preference = getStoredPreference();
    applyTheme(preference);

    // Setup click handlers for toggle buttons
    document.addEventListener('click', function(e) {
      var toggle = e.target.closest ? e.target.closest('[data-theme-toggle]') : null;

      // Fallback for browsers without closest
      if (!toggle) {
        var el = e.target;
        while (el && el !== document) {
          if (el.hasAttribute && el.hasAttribute('data-theme-toggle')) {
            toggle = el;
            break;
          }
          el = el.parentNode;
        }
      }

      if (toggle) {
        e.preventDefault();
        e.stopPropagation();
        toggleTheme();
      }
    });

    // Update buttons on load
    updateToggleButtons(preference);
  }

  // Expose API globally
  window.TabbycatTheme = {
    toggle: toggleTheme,
    set: setTheme,
    get: getStoredPreference,
    getEffective: getStoredPreference,
    THEMES: THEMES
  };

  // Apply theme immediately to prevent flash
  // This runs before DOM is ready
  var initialTheme = getStoredPreference();
  document.documentElement.setAttribute('data-theme', initialTheme);

  // Full initialization after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
})();
