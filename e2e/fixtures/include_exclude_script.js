// ==UserScript==
// @name         Site Notification Banner
// @namespace    http://scriptmonkey.local/
// @version      1.0
// @description  Displays a custom site notification banner on targeted pages
// @include      https://example.com/site-a/*
// @include      /^https?:\/\/example\.com\/regex-site\/.*/
// @exclude      https://example.com/site-a/admin*
// @exclude      /\/secret$/
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const banner = document.createElement('div');
    banner.id = 'inc-exc-banner';
    banner.innerText = 'Notice: Special promotion active on this section.';
    banner.style.position = 'fixed';
    banner.style.top = '0';
    banner.style.left = '0';
    banner.style.right = '0';
    banner.style.backgroundColor = '#2563eb';
    banner.style.color = '#ffffff';
    banner.style.textAlign = 'center';
    banner.style.padding = '8px 16px';
    banner.style.fontSize = '14px';
    banner.style.zIndex = '99999';
    document.body.appendChild(banner);
})();
