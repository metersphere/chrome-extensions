const MS_ID = "MeterSphere";

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
            if (!$.isEmptyObject(itemsLocal.position)) {
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
                $('html').append(div);
            } else {
                $(parent.document).append(div);
            }
        });

        chrome.storage.local.get('theme', function () {
            let iframeContainerDiv = $('#' + iframeContainerId);
            iframeContainerDiv.html(
                '<div style="height: 40px;background-color: rgb(44, 42, 72);cursor: move;border-radius: 5px 5px 0 0;font-size: 18px;">' +
                '<span style="line-height: 40px;font-size: 18px;display: inline-block;color: #FFF;padding-left: 10px"> MeterSphere</span>' +
                '<div id="' + controlsWrapperId + '" style="position: relative;border-radius: 5px 5px 0 0;display: inline-block;overflow:' +
                ' hidden;float: right; width: 100px; background-color: #FFF"></div></div>' +
                '<div id="' + iframeWrapperId + '" style="visibility:hidden; float: none; width: auto; padding: 0; margin: 0;"></div>'
            );
            iframeContainerDiv.draggable({
                containment: "window",
                stop: function (event, ui) {
                    let position = ui.position;
                    chrome.storage.local.set({"position": position});
                }
            });
        });
    }
}

function addTransactionPopupUi() {
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
                    iframe.src = chrome.extension.getURL('html/transaction-ui.html');
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
                    controlsIframe.src = chrome.extension.getURL('html/transaction-controls.html');
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
    let iframeContainerId = "#transaction-popup-ui-" + MS_ID;
    if ($(iframeContainerId).length > 0) {
        $(iframeContainerId).remove();
    }
}

function transactionMessageHandler(request) {
    switch (request.action) {
        case "add_transaction_ui":
            removeTransactionPopupUi();
            addTransactionPopupUi();
            break;
        case "remove_transaction_ui":
            removeTransactionPopupUi();
            break;
    }
}

chrome.runtime.onMessage.addListener(transactionMessageHandler);

chrome.runtime.sendMessage({action: "check_status"}, function (response) {
    if (response.status === "recording" || response.status === 'pause') {
        addTransactionPopupUi();
    }
});
