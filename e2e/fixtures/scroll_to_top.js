// ==UserScript==
// @name         Test Script - Scroll to Top
// @namespace    http://scriptmonkey.local/
// @version      1.3
// @description  Adds a smooth scroll to top button
// @match        https://www.matwoess.org/*
// @match        https://vercel.com/docs/*
// @grant        none
// @updateURL    http://localhost:8080/scroll_to_top.js
// ==/UserScript==

(function () {
    'use strict';

    const btn = document.createElement('button');
    btn.innerHTML = '↑';
    btn.title = 'Scroll to top';
    btn.style.position = 'fixed';
    btn.style.bottom = '20px';
    btn.style.left = '20px';
    btn.style.zIndex = '9999';
    btn.style.width = '40px';
    btn.style.height = '40px';
    btn.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    btn.style.color = 'white';
    btn.style.border = '1px solid rgba(255,255,255,0.2)';
    btn.style.borderRadius = '50%';
    btn.style.cursor = 'pointer';
    btn.style.opacity = '0';
    btn.style.visibility = 'hidden';
    btn.style.transition = 'opacity 0.3s, visibility 0.3s, background-color 0.2s';
    btn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
    btn.style.fontSize = '20px';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';

    document.body.appendChild(btn);

    btn.addEventListener('mouseenter', () => {
        btn.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    });

    btn.addEventListener('mouseleave', () => {
        btn.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    });

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            btn.style.opacity = '1';
            btn.style.visibility = 'visible';
        } else {
            btn.style.opacity = '0';
            btn.style.visibility = 'hidden';
        }
    });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
})();
