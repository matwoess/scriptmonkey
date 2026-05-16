// ==UserScript==
// @name         Test Script - Paragraph Counter
// @namespace    http://scriptmonkey.local/
// @version      1.4
// @description  Shows the number of paragraphs on the page
// @match        https://example.com/site-a/*
// @match        https://example.com/site-b/*
// @grant        none
// @updateURL    http://localhost:8080/paragraph_counter.user.js
// ==/UserScript==

(function () {
    'use strict';

    // Wait slightly to let SPAs render content
    setTimeout(() => {
        const pCount = document.querySelectorAll('p').length;

        const counterDiv = document.createElement('div');
        counterDiv.innerText = `Paragraphs: ${pCount}`;
        counterDiv.style.position = 'fixed';
        counterDiv.style.top = '10px';
        counterDiv.style.left = '50%';
        counterDiv.style.transform = 'translateX(-50%)';
        counterDiv.style.backgroundColor = 'rgba(50, 50, 50, 0.9)';
        counterDiv.style.color = '#fff';
        counterDiv.style.padding = '6px 16px';
        counterDiv.style.borderRadius = '20px';
        counterDiv.style.zIndex = '9999';
        counterDiv.style.fontSize = '13px';
        counterDiv.style.fontFamily = 'monospace';
        counterDiv.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        counterDiv.style.border = '1px solid #555';

        document.body.appendChild(counterDiv);
    }, 1500);
})();
