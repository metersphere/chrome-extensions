/*
 * Copyright 2017 SideeX committers
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */
var master = {};
var recording = 'stopped';
var isReplaying = 'noReplaying';
var color = null;
var port;
var observers = [];
var notifications_duration = 3000;
var cRecorder = new BackgroundRecorderUI();
var recorders = [];
var functionalIconBlinkMode = false;
var forbiddenDomainsList = null;

// Add a `manifest` property to the `chrome` object.
chrome.manifest = chrome.app.getDetails();

chrome.browserAction.setBadgeText({
    text: ''
});

//Re-inject all content scripts
var injectIntoTab = function (tab) {
    for (var k = 0; k < chrome.manifest.content_scripts.length; k++) {
        var scripts = chrome.manifest.content_scripts[k].js;
        var i = 0, s = scripts.length;
        for (; i < s; i++) {
            chrome.tabs.executeScript(tab.id, {
                file: scripts[i]
            }, result => {
                lastErr = chrome.runtime.lastError;
                if (lastErr) {
                    if (lastErr.message)
                        if (lastErr.message !== "The tab was closed." && !lastErr.message.startsWith("Cannot access contents of url"))
                            console.log('injectIntoTab tab: ' + tab.id + ' lastError: ' + JSON.stringify(lastErr));
                }
            });
        }
    }
};

chrome.windows.getAll({
    populate: true
}, function (windows) {
    var i = 0, w = windows.length, currentWindow;
    for (; i < w; i++) {
        currentWindow = windows[i];
        var j = 0, t = currentWindow.tabs.length, currentTabMain;
        for (; j < t; j++) {
            currentTabMain = currentWindow.tabs[j];
            // Skip chrome:// pages
            if (!currentTabMain.url.startsWith('chrome') && !currentTabMain.url.includes('chrome.google.com')) {
                injectIntoTab(currentTabMain);
            }
        }
    }
});

chrome.browserAction.setBadgeBackgroundColor({
    color: '#d90a16'
});

function checkUrlsMatch(currentUrl, newUrl) {
    let currentUrlHostName = (new URL(currentUrl)).hostname;
    let newUrlHostName = (new URL(newUrl)).hostname;
    return(currentUrlHostName === newUrlHostName);
}

function getForbiddenDomainsList() {
    return new Promise(function (resolve, reject) {
        if(!forbiddenDomainsList) {
            $.getJSON('/forbidden-domains.json', function (data) {
                if (data) {
                    forbiddenDomainsList = data;
                    resolve(forbiddenDomainsList);
                } else {
                    console.log('Could not found "/forbidden-domains.json" file.');
                }
            });
        } else {
            resolve(forbiddenDomainsList);
        }
    });
}

function checkForForbiddenDomain(initiatorUrl, requestUrl) {
    return new Promise((resolve, reject) => {
        let initiatorUrlHostName = null;
        let requestUrlHostName = null;
        try {
            initiatorUrlHostName = (new URL(initiatorUrl)).hostname;
        } catch(e) {

        }
        if(requestUrl) {
            try {
                requestUrlHostName = (new URL(requestUrl)).hostname;
            } catch(e) {

            }
        }
        getForbiddenDomainsList().then((forbiddenDomains) => {
            let isForbidden = forbiddenDomains.indexOf(initiatorUrlHostName) > -1 || forbiddenDomains.indexOf(requestUrlHostName) > -1;
            resolve(isForbidden);
        });
    });
}

browser.contextMenus.onClicked.addListener(function (info, tab) {
    if (port) {
        port.postMessage({cmd: info.menuItemId});
    }
});

browser.runtime.onConnect.addListener(function (m) {
    port = m;
});

function backgroundMessageHandler(request, sender, sendResponse) {
    if (request.command) {
        //Do action depending on the request
        let targetRecorder = getRecorder(request);
        switch (request.command) {
            case 'start_recording':
                if (request.suite_name && request.recordingTab) {
                    targetRecorder.startRecording(request.suite_name, request.recordingTab);
                } else {
                    sendResponse({status: 'Bad Request', error: true});
                }
                sendResponse({status: 'ok', error: false});
                break;
            case 'pause_recording':
                targetRecorder.pauseRecording();
                sendResponse({status: 'ok', error: false});
                break;
            case 'resume_recording':
                targetRecorder.resumeRecording();
                sendResponse({status: 'ok', error: false});
                break;
            case 'stop_recording':
                targetRecorder.endRecording();
                sendResponse({status: 'ok', error: false});
                break;
            case 'reset_recording':
                targetRecorder.cleanRecording();
                sendResponse({status: 'ok', error: false});
                break;
            case 'recordCommand':
                targetRecorder.addCommandMessageHandler(request, sender, sendResponse);
                break;
            case 'recordDom':
                console.log('reqdom: ', request.dom);
                //add dom to collection (dom will be unique)
                targetRecorder.recordedDomSet.add(request.dom);

                //find indexes and do mapping
                let lastTestCaseIndex = targetRecorder.currentSuite.test_cases.length - 1;
                let lastCommandIndex = targetRecorder.currentSuite.test_cases[lastTestCaseIndex].commands.length - 1;

                targetRecorder.recordedDomMapping[lastTestCaseIndex] = targetRecorder.recordedDomMapping[lastTestCaseIndex] || [];
                targetRecorder.recordedDomMapping[lastTestCaseIndex][lastCommandIndex] = Array.from(targetRecorder.recordedDomSet).indexOf(request.dom);
            case 'add_step_atindex':
                if (request.testCaseIndex && request.commandIndex && request.step) {
                    targetRecorder.addCommand(request.testCaseIndex, request.commandIndex, request.step);
                    sendResponse({status: 'ok', error: false});
                } else {
                    sendResponse({'status': 'Bad request', error: true});
                }
                break;
            case 'check_status':
                let senderRecording = false;
                if (sender.tab && sender.tab.id && targetRecorder.recordingTab) {
                    if (targetRecorder.recordingTab.id === sender.tab.id) {
                        senderRecording = true;
                    } else if (targetRecorder.openedTabIds) {
                        if (targetRecorder.openedTabIds[sender.tab.id] !== undefined) {
                            senderRecording = true;
                        }
                    }
                }
                sendResponse({
                    status: 'ok',
                    recording: targetRecorder.recording,
                    recordingTab: targetRecorder.recordingTab,
                    isThisTabRecording: senderRecording,
                    replayStatus: targetRecorder.replayStatus,
                    error: false
                });
                break;
            case 'open_debugger':
                targetRecorder.debuggerTab = sender.tab;
                targetRecorder.currentSuite.addObserver(sender.tab);
                targetRecorder.addObserver(sender.tab);
                sendResponse({status: 'ok', error: false});
                break;
            case 'close_debugger':
                targetRecorder.debuggerTab = null;
                targetRecorder.removeObserver(sender.tab.id);
                targetRecorder.currentSuite.removeObserver(sender.tab.id);
                sendResponse({status: 'ok', error: false});
                break;
            case 'get_debuggerTab':
                sendResponse({status: 'ok', debuggerTab: targetRecorder.debuggerTab, error: false});
                break;
            case 'getCurrentSuite':
                sendResponse({'status': 'ok', 'suite': targetRecorder.currentSuite, error: false});
                break;
            case 'getExportJsonSuite':
                sendResponse({'status': 'ok', 'suite': targetRecorder.exportJson(), error: false});
                break;
            case 'updateSuiteName':
                if (request.suiteName) {
                    targetRecorder.updateSuiteName(request.suiteName);
                    sendResponse({'status': 'ok', error: false});
                } else {
                    sendResponse({'status': 'Bad request', error: true});
                }
                break;
            case 'updateTestCases':
                if (request.testCases) {
                    targetRecorder.updateTestCases(request.testCases);
                    sendResponse({'status': 'ok', error: false});
                } else {
                    sendResponse({'status': 'Bad request', error: true});
                }
                break;
            case 'getTransactions':
                let transactions = targetRecorder.getTransactions();
                sendResponse({status: 'ok', transactions: transactions, error: false});
                break;
            case 'addTestCase':
                if (request.testCaseName) {
                    targetRecorder.addNewTestCase(request.testCaseName);
                    sendResponse({'status': 'ok', error: false});
                } else {
                    sendResponse({'status': 'Bad request', error: true});
                }
                break;
            case 'updateTestCaseName':
                if (request.testCaseName != null && request.testCaseIndex != null) {
                    targetRecorder.updateTestCaseName(request.testCaseIndex, request.testCaseName);
                    sendResponse({status: 'ok', error: false});
                } else {
                    sendResponse({'status': 'Bad request', error: true});
                }
                break;
            case 'addObserverRecorder':
                //Added if no already on the list
                targetRecorder.addObserver(sender.tab);
                sendResponse({status: 'ok', error: false});
                break;
            case 'removeObserverRecorder':
                targetRecorder.removeObserver(sender.tab.id);
                sendResponse({status: 'ok', error: false});
                break;
            case 'updateBadgeCounter':
                if (request.badgeCounter) {
                    targetRecorder.updateBadgeCounter(request.badgeCounter);
                    sendResponse({status: 'ok', error: false});
                } else {
                    sendResponse({status: 'Bad request', error: true});
                }
                break;
            case 'getReplayWindowId':
                sendResponse({status: 'ok', error: false, replayWindowId: targetRecorder.replayWindowId});
                break;
            case 'setReplayWindowId':
                if (request.replayWindowId) {
                    targetRecorder.replayWindowId = request.replayWindowId;
                    sendResponse({status: 'ok', error: false});
                } else {
                    sendResponse({status: 'Bad request', error: true});
                }
                break;
            case 'updateCommandProperty':
                if (request.testCaseIndex && request.commandIndex && request.commandProperty && request.value) {
                    targetRecorder.updateCommandProperty(request.testCaseIndex, request.commandIndex, request.commandProperty, request.value);
                    sendResponse({status: 'ok', error: false});
                } else {
                    sendResponse({status: 'Bad request', error: true});
                }
                break;
            case 'deleteCommand':
                if (request.testCaseIndex && request.commandIndex) {
                    targetRecorder.deleteCommand(request.testCaseIndex, request.commandIndex);
                    sendResponse({status: 'ok', error: false});
                } else {
                    sendResponse({status: 'Bad request', error: true});
                }
                break;
            case 'updateCommandIndex':
                if (request.testCaseIndex && request.commandToIndex && request.commandFromIndex) {
                    targetRecorder.updateCommandIndex(request.testCaseIndex, request.commandFromIndex, request.commandToIndex);
                    sendResponse({status: 'ok', error: false});
                } else {
                    sendResponse({status: 'Bad request', error: true});
                }
                break;
            case 'deleteTestCase':
                if (request.testCaseIndex) {
                    targetRecorder.deleteTestCase(request.testCaseIndex);
                    sendResponse({status: 'ok', error: false});
                } else {
                    sendResponse({status: 'Bad request', error: true});
                }
                break;
            case 'addTestCaseAtIndex':
                if (request.testCaseIndex && request.testCase) {
                    targetRecorder.addTestCase(request.testCaseIndex, request.testCase);
                    sendResponse({status: 'ok', error: false});
                } else {
                    sendResponse({status: 'Bad request', error: true});
                }
                break;
            case 'showNotification':
                if (request.message && request.title) {
                    create_notification(request.title, request.message);
                } else {
                    sendResponse({status: 'Bad request', error: true});
                }
                break;
        }

        //Send response if not sent before
        sendResponse({status: 'ok', error: false});
    }
    else if (request.attachRecorderRequest) {
        //Repeated code to avoid unneccessary re-assignment
        let targetRecorder = getRecorder(request);
        if (targetRecorder.recording === 'record') {
            if (targetRecorder.openedTabIds[sender.tab.id] !== undefined) {
                browser.tabs.sendMessage(sender.tab.id, {attachRecorder: true}).catch(reason => {
                    //Fail silently
                });
            }
        }
        return;
    }
}

chrome.runtime.onMessage.addListener(backgroundMessageHandler);

function create_notification(title, message) {
    chrome.notifications.create('', {
        type: 'basic',
        'title': title,
        'iconUrl': '../sideex/icons/icons-48.png',
        'message': message,
        priority: 1,
        isClickable: true
    }, function (id) {
        setTimeout(function () {
            chrome.notifications.clear(id, function () {
            });
        }, notifications_duration);
    });
}

function getRecorder(request) {
    let targetRecorder;
    if (request.recordingId) {
        targetRecorder = recorders[request.recordingId];
    } else {
        targetRecorder = cRecorder;
    }
    return targetRecorder;
}
