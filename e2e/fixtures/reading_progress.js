// ==UserScript==
// @name         Test Script - Reading Progress
// @namespace    http://scriptmonkey.local/
// @version      1.2
// @description  Adds a reading progress bar at the top of the page
// @match        https://vercel.com/docs/*
// @match        https://www.matwoess.org/*
// @grant        none
// @updateURL    http://localhost:8080/reading_progress.js
// ==/UserScript==

(function () {
    'use strict';

    const progressBarContainer = document.createElement('div');
    progressBarContainer.style.position = 'fixed';
    progressBarContainer.style.top = '0';
    progressBarContainer.style.left = '0';
    progressBarContainer.style.width = '100%';
    progressBarContainer.style.height = '4px';
    progressBarContainer.style.backgroundColor = 'transparent';
    progressBarContainer.style.zIndex = '10000';

    const progressBar = document.createElement('div');
    progressBar.style.height = '100%';
    progressBar.style.width = '0%';
    progressBar.style.backgroundColor = '#00e5ff'; // Cyan
    progressBar.style.transition = 'width 0.1s ease-out';
    progressBar.style.boxShadow = '0 0 10px #00e5ff';

    progressBarContainer.appendChild(progressBar);
    document.body.appendChild(progressBarContainer);

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrollPercentage = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        progressBar.style.width = scrollPercentage + '%';
    });
})();
