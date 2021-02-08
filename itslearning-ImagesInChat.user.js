// ==UserScript==
// @name         ImagesInChat
// @namespace    https://github.com/Drumber
// @version      0.2.1
// @description  Better chat for itslearning
// @author       Drumber
// @match        https://*.itslearning.com/*
// @updateURL    https://raw.githubusercontent.com/Drumber/itslearning-UserScripts/master/itslearning-ImagesInChat.user.js
// @downloadURL  https://raw.githubusercontent.com/Drumber/itslearning-UserScripts/master/itslearning-ImagesInChat.user.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @require      https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

/* Config stuff */
// register menu command
GM_registerMenuCommand('Script Settings', () => {
    // open GM_config dialog
    GM_config.open();
});

// initialize and construct config
GM_config.init(
{
    'id': 'Settings',
    'title': 'Script Settings',
    'fields':
    {
        'image-viewer':
        {
            'label': 'Enable image viewer',
            'type': 'checkbox',
            'default': 'true'
        }
    },
    'events': // callback functions
    {
        'open': function() { GM_config.frame.setAttribute('style', 'width: 300px; height: 500px; inset: 20px 20px auto auto; z-index: 9999; position: fixed; overflow: auto; max-width: 95%; max-height: 95%;'); }
    },
    'css': '#Settings { background: #212121 !important; color: #ffffff !important; } #Settings .reset { color: #ffffff !important; }'
});


(function() {
    'use strict';
    console.log("Images-In-Chat script is activated...");
    // trigger function when a message element was found
    waitForKeyElements(".c-messages__attachment .c-messages__attachment-content", processMessageElement)
})();

function processMessageElement(jNode) {
    // expects div with class ".c-messages__header-thread_name"
    var msg = jNode[0];
    // find anchor child element
    var imgAnchor = msg.getElementsByTagName("a")[0];
    // check if attachment anchor element exists and if
    // there is not already an added img element
    if(imgAnchor && !msg.getElementsByTagName("img")[0]) {
        // try to get attachment url
        var imgUrl = imgAnchor.href;
        if(imgUrl) {
            // remove "Download=1" attribute
            imgUrl = imgUrl.replace("&Download=1");
            // create new img element
            var img = document.createElement("img");
            img.src = imgUrl;
            // TODO: maybe reduce image size
            // set onclick event if image-viewer is enabled
            if(GM_config.get('image-viewer')) {
                img.onclick = function() {
                    showImage(this);
                }
            }
            // add img elemt to parent of message
            msg.parentElement.appendChild(img);
            //console.log("Found and added image to message.", imgUrl);
            // remove img on invalid image type
            img.onerror = function() {
                msg.parentElement.removeChild(img);
                //console.log("Removed invalid image.", img);
            }
        }
    }
}

function showImage(eventImage) {
    var img = eventImage.cloneNode(true); // clone image element

    // remove any existing dialog
    var existingDialog = document.getElementById("custom-image-viewer");
    if(existingDialog) {
        document.body.removeChild(existingDialog);
    }

    var dialog = document.createElement("div");
    dialog.id = "custom-image-viewer";
    var ds = dialog.style; // dialog style
    ds.overflow = "hidden";
    ds.display = "block";
    ds.position = "fixed";
    ds.left = "50%";
    ds.top = "50%";
    ds.transform = "translate(-50%, -50%)";
    ds.zIndex = "9999";
    ds.maxWidth = "95%";
    ds.maxHeight = "95%";
    ds.background = "rgba(10,10,10,0.8)";
    ds.padding = "10px";
    ds.borderRadius = "10px";

    // get actual image size
    var w = img.naturalWidth;
    var h = img.naturalHeight;

    var ims = img.style; // image style
    ims.maxWidth = "none";
    ims.cursor = "zoom-in";
    ims.transform = "rotate(0deg)";
    // set width and height of the image and dialog
    ims.width = `${w}px`;
    ims.height = `${h}px`;
    ds.width = `${w + 40}px`;
    ds.height = `${h + 60}px`;

    var imgWrapper = document.createElement("div");
    imgWrapper.style.cssText = "overflow: auto; height: 95%; width: 100%;";
    imgWrapper.appendChild(img);

    var btnStyle = "color: #ffffff; font-size: 24px; background: 0; border: none;";
    // close button
    var closeBtn = document.createElement("button");
    closeBtn.innerHTML = "&#x2715;";
    closeBtn.style.cssText = btnStyle;
    closeBtn.onclick = function() {
        document.body.removeChild(dialog); // remove dialog
    }

    // rotate left button
    var rotateLbtn = document.createElement("button");
    rotateLbtn.style.cssText = btnStyle;
    rotateLbtn.innerHTML = "&#x21BA;";
    rotateLbtn.onclick = function() {
        var oldAngle = parseInt(ims.transform.replace("rotate(", "").replace("deg)", ""));
        ims.transform = `rotate(${oldAngle - 90}deg)`;
    }

    // rotate right button
    var rotateRbtn = document.createElement("button");
    rotateRbtn.style.cssText = btnStyle;
    rotateRbtn.innerHTML = "&#x21BB;";
    rotateRbtn.onclick = function() {
        var oldAngle = parseInt(ims.transform.replace("rotate(", "").replace("deg)", ""));
        ims.transform = `rotate(${oldAngle + 90}deg)`;
    }

    var dialogHead = document.createElement("div");
    dialogHead.style.cssText = "width: 100%; height: 30px; display: flex; padding-bottom: 5px; flex-direction: row; flex-wrao: nowrap; justify-content: flex-end;";
    dialogHead.appendChild(rotateLbtn);
    dialogHead.appendChild(rotateRbtn);
    dialogHead.appendChild(closeBtn);

    dialog.appendChild(dialogHead);
    dialog.appendChild(imgWrapper);

    // add zoom on image click
    img.onclick = function(e) {
        if(ims.width != `${w}px`) {
            // reset image size
            ims.width = `${w}px`;
            ims.height = `${h}px`;
        } else {
            var scaleFactor = 2;
            ims.width = `${w * scaleFactor}px`;
            ims.height = `${h * scaleFactor}px`;

            // scroll to click position
            imgWrapper.scrollTo(e.x, e.y);

            img.addEventListener('mousemove', function moveListener(e) {
                // remove listener
                if(ims.width == `${w}px`) {
                    img.removeEventListener('mousemove', moveListener);
                    return;
                }
                // scroll to mouse pos
                var deltaX = (e.x - window.innerWidth / 2) / 2;
                var deltaY = (e.y - window.innerHeight / 2) / 2;
                imgWrapper.scrollBy(deltaX, deltaY);
            });
        }
    }

    // animate if supported by browser
    if(dialog.animate) {
        dialog.animate([
            { transform: 'translate(-50%, -50%) scale(0.5)', opacity: '0.75' },
            { transform: 'translate(-50%, -50%) scale(1)', opacity: '1' }
            ], {
            duration: 200
        });
    }

    // show dialog
    document.body.appendChild(dialog);

    // add close listener when clicked outside
    window.onclick = function(event) {
        // check if clicked element is a descendant of the dialog
        if(dialog.contains(event.target) == false) {
            try {
                document.body.removeChild(dialog);
            } catch(error) {}
        }
    }
}
