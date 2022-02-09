// ==UserScript==
// @name         MiddleClick
// @namespace    https://github.com/Drumber
// @version      0.1.3
// @description  Middle click iframe content
// @author       Drumber
// @match        https://*.itslearning.com/*
// @updateURL    https://github.com/Drumber/itslearning-UserScripts/raw/master/itslearning-MiddleClick.user.js
// @downloadURL  https://github.com/Drumber/itslearning-UserScripts/raw/master/itslearning-MiddleClick.user.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @grant        GM_openInTab
// @grant        GM_addStyle
// @noframes
// ==/UserScript==

(function() {
    'use strict';
    console.log("MiddleClick script is activated...");
    processQueryParams();
    setupClickEventInterceptor(window);
    waitForKeyElements("iframe", (jNode) => {
        const iframe = jNode[0]
        iframe.addEventListener("load", (event) => {
            setupClickEventInterceptor(event.target.contentWindow, iframe.id);
            // add navbar shortcut listener to iframe
            addNavBarToggleShortcut(event.target.contentWindow);
        })
    });

    addNavBarToggleButton();
    addNavBarToggleShortcut(document);

    GM_addStyle(`
    .hidden {
        display: none;
    }
    #nav-toggle-btn {
        width: fit-content;
        margin-left: auto;
        font-size: 0.7em;
        line-height: 0.7em;
        cursor: pointer;
        background-color: rgba(0,0,0,0.1);
        padding: 4px;
        border-radius: 4px;
    }
    `);
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
        const anchor = event.target.closest("a");
        if (event.button === 1 && anchor && shouldBlockActionForElement(anchor)) {
            event.preventDefault();
            handleMiddleClick(anchor, iframeId);
        }
    });
}

/**
 * Checks if the target anchor element refers to an external website or to a
 * itslearning subpage.
 */
function shouldBlockActionForElement(el) {
    return el.nodeName == "A" && el.hostname == location.hostname;
}

function handleMiddleClick(el, iframeId) {
    if (!iframeId && el.target) {
        // itslearning uses the target attribute on anchor tags to load the content in the target iframe
        // e.g. <a href="..." target="mainmenu"> targets iframe <iframe id="..." name="mainmenu">
        const target = el.target;
        const iframe = document.querySelector(`[name=${target}]`);
        if (iframe) {
            iframeId = iframe.id;
        }
    }
    const contentUrl = el.href;
    if (iframeId && contentUrl && el.target !== "_top" && el.target !== "_blank") {
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

/**
 * Toggle main und course navigation bars.
 */
function toggleNavigationBars() {
    const mainNav = document.getElementById("l-header");
    const isHidden = mainNav.classList.toggle("hidden");
    const subNav = document.getElementById("ctl00_TopNavigationContainer");
    if (subNav) {
        subNav.classList.toggle("hidden")
    }

    // trigger window resize event to trigger iframe height recalculation
    window.dispatchEvent(new Event('resize'))

    // update button text
    document.getElementById("nav-toggle-btn").innerText = isHidden ? "Show Navbar" : "Hide Navbar";
}

function addNavBarToggleButton() {
    const btn = document.createElement("div");
    btn.id = "nav-toggle-btn";
    btn.innerText = "Hide Navbar";
    btn.onclick = () => toggleNavigationBars();

    const navBar = document.getElementById("ctl00_TopNavigationContainer") || document.getElementById("l-header");
    navBar.parentNode.insertBefore(btn, navBar.nextSibling);
}

function addNavBarToggleShortcut(windowEl) {
    windowEl.addEventListener("keyup", (e) => {
        if (e.ctrlKey && e.key === ".") {
            toggleNavigationBars();
        }
    });
}
