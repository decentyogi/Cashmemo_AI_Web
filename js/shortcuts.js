/**
 * Keyboard Shortcuts Manager for Cashmemo Web
 * Implements global hotkeys:
 * - Ctrl/Cmd + Enter: Save and trigger Print Dialog
 * - Alt + N: Insert new billing line item row
 * - Alt + S: Save memo
 * - Alt + H: Toggle History Drawer
 * - Alt + R: Open Plant Rate Catalog
 * - Alt + C: Open Customer Directory
 * - Escape: Close any open modal / drawer
 */

(function (window) {
  'use strict';

  function initShortcuts(handlers) {
    window.addEventListener('keydown', function (e) {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Escape: Close open modals/drawers
      if (e.key === 'Escape') {
        if (typeof handlers.onEscape === 'function') {
          handlers.onEscape(e);
        }
        return;
      }

      // Ctrl/Cmd + Enter: Save & Print
      if (isCmdOrCtrl && e.key === 'Enter') {
        e.preventDefault();
        if (typeof handlers.onSaveAndPrint === 'function') {
          handlers.onSaveAndPrint(e);
        }
        return;
      }

      // Alt + N: Insert new line item row
      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        if (typeof handlers.onNewRow === 'function') {
          handlers.onNewRow(e);
        }
        return;
      }

      // Alt + S: Save memo only
      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (typeof handlers.onSaveOnly === 'function') {
          handlers.onSaveOnly(e);
        }
        return;
      }

      // Alt + H: Toggle History Drawer
      if (e.altKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        if (typeof handlers.onToggleHistory === 'function') {
          handlers.onToggleHistory(e);
        }
        return;
      }

      // Alt + R: Open Rate Catalog
      if (e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        if (typeof handlers.onToggleRates === 'function') {
          handlers.onToggleRates(e);
        }
        return;
      }

      // Alt + C: Open Customers
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        if (typeof handlers.onToggleCustomers === 'function') {
          handlers.onToggleCustomers(e);
        }
        return;
      }
    });
  }

  window.KeyboardShortcuts = {
    init: initShortcuts
  };

})(window);
