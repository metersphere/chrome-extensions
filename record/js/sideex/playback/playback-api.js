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
var currentPlayingCommandIndex = -1;
var currentTestCaseId = "";
var isPlaying = false;
var isPause = false;
var pauseValue = null;
var isPlayingSuite = false;
var isPlayingAll = false;
var selectTabId = null;
var isSelecting = false;
var commandType = "";
var pageCount = 0;
var pageTime = "";
var ajaxCount = 0;
var ajaxTime = "";
var domCount = 0;
var domTime = "";
var implicitCount = 0;
var implicitTime = "";
var caseFailed = false;
var extCommand = new ExtCommand();
var currentPlayingTestCaseIndex;
var background = chrome.extension.getBackgroundPage();
var currentSuite = null;
var currentTab = null;
// var execution = {
//     time: "",
//     results: []
// };
var skipNextBreakpoint = false;
var nextTestTimeout = null;

chrome.tabs.getSelected(null, function (tab) {
    currentTab = tab;
    //extCommand.setCurrentPlayingTabId(tab.id);
});

function play() {
    // isReplaying = "isReplaying";
    // execution.results = [];
    initializePlayingProgress()
        .then(executionLoop)
        .then(finalizePlayingProgress)
        .catch(catchPlayingError);
}

function stop() {
    if (isPause) {
        isPause = false;
    }
    clearTimeout(nextTestTimeout);
    isPlaying = false;
    isPlayingSuite = false;
    isPlayingAll = false;
    // updateCommandStatus(currentPlayingTestCaseIndex, currentPlayingCommandIndex, "fail");
    finalizePlayingProgress();
}

function playAfterConnectionFailed() {
    if (isPlaying) {
        initializeAfterConnectionFailed()
            .then(executionLoop)
            .then(finalizePlayingProgress)
            .catch(catchPlayingError);
    }
}

function initializeAfterConnectionFailed() {
    isRecording = false;
    isPlaying = true;

    commandType = "preparation";
    pageCount = ajaxCount = domCount = implicitCount = 0;
    pageTime = ajaxTime = domTime = implicitTime = "";

    caseFailed = false;

    currentTestCaseId = currentPlayingTestCaseIndex;
    // var commands = getRecordsArray();

    return Promise.resolve(true);
}

function pause() {
    if (isPlaying) {
        isPause = true;
        isPlaying = false;
        // No need to detach
        // prevent from missing status info
        //extCommand.detach();
    }
}

function resume() {
    // if (currentTestCaseId != getSelectedCase().id)
    //     setSelectedCase(currentTestCaseId);
    if (isPause) {
        isPlaying = true;
        isPause = false;
        extCommand.attach();
        try {
            executionLoop()
                .then(finalizePlayingProgress)
                .catch(catchPlayingError);
        }
        catch (ex) {
            //Temporal fix for resume failing when between test cases
            new Promise(function (resolve) {
                resolve()
            }).then(executionLoop)
                .then(finalizePlayingProgress)
                .catch(catchPlayingError);
        }
    }
}

function initAllSuite() {
    // var suites = document.getElementById("testCase-grid").getElementsByClassName("message");
    var length = suites.length;
    for (var k = 0; k < suites.length; ++k) {
        var cases = suites[k].getElementsByTagName("p");
        for (var u = 0; u < cases.length; ++u) {
            $("#" + cases[u].id).removeClass('fail success');
        }
    }
}

function playSuite(i) {
    getSuite().then((suite) => {
        isPlayingSuite = true;
        currentSuite = suite;
        var cases = currentSuite.test_cases;
        var length = cases.length;
        currentPlayingTestCaseIndex = i;

        initializePlayingProgress()
            .then(executionLoop)
            .then(finalizePlayingProgress)
            .catch(catchPlayingError);

        // if (i < length) {
        //     updateTestCaseStatus(currentPlayingTestCaseIndex, "pending");
        //     // play();
        //     // nextCase(i);
        // } else {
        //     if (!caseFailed) {
        //         successFullReplay();
        //     }
        //     isPlayingSuite = false;
        // }
    }, (err) => {
        console.log("Could not get the suite.")
    });

}

function nextCase(i) {
    if (isPlaying || isPause) {
        nextTestTimeout = setTimeout(function () {
            nextCase(i);
        }, 500);
    }
    else if (isPlayingSuite) playSuite(i + 1);
}

function playSuites(i) {
    isPlayingAll = true;
    // var suites = document.getElementById("testCase-grid").getElementsByClassName("message");
    var length = suites.length;
    if (i < length) {
        if (suites[i].id.includes("suite")) {
            setSelectedSuite(suites[i].id);
            playSuite(0);
        }
        nextSuite(i);
    } else {
        isPlayingAll = false;
    }
}

function nextSuite(i) {
    if (isPlayingSuite) setTimeout(function () {
        nextSuite(i);
    }, 2000);
    else if (isPlayingAll) playSuites(i + 1);
}

function executeCommand(index) {
    var commands = currentSuite.test_cases[currentPlayingTestCaseIndex].commands;
    var commandName = commands[currentPlayingTestCaseIndex].command;
    var commandTarget = commands[currentPlayingTestCaseIndex].target;
    var commandValue = commands[currentPlayingTestCaseIndex].value;

    console.log("Executing: | " + commandName + " | " + commandTarget + " | " + commandValue + " |");

    initializePlayingProgress(true);

    browser.tabs.query({
        windowId: extCommand.getContentWindowId(),
        active: true
    })
        .then(function (tabs) {
            return browser.tabs.sendMessage(tabs[0].id, {
                commands: commandName,
                target: commandTarget,
                value: commandValue
            }, {
                frameId: extCommand.getFrameId(tabs[0].id)
            })
        })
        .then(function (result) {
            if (result.result != "success") {
                if (!result.result.includes("did not match")) {
                    return true;
                }
            } else {
                //setColor(id + 1, "success");
            }
        });

    finalizePlayingProgress();
}

function initializePlayingProgress(isDbclick) {

    isRecording = false;
    isPlaying = true;

    currentPlayingCommandIndex = -1;

    // xian wait
    pageCount = ajaxCount = domCount = implicitCount = 0;
    pageTime = ajaxTime = domTime = implicitTime = "";

    caseFailed = false;

    //extCommand.setCurrentPlayingTabId(tab.id);
    //extCommand.setFirstTab(currentTab);
    return extCommand.init();
}

function executionLoop() {
    let commands = currentSuite.test_cases[currentPlayingTestCaseIndex].commands;

    // Here the replay jumped to a new testcase
    if (currentPlayingCommandIndex + 1 >= commands.length) {
        currentPlayingTestCaseIndex++;
        // Next test case exists
        if (currentSuite.test_cases[currentPlayingTestCaseIndex] !== undefined) {
            commands = currentSuite.test_cases[currentPlayingTestCaseIndex].commands;
            currentPlayingCommandIndex = -1;
        }
        else {
            // Check if failed /Remove?
            if (!caseFailed) {
                declaredVars = {};
                console.log("Test case passed");
                updateTestCaseStatus(currentPlayingTestCaseIndex, "success");
                // isReplaying = "endReplaying";
                successFullReplay();
                isPlayingSuite = false;
                return true;
            } else {
                caseFailed = false;
            }
        }
        // return true;
    }
    let nextCommand = getNextCommand();
    if (nextCommand) {
        if (checkIfBreakpoint(nextCommand.testCaseIndex, nextCommand.commandIndex)) {
            switchOnReplayStatus('pause');
            updateStatus('Paused on breakpoint', 'info');
            pause();
            replayStatus = 'breakpoint';
            return Promise.reject("shutdown");
        }
    }

    if (!isPlaying) {
        return Promise.reject("shutdown");
    }

    if (isPause) {
        return Promise.reject("shutdown");
    }

    currentPlayingCommandIndex++;
    updateCommandStatus(currentPlayingTestCaseIndex, currentPlayingCommandIndex, "pending");

    let commandName = commands[currentPlayingCommandIndex].command;
    let commandTarget = commands[currentPlayingCommandIndex].target;
    let commandValue = commands[currentPlayingCommandIndex].value;

    if (commandName == "") {
        return Promise.reject("no command name");
    }

    let speed = replayDelay;
    if (commandName == "assertAlert" || commandName == "assertConfirmation" || commandName == "assertPrompt") {
        speed = 50;
    }
    return delay(speed).then(function () {
        if (isExtCommand(commandName)) {
            console.log("Executing: | " + commandName + " | " + commandTarget + " | " + commandValue + " |");
            let upperCase = commandName.charAt(0).toUpperCase() + commandName.slice(1);
            return (extCommand["do" + upperCase](commandTarget, commandValue))
                .then(function () {
                    updateCommandStatus(currentPlayingTestCaseIndex, currentPlayingCommandIndex, "success");
                }, (reason) => {
                    //Ext command failed?
                    console.log(reason);
                    updateCommandStatus(currentPlayingTestCaseIndex, currentPlayingCommandIndex, "fail");
                    updateTestCaseStatus(currentPlayingTestCaseIndex, "fail");
                    console.log("Test case failed");
                    failedReplay(reason);
                    stop();
                }).then(executionLoop);
        } else {
            return doPreparation()
                .then(doPrePageWait)
                .then(doPageWait)
                .then(doAjaxWait)
                .then(doDomWait)
                .then(doCommand)
                .then(executionLoop)
        }
    });
}

function getNextCommand() {
    if (currentSuite.test_cases[currentPlayingTestCaseIndex].commands[currentPlayingCommandIndex + 1]) {
        return {testCaseIndex: currentPlayingTestCaseIndex, commandIndex: currentPlayingCommandIndex + 1};
    }
    else if (currentSuite.test_cases[currentPlayingTestCaseIndex + 1]) {
        if (currentSuite.test_cases[currentPlayingTestCaseIndex + 1].commands) {
            return {testCaseIndex: currentPlayingTestCaseIndex + 1, commandIndex: 0}
        }
    }
    return null;
}

function checkIfBreakpoint(testCaseIndex, commandIndex) {
    if (skipNextBreakpoint) {
        skipNextBreakpoint = false;
        return false;
    }
    for (let i = 0; i < breakPoints.length; i++) {
        if (breakPoints[i].testCaseIndex == testCaseIndex && breakPoints[i].commandIndex == commandIndex) {
            return true;
        }
    }
    return false;
}

function delay(t) {
    return new Promise(function (resolve) {
        setTimeout(resolve, t)
    });
}

function finalizePlayingProgress() {
    if (!isPause) {
        extCommand.clear();
    }
    currentPlayingCommandIndex = 0;
    currentPlayingTestCaseIndex = 0;
    setTimeout(function () {
        isPlaying = false;
    }, 500);
}

document.addEventListener("dblclick", function (event) {
    var temp = event.target;
    while (temp.tagName.toLowerCase() != "body") {
        if (/records-(\d)+/.test(temp.id)) {
            var index = temp.id.split("-")[1];
            executeCommand(index);
        }
        if (temp.id == "command-grid") {
            break;
        } else temp = temp.parentElement;
    }
});

function catchPlayingError(reason) {
    // doCommands is depend on test website, so if make a new page,
    // doCommands funciton will fail, so keep retrying to get connection
    if (isReceivingEndError(reason)) {
        commandType = "preparation";
        setTimeout(function () {
            currentPlayingCommandIndex--;
            playAfterConnectionFailed();
        }, 100);
    } else if (reason == "shutdown") {

    } else {
        extCommand.clear();
        console.log(reason);

        if (currentPlayingCommandIndex >= 0) {
            updateCommandStatus(currentPlayingTestCaseIndex, currentPlayingCommandIndex, "fail");
        }

        updateTestCaseStatus(currentPlayingTestCaseIndex, "fail");
        console.log("Test case failed");

        clearTimeout(nextTestTimeout);
        failedReplay(reason);

        /* Clear the flag, reset to recording phase */
        /* A small delay for preventing recording events triggered in playing phase*/

        setTimeout(function () {
            isPlaying = false;
            //isRecording = true;
        }, 500);
    }
}

function doPreparation() {
    if (!isPlaying) {
        currentPlayingCommandIndex--;
        return Promise.reject("shutdown");
    }
    //console.log("in preparation");
    return extCommand.sendCommand("waitPreparation", "", "")
        .then(function () {
            return true;
        })
}

function doPrePageWait() {
    if (!isPlaying) {
        currentPlayingCommandIndex--;
        return Promise.reject("shutdown");
    }
    //console.log("in prePageWait");
    return extCommand.sendCommand("prePageWait", "", "")
        .then(function (response) {
            if (response && response.new_page) {
                //console.log("prePageWaiting");
                return doPrePageWait();
            } else {
                return true;
            }
        })
}

function doPageWait() {
    if (!isPlaying) {
        currentPlayingCommandIndex--;
        return Promise.reject("shutdown");
    }
    //console.log("in pageWait");
    return extCommand.sendCommand("pageWait", "", "")
        .then(function (response) {
            if (pageTime && (Date.now() - pageTime) > 30000) {
                console.log("Page Wait timed out after 30000ms");
                pageCount = 0;
                pageTime = "";
                return true;
            } else if (response && response.page_done) {
                pageCount = 0;
                pageTime = "";
                return true;
            } else {
                pageCount++;
                if (pageCount == 1) {
                    pageTime = Date.now();
                    console.log("Wait for the new page to be fully loaded");
                }
                return doPageWait();
            }
        })
}

function doAjaxWait() {
    //console.log("in ajaxWait");
    if (!isPlaying) {
        currentPlayingCommandIndex--;
        return Promise.reject("shutdown");
    }
    return extCommand.sendCommand("ajaxWait", "", "")
        .then(function (response) {
            if (ajaxTime && (Date.now() - ajaxTime) > 30000) {
                console.log("Ajax Wait timed out after 30000ms");
                ajaxCount = 0;
                ajaxTime = "";
                return true;
            } else if (response && response.ajax_done) {
                ajaxCount = 0;
                ajaxTime = "";
                return true;
            } else {
                ajaxCount++;
                if (ajaxCount == 1) {
                    ajaxTime = Date.now();
                    console.log("Wait for all ajax requests to be done");
                }
                return doAjaxWait();
            }
        })
}

function doDomWait() {
    if (!isPlaying) {
        currentPlayingCommandIndex--;
        return Promise.reject("shutdown");
    }
    //console.log("in domWait");
    return extCommand.sendCommand("domWait", "", "")
        .then(function (response) {
            if (domTime && (Date.now() - domTime) > 30000) {
                console.log("DOM Wait timed out after 30000ms");
                domCount = 0;
                domTime = "";
                return true;
            } else if (response && (Date.now() - response.dom_time) < 400) {
                domCount++;
                if (domCount == 1) {
                    domTime = Date.now();
                    console.log("Wait for the DOM tree modification");
                }
                return doDomWait();
            } else {
                domCount = 0;
                domTime = "";
                return true;
            }
        })
}

function doCommand() {
    let commands = currentSuite.test_cases[currentPlayingTestCaseIndex].commands;
    let commandName = commands[currentPlayingCommandIndex].command;
    let commandTarget = commands[currentPlayingCommandIndex].target;
    let commandValue = commands[currentPlayingCommandIndex].value;
    //console.log("in common");

    if (implicitCount == 0) {
        console.log("Executing: | " + commandName + " | " + commandTarget + " | " + commandValue + " |");
        var actualLog = "Executing: | " + commandName + " | " + commandTarget + " | " + commandValue + " |";
        // execution.results.push({
        //     "command": actualLog,
        //     "commandIndex": currentPlayingCommandIndex,
        //     "testCaseIndex": currentPlayingTestCaseIndex,
        //     "status": "log"
        // });
    }


    if (!isPlaying) {
        currentPlayingCommandIndex--;
        return Promise.reject("shutdown");
    }

    let p = new Promise(function (resolve, reject) {
        let count = 0;
        let interval = setInterval(function () {
            if (!isPlaying) {
                currentPlayingCommandIndex--;
                reject("shutdown");
                clearInterval(interval);
            }
            if (count > 60) {
                console.log("Timed out after 30000ms");
                reject("Window not Found");
                clearInterval(interval);
            }
            if (!extCommand.getPageStatus()) {
                if (count == 0) {
                    console.log("Wait for the new page to be fully loaded");
                }
                count++;
            } else {
                resolve();
                clearInterval(interval);
            }
        }, 500);
    });
    return p.then(function () {
        if (commandValue.indexOf("${") !== -1) {
            commandValue = convertVariableToString(commandValue);
        }
        if (commandTarget.indexOf("${") !== -1) {
            commandTarget = convertVariableToString(commandTarget);
        }
        if (isWindowMethodCommand(commandName)) {
            return extCommand.sendCommand(commandName, commandTarget, commandValue, true);
        }
        return extCommand.sendCommand(commandName, commandTarget, commandValue);
    })
        .then(function (result) {
            if (result.result != "success") {
                // implicit
                if (result.result.match(/Element[\s\S]*?not found/)) {
                    if (implicitTime && (Date.now() - implicitTime > 10000)) {
                        console.log("Implicit Wait timed out after 10000ms");
                        implicitCount = 0;
                        implicitTime = "";
                    } else {
                        implicitCount++;
                        if (implicitCount == 1) {
                            console.log("Wait until the element is found");
                            implicitTime = Date.now();
                        }
                        return doCommand();
                    }
                }
                implicitCount = 0;
                implicitTime = "";

                failedReplay(result.result);

                updateCommandStatus(currentPlayingTestCaseIndex, currentPlayingCommandIndex, "fail");

                // execution.results.push({
                //     "command": "",
                //     "commandIndex": currentPlayingCommandIndex,
                //     "testCaseIndex": currentPlayingTestCaseIndex,
                //     "status": "fail"
                // });
                //setColor(currentTestCaseId, "fail");
                //document.getElementById("result-failures").innerHTML = parseInt(//document.getElementById("result-failures").innerHTML) + 1;
                if (commandName.includes("verify") && result.result.includes("did not match")) {
                    // execution.results.push({
                    //     "command": "",
                    //     "commandIndex": currentPlayingCommandIndex,
                    //     "testCaseIndex": currentPlayingTestCaseIndex,
                    //     "status": "fail"
                    // });
                } else {
                    console.log("Test case failed");
                    // isReplaying = "endReplaying";
                    // execution.results.push({
                    //     "command": "Test case failed",
                    //     "commandIndex": currentPlayingCommandIndex,
                    //     "testCaseIndex": currentPlayingTestCaseIndex,
                    //     "status": "log"
                    // });

                    caseFailed = true;
                    currentPlayingCommandIndex = commands.length;

                    updateTestCaseStatus(currentPlayingTestCaseIndex, "fail");
                    stop();
                }
            } else {
                // execution.results.push({
                //     "command": "",
                //     "commandIndex": currentPlayingCommandIndex,
                //     "testCaseIndex": currentPlayingTestCaseIndex,
                //     "status": "pass"
                // });
                updateCommandStatus(currentPlayingTestCaseIndex, currentPlayingCommandIndex, "success");
            }
        })
}

function isReceivingEndError(reason) {
    if (reason == "TypeError: response is undefined" ||
        reason == "Error: Could not establish connection. Receiving end does not exist." ||
        // Below message is for Google Chrome
        reason.message == "Could not establish connection. Receiving end does not exist." ||
        // Google Chrome misspells "response"
        reason.message == "The message port closed before a reponse was received." ||
        reason.message == "The message port closed before a response was received.")
        return true;
    return false;
}

function isWindowMethodCommand(command) {
    if (command == "answerOnNextPrompt"
        || command == "chooseCancelOnNextPrompt"
        || command == "assertPrompt"
        || command == "chooseOkOnNextConfirmation"
        || command == "chooseCancelOnNextConfirmation"
        || command == "assertConfirmation"
        || command == "assertAlert")
        return true;
    return false;
}

function getSuite() {
    return new Promise(function (resolve, reject) {
        browser.runtime.sendMessage({command: "getCurrentSuite"}).then((suite) => {
            resolve(suite.suite)
        });
    })
}

function convertVariableToString(variable) {
    let frontIndex = variable.indexOf("${");
    let newStr = "";
    while (frontIndex !== -1) {
        let prefix = variable.substring(0, frontIndex);
        let suffix = variable.substring(frontIndex);
        let tailIndex = suffix.indexOf("}");
        let suffix_front = suffix.substring(0, tailIndex + 1);
        let suffix_tail = suffix.substring(tailIndex + 1);
        newStr += prefix + xlateArgument(suffix_front);
        variable = suffix_tail;
        frontIndex = variable.indexOf("${");
    }
    return newStr + variable;
}

function playSingleCommand(testCaseIndex, commandIndex) {
    getSuite().then((suite) => {
        initializePlayingProgress()
            .then(() => {
                let command = suite.test_cases[testCaseIndex].commands[commandIndex];
                let commandName = command.command;
                let commandTarget = command.target;
                let commandValue = command.value;

                updateCommandStatus(testCaseIndex, commandIndex, 'pending');

                if (isExtCommand(commandName)) {
                    console.log("Executing: | " + commandName + " | " + commandTarget + " | " + commandValue + " |");
                    let upperCase = commandName.charAt(0).toUpperCase() + commandName.slice(1);
                    extCommand["do" + upperCase](commandTarget, commandValue).then(function () {
                        updateCommandStatus(testCaseIndex, commandIndex, "success");
                    }, (reason) => {
                        //Ext command failed?
                        console.log(reason);
                        updateCommandStatus(testCaseIndex, commandIndex, "fail");
                    });
                } else {
                    if (commandValue.indexOf("${") !== -1) {
                        commandValue = convertVariableToString(commandValue);
                    }
                    if (commandTarget.indexOf("${") !== -1) {
                        commandTarget = convertVariableToString(commandTarget);
                    }
                    if (isWindowMethodCommand(commandName)) {
                        return extCommand.sendCommand(commandName, commandTarget, commandValue, true);
                    }
                    extCommand.sendCommand(commandName, commandTarget, commandValue).then(function (result) {
                        if (result.result != "success") {
                            // implicit
                            if (result.result.match(/Element[\s\S]*?not found/)) {
                                if (implicitTime && (Date.now() - implicitTime > 10000)) {
                                    console.log("Implicit Wait timed out after 10000ms");
                                    implicitCount = 0;
                                    implicitTime = "";
                                } else {
                                    implicitCount++;
                                    if (implicitCount == 1) {
                                        console.log("Wait until the element is found");
                                        implicitTime = Date.now();
                                    }
                                    return doCommand();
                                }
                            }
                            implicitCount = 0;
                            implicitTime = "";

                            updateCommandStatus(testCaseIndex, commandIndex, "fail");
                        } else {
                            updateCommandStatus(testCaseIndex, commandIndex, "success");
                        }
                    })
                }
            }).then(finalizePlayingProgress)
        //     .catch((reason)=> {
        //     updateCommandStatus(testCaseIndex, commandIndex, 'fail');
        //     updateStatus(reason, 'error', 8000);
        // });
    });

}
