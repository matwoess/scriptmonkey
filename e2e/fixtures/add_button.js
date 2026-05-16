// ==UserScript==
// @name         Test Script - Add Button
// @namespace    http://scriptmonkey.local/
// @version      1.0
// @description  Adds a simple floating button to site-a
// @match        https://example.com/site-a/*
// @grant        none
// @updateURL    http://localhost:8080/add_button.user.js
// ==/UserScript==

(function () {
    'use strict';

    const btn = document.createElement('button');
    btn.innerText = 'Test Button';
    btn.style.position = 'fixed';
    btn.style.bottom = '20px';
    btn.style.right = '20px';
    btn.style.zIndex = '9999';
    btn.style.padding = '12px 24px';
    btn.style.backgroundColor = '#0070f3';
    btn.style.color = '#ffffff';
    btn.style.border = 'none';
    btn.style.borderRadius = '8px';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 4px 14px 0 rgba(0,118,255,0.39)';
    btn.style.fontFamily = 'sans-serif';
    btn.style.fontWeight = 'bold';

    btn.addEventListener('click', () => {
        alert('Hello from the Test Script!');
    });

    document.body.appendChild(btn);
})();
