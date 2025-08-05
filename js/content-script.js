const MS_ID = "MeterSphere";

// Simple draggable implementation to replace jQuery UI
function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    element.style.cursor = 'move';

    element.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        let newTop = element.offsetTop - pos2;
        let newLeft = element.offsetLeft - pos1;

        // Keep within window bounds
        if (newTop < 0) newTop = 0;
        if (newLeft < 0) newLeft = 0;
        if (newTop + element.offsetHeight > window.innerHeight) {
            newTop = window.innerHeight - element.offsetHeight;
        }
        if (newLeft + element.offsetWidth > window.innerWidth) {
            newLeft = window.innerWidth - element.offsetWidth;
        }

        element.style.top = newTop + "px";
        element.style.left = newLeft + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        // Save position
        chrome.storage.local.set({
            "position": {
                top: element.offsetTop,
                left: element.offsetLeft
            }
        });
    }
}

function injectDivPopup(iframeContainerId, controlsWrapperId, iframeWrapperId) {
    if (document.getElementById(iframeContainerId) === null) {
        chrome.storage.local.get('position', function (itemsLocal) {
            let div = document.createElement('div');
            div.style.border = '1px solid #aeaeae';
            div.style.borderRadius = '5px';
            div.style.boxShadow = '0px 3px 10px #888888';
            div.style.position = 'fixed';
            div.style.width = '360px';
            div.style.height = '230px';
            div.style.margin = '0px';
            div.style.padding = '0px';
            if (itemsLocal.position && Object.keys(itemsLocal.position).length > 0) {
                div.style.top = itemsLocal.position.top + "px";
                div.style.left = itemsLocal.position.left + "px";
            } else {
                div.style.top = '0px';
                div.style.left = window.innerWidth - 380 + "px";
            }

            div.style.zIndex = '9000000000000000000';
            div.style.backgroundColor = '#FFF';
            div.frameBorder = 'none';
            div.setAttribute('id', iframeContainerId);
            if (top === self) {
                document.documentElement.appendChild(div);
            } else {
                parent.document.documentElement.appendChild(div);
            }
        });

        chrome.storage.local.get('theme', function () {
            let iframeContainerDiv = document.getElementById(iframeContainerId);
            if (iframeContainerDiv) {
                iframeContainerDiv.innerHTML =
                    '<div style="height: 40px;background-color: rgb(44, 42, 72);cursor: move;border-radius: 5px 5px 0 0;font-size: 18px;">' +
                    '<span style="line-height: 40px;font-size: 18px;display: inline-block;color: #FFF;padding-left: 10px"> MeterSphere</span>' +
                    '<div id="' + controlsWrapperId + '" style="position: relative;border-radius: 5px 5px 0 0;display: inline-block;overflow:' +
                    ' hidden;float: right; width: 100px; background-color: #FFF"></div></div>' +
                    '<div id="' + iframeWrapperId + '" style="visibility:hidden; float: none; width: auto; padding: 0; margin: 0;"></div>';

                // Add draggable functionality without jQuery
                makeDraggable(iframeContainerDiv);
            }
        });
    }
}

function addTransactionPopupUi() {
    console.log('addTransactionPopupUi called');
    let iframeId = "iframe-popup-ui-" + MS_ID;
    let iframeContainerId = "transaction-popup-ui-" + MS_ID;
    let iframeWrapperId = "iframe-wrapper-" + MS_ID;
    let controlsWrapperId = "controls-wrapper-" + MS_ID;
    let controlsId = "controls-" + MS_ID;
    let popup_injected = false;
    let inject_iframe = false;
    let wait_intervals = -1;
    let interval = setInterval(function () {
        wait_intervals += 1;
        if (document.readyState === 'interactive') {

            if (!popup_injected) {
                injectDivPopup(iframeContainerId, controlsWrapperId, iframeWrapperId);
                popup_injected = true;
            } else {
                if (wait_intervals > 100) {
                    setTimeout(function () {
                        document.getElementById(iframeWrapperId).style.visibility = "visible";
                    }, 100);
                    if (wait_intervals < 200) {
                        return;
                    }
                }
            }
            if ((wait_intervals % 10) === 0) {
                let iframes = document.getElementsByTagName("iframe");
                if (typeof iframes == 'undefined') {
                    inject_iframe = true;
                }
            }
        }
        if (inject_iframe || document.readyState === 'complete') {

            if (!popup_injected) {
                injectDivPopup(iframeContainerId, controlsWrapperId, iframeWrapperId);
                popup_injected = true;
            } else {

                if (document.getElementById(iframeId) === null) {
                    let iframe = document.createElement('iframe');
                    iframe.src = chrome.runtime.getURL('html/transaction-ui.html');
                    //Updated id with GUID
                    iframe.setAttribute('id', iframeId);
                    iframe.setAttribute('name', iframeId);

                    iframe.style.height = '180px';
                    iframe.style.width = '358px';
                    iframe.style.margin = '0';
                    iframe.style.padding = '0';
                    iframe.style.overflow = 'hidden';
                    iframe.style.border = 'none';
                    iframe.style.position = 'static';

                    let controlsIframe = document.createElement('iframe');
                    controlsIframe.src = chrome.runtime.getURL('html/transaction-controls.html');
                    //Updated id with GUID
                    controlsIframe.setAttribute('id', controlsId);
                    controlsIframe.style.height = '40px';
                    controlsIframe.style.width = '100px';
                    controlsIframe.style.margin = '0';
                    controlsIframe.style.padding = '0';
                    controlsIframe.style.overflow = 'hidden';
                    controlsIframe.style.border = 'none';
                    controlsIframe.style.cssFloat = 'right';
                    controlsIframe.style.position = 'static';

                    let iframeWrapperNode = document.getElementById(iframeWrapperId);
                    if (iframeWrapperNode !== null) {
                        while (iframeWrapperNode.firstChild) {
                            iframeWrapperNode.removeChild(iframeWrapperNode.firstChild);
                        }

                        let iframeControlsWrapperNone = document.getElementById(controlsWrapperId);
                        if (iframeControlsWrapperNone !== null) {
                            while (iframeControlsWrapperNone.firstChild) {
                                iframeControlsWrapperNone.removeChild(iframeControlsWrapperNone.firstChild);
                            }

                            iframeWrapperNode.appendChild(iframe);
                            iframeControlsWrapperNone.appendChild(controlsIframe);

                            setTimeout(function () {
                                document.getElementById(iframeWrapperId).style.visibility = "visible";
                            }, 100);
                            clearInterval(interval);

                        }
                    }
                }
            }
        }

    }, 10);
}

function removeTransactionPopupUi() {
    let iframeContainerId = "transaction-popup-ui-" + MS_ID;
    let element = document.getElementById(iframeContainerId);
    if (element) {
        element.remove();
    }
}

function transactionMessageHandler(request, sender, sendResponse) {
    console.log('Content script received message:', request);
    switch (request.action) {
        case "add_transaction_ui":
            console.log('Adding transaction UI');
            removeTransactionPopupUi();
            addTransactionPopupUi();
            sendResponse({ success: true });
            return true; // Important for async response
        case "remove_transaction_ui":
            console.log('Removing transaction UI');
            removeTransactionPopupUi();
            sendResponse({ success: true });
            return true; // Important for async response
    }
    return false; // Synchronous response for other cases
}

chrome.runtime.onMessage.addListener(transactionMessageHandler);

console.log('Content script loaded, checking status...');
// Add a small delay to avoid conflicts with popup initialization
setTimeout(function () {
    chrome.runtime.sendMessage({ action: "check_status" }, function (response) {
        console.log('Content script status check response:', response);
        if (chrome.runtime.lastError) {
            console.error('Content script error checking status:', chrome.runtime.lastError);
            return;
        }
        if (response && (response.status === "recording" || response.status === 'pause')) {
            console.log('Content script adding UI because status is:', response.status);
            addTransactionPopupUi();
        }
    });
}, 100);
