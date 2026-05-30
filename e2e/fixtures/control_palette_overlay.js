// ==UserScript==
// @name         Test Script - Shift+K Overlay
// @namespace    http://scriptmonkey.local/
// @version      1.2
// @description  Creates an overlay when pressing Shift+K on Vercel docs
// @match        https://vercel.com/docs/*
// @grant        none
// @updateURL    http://localhost:8080/control_palette_overlay.js
// ==/UserScript==

(function () {
    'use strict';

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    overlay.style.backdropFilter = 'blur(4px)';
    overlay.style.color = 'white';
    overlay.style.display = 'none';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '10000';
    overlay.style.fontFamily = 'sans-serif';

    const dialog = document.createElement('div');
    dialog.style.backgroundColor = '#111';
    dialog.style.border = '1px solid #333';
    dialog.style.borderRadius = '12px';
    dialog.style.padding = '40px';
    dialog.style.textAlign = 'center';
    dialog.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';

    dialog.innerHTML = '<h2 style="margin-top:0;">Search Overlay Mock</h2><p style="color:#888;">Press <b>Esc</b> to close</p>';
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    document.addEventListener('keydown', (e) => {
        // Check for Shift+K
        if (e.shiftKey && e.key.toLowerCase() === 'k') {
            e.preventDefault(); // Prevent default browser search/address bar focus
            overlay.style.display = 'flex';
        }
        if (e.key === 'Escape' && overlay.style.display === 'flex') {
            overlay.style.display = 'none';
        }
    });
})();
