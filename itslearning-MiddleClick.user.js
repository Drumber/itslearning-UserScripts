// ==UserScript==
// @name         MiddleClick
// @namespace    https://github.com/Drumber
// @version      0.1.0
// @description  Middle click iframe content
// @author       Drumber
// @match        https://*.itslearning.com/*
// @updateURL    https://github.com/Drumber/itslearning-UserScripts/raw/master/itslearning-MiddleClick.user.js
// @downloadURL  https://github.com/Drumber/itslearning-UserScripts/raw/master/itslearning-MiddleClick.user.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @grant        GM_openInTab
// @noframes
// ==/UserScript==

(function() {
    'use strict';
    console.log("MiddleClick script is activated...");
    processQueryParams();
    setupClickEventInterceptor(window);
    waitForKeyElements("iframe", (jNode) => {
        const iframe = jNode[0]
        setupClickEventInterceptor(iframe.contentWindow, iframe.id);
    });
})();

/**
 * Check if there are query params added by this user script (prefixed by mcf-)
 * and insert the specified content url into the target iframe.
 */
function processQueryParams() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("mcf-iframe") && urlParams.has("mcf-url")) {
        const iframeId = urlParams.get("mcf-iframe");
        const contentUrl = urlParams.get("mcf-url");
        const iframe = document.getElementById(iframeId)
        if (iframe) {
            console.log("[MCF] Loading URL", contentUrl, "into iframe", iframe);
            iframe.src = contentUrl
        }
    }
}

/**
 * Adds an auxclick event listener to the given window element for intercepting
 * middle click events. Set iframeId to the ID of the iframe the given window
 * element belongs to, or leave it undefined if the listener is added to the
 * root document.
 */
function setupClickEventInterceptor(windowEl, iframeId) {
    // source: https://stackoverflow.com/a/62311399/12821118
    windowEl.addEventListener("auxclick", (event) => {
        console.log(event);
        if (event.button === 1 && shouldBlockActionForElement(event.target)) {
            event.preventDefault();
            handleMiddleClick(event.target, iframeId);
        }
    });
}

/**
 * Checks if the target anchor element refers to an external website or to a
 * itslearning subpage.
 */
function shouldBlockActionForElement(el) {
    console.log("check", el);
    if (el.nodeName == "A") {
        return el.hostname == location.hostname;
    }
    const closestAnchor = el.closest("a");
    return closestAnchor && shouldBlockActionForElement(closestAnchor);
}

function handleMiddleClick(el, iframeId) {
    if (!iframeId && el.target) {
        // itslearning uses the target attribute on anchor tags to load the content in the target iframe
        // e.g. <a href="..." target="mainmenu"> targets iframe <iframe id="..." name="mainmenu">
        const target = el.target;
        iframeId = document.querySelector(`[name=${target}]`).id;
    }
    const contentUrl = el.href;
    if (iframeId && contentUrl) {
        cloneWindowForIFrame(iframeId, contentUrl);
    } else {
        // backup: normal behaviour
        openTab(contentUrl);
    }
}

function cloneWindowForIFrame(iframeId, contentUrl) {
    const url = new URL(location.href);
    url.searchParams.set("mcf-iframe", iframeId);
    url.searchParams.set("mcf-url", contentUrl);
    openTab(url.href);
}

function openTab(url) {
    GM_openInTab(url, {
        active: false,
        insert: true,
        setParent: true
    });
}
