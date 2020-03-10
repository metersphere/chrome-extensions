class BackgroundRecorderUI {
    constructor() {
        this.recording = "stopped";
        this.recordingTab = null;
        this.editorTabId = null;
        this.debuggerTab = null;
        this.observers = [];
        this.transactions = [];
        this.currentSuite = null;
        this.defaultTestName = null;
        this.replayStatus = 'stopped';
        this.countClicks = 0;
        this.replayWindowId = null;
        this.currentRecordingTabId = null;
        this.currentRecordingWindowId = null;
        this.currentRecordingFrameLocation = null;
        this.openedTabNames = {};
        this.openedTabIds = {};
        this.openedTabCount = 0;
        this.openedWindowIds = {};
        this.contentWindowId = -1;
        this.selfWindowId = -1;
        this.attached = false;
        this.recordedDomSet = new Set();
        this.recordedDomMapping = [];
        this.rebind();
    }

    startRecording(name, tab) {
        chrome.tabs.sendMessage(tab.id, {
            command: 'attachPrompt'
        });
        this.attachPrompt();
        // Create contextual menus
        createMenus();
        if(debug) {
            console.log("Starting recorder.");
            console.log("New suite name: " + name);
        }
        this.clearRecordedDom();
        this.cleanRecording();
        this.switchRecordingState("record");
        this.currentSuite = new TestSuite(name);
        this.recordingTab = tab;
        this.openedWindowIds[tab.windowId] = true;
        this.currentRecordingTabId = tab.id;
        this.currentRecordingWindowId = tab.windowId;
        this.openedTabNames["win_ser_local"] = tab.id;
        this.openedTabIds[tab.id] = "win_ser_local";
        this.openedTabCount = 1;
        this.currentRecordingFrameLocation = "root";
        if(debug) {
            console.log("Attempting to start recorder on tab id: " + tab);
        }
        browser.tabs.sendMessage(tab.id, {attachRecorder: true}).catch((reason) => {
            //Fail silently
        });
        browser.tabs.sendMessage(this.recordingTab.id, {msg: 'addTransactionPopupUi'}).catch((reason) => {
            //Fail silently
        });
        this.addObserver(tab);
        this.currentSuite.addObserver(tab);
        // Attach listeners
        this.attach();

        const viewportSize = [tab.width, tab.height];
        const viewportString = viewportSize.join(',');
        const resizeWindowCommand = {
            command: "resizeWindow",
            value: viewportString,
            target: '',
            targetOptions: [],
        };
        this.recordCommand(resizeWindowCommand);

        // Record open command at first time
        let command = {command: "open", target: this.recordingTab.url, value: "", targetOptions: []};
        // Save starting url for further checking for url changing
        // for "open" command logic
        this.currentUrl = this.recordingTab.url;
        // if url in array of forbidden to record domains not record it
        checkForForbiddenDomain(tab.url).then((isForbiddenDomain) => {
            if(!isForbiddenDomain) {
                this.recordCommand(command);
            }
        })
    }

    changeRecordingTab(name, tab) {
        chrome.tabs.sendMessage(tab.id, {
            command: 'attachPrompt'
        });
        this.attachPrompt();
        this.recordingTab = tab;
        this.openedWindowIds[tab.windowId] = true;
        this.currentRecordingTabId = tab.id;
        this.currentRecordingWindowId = tab.windowId;
        // Storing tab ids and Tab names. Using in multiple tabs recording
        // Tab Names Unique Ids are made by counting of Tabs where was recording
        let winSerName = 'win_ser_' + this.openedTabCount;
        if(!this.openedTabIds.hasOwnProperty(tab.id)){
            this.openedTabNames[winSerName] = tab.id;
            this.openedTabIds[tab.id] = winSerName;
            this.currentRecordingFrameLocation = "root";
            this.openedTabCount++;
        }
        browser.tabs.sendMessage(tab.id, {attachRecorder: true}).catch((reason) => {
            //Fail silently
        });
        browser.tabs.sendMessage(this.recordingTab.id, {msg: 'addTransactionPopupUi'}).catch((reason) => {
            //Fail silently
        });
        this.addObserver(tab);
        this.currentSuite.addObserver(tab);
    }

    attachPrompt() {
        for (let tab in this.openedTabIds) {
            chrome.tabs.sendMessage(parseInt(tab), {
                command: 'attachPrompt'
            });
        }
    }

    detachPrompt() {
        for (let tab in this.openedTabIds) {
            chrome.tabs.sendMessage(parseInt(tab), {
                command: 'detachPrompt'
            });
        }
    }

    endRecording() {
        this.detachPrompt();
        this.switchRecordingState("stopped");
        this.removeObserver(this.recordingTab.id);
        let ids = Object.keys(this.openedTabIds);
        for(let i = 0; i < ids.length; i++) {
            let id = this.removeObserver(ids[i]);
            this.removeObserver(id);
        }
        this.currentSuite.clearObservers();
        //Remove context menus
        removeMenus();
        chrome.tabs.query({}, function (tabs) {
            for (let i = 0; i < tabs.length; i++) {
                browser.tabs.sendMessage(tabs[i].id, {detachRecorder: true}).catch((reason) => {
                    //Fail silently
                });
                browser.tabs.sendMessage(tabs[i].id, {msg: 'removeTransactionPopupUi'}).catch((reason) => {
                    //Fail silently
                });
            }
        });
        this.detach();
    }

    pauseRecording() {
        if(debug) {
            console.log("Pausing the recorder");
        }
        this.switchRecordingState("pause");
    }

    resumeRecording() {
        if(debug) {
            console.log("Resuming the recorder");
        }
        this.switchRecordingState("record");
        browser.tabs.sendMessage(this.recordingTab.id, {attachRecorder: true}).catch((reason) => {
            //Fail silently
        })
    }

    cleanRecording() {
        this.countClicks = 0;
        this.switchRecordingState("stopped");
        this.currentSuite = null;
        chrome.browserAction.setBadgeText({
            text: ''
        });
        if (!jQuery.isEmptyObject(this.openedTabIds)) {
            Object.keys(this.openedTabIds).forEach(function (key) {
                browser.tabs.sendMessage(parseInt(key), {detachRecorder: true}).catch((reason) => {
                    //Fail silently
                });
                browser.tabs.sendMessage(parseInt(key), {msg: 'removeTransactionPopupUi'}).catch((reason) => {
                    //Fail silently
                });
            });
        }
        this.recordingTab = null;

        if (this.debuggerTab) {
            chrome.tabs.remove(this.debuggerTab.id, (tabs) => {
                this.debuggerTab = null;
                if(debug) {
                    console.log(tabs);
                    console.log("Removed the debugger tab: ");
                }
            });
        }
        if (this.editorTabId) {
            chrome.tabs.remove(this.editorTabId, (tabs) => {
                this.editorTabId = null;
                if(debug) {
                    console.log(tabs);
                    console.log("Removed the editor tab: ");
                }
            });
        }

        this.clearRecordedDom();

        this.currentRecordingTabId = null;
        this.currentRecordingWindowId = null;
        this.currentRecordingFrameLocation = null;
        this.openedTabNames = {};
        this.openedTabIds = {};
        this.openedTabCount = 0;
        this.openedWindowIds = {};
        this.contentWindowId = -1;
        this.selfWindowId = -1;
        // this.attached = false;
        this.detach();
    }

    recordCommand(command) {
        if (this.applyFilters(command)) {
            if (this.recording === "record" || (this.recording === "pause" && command.command.startsWith("assert"))) {
                this.notifyObservers();
                if (!this.currentSuite) {
                    this.currentSuite = new TestSuite("New Test Suite");
                }
                this.countClicks++;
                let lastTestCaseIndex = this.currentSuite.getLastTestCaseIndex();
                let lastCommandIndex = this.currentSuite.test_cases[lastTestCaseIndex].commands.length;
                if (command.command.match(/OnNext/i)) {
                    this.currentSuite.addCommand(lastTestCaseIndex, (lastCommandIndex - 1), command);
                } else {
                    this.currentSuite.addCommand(lastTestCaseIndex, lastCommandIndex, command);
                }
            } else {
                if(debug) {
                    console.log("Command received, but recording status is: " + this.recording);
                }
            }
        } else {
            if(debug) {
                console.log("Command blocked by filter. Command: " + command);
            }
        }
    }

    addCommand(testCaseIndex, commandIndex, command) {
        this.currentSuite.addCommand(testCaseIndex, commandIndex, command);
    }

    addTestCase(testCaseIndex, testCase) {
        this.currentSuite.addTestCase(testCaseIndex, testCase);
    }

    exportJson() {
        //if option selected
        this.currentSuite.test_cases.forEach((testCase, testCaseIndex) => {
            testCase.commands.forEach((command, commandIndex) => {
                let collectionIndex = this.recordedDomMapping[testCaseIndex] && this.recordedDomMapping[testCaseIndex][commandIndex];
                this.currentSuite.assignDomToCommand(testCaseIndex, commandIndex, Array.from(this.recordedDomSet)[collectionIndex])
            });
        });

        return this.currentSuite.exportJSON();
    }

    applyFilters(command) {
        if (command.command) {
            let targetOptions = command.targetOptions;
            for (let i = 0; i < targetOptions.length; i++) {
                if (targetOptions[i]) {
                    //Save filters on file
                    //The id of the popup-ui
                    if (targetOptions[i][0].includes("5c32565c-a0ba-42be-8060-34d2cf2285fa")) {
                        return false
                    }
                }
            }
        }
        return true;
    }

    updateSuiteName(name) {
        if (this.currentSuite) this.currentSuite.suite_name = name;
    }

    updateTestCases(data) {
        if (!this.currentSuite) {
            this.currentSuite = new TestSuite(data.suite_name);
        }
        this.currentSuite.updateTestCases(data);
    }

    getSuiteName() {
        return this.currentSuite.suite_name;
    }

    getTransactions() {
        let transactions = [];
        for (let i = 0; i < this.currentSuite.test_cases.length; i++) {
            let t = {};
            t.name = this.currentSuite.test_cases[i].testStep;
            t.counter = this.currentSuite.test_cases[i].commands.length;
            transactions.push(t);
        }
        return transactions;
    }

    getTransactionsCommands() {
        let transactions = [];
        for (let i = 0; i < this.currentSuite.test_cases.length; i++) {
            let t = {};
            t.name = this.currentSuite.test_cases[i].testStep;
            t.counter = this.currentSuite.test_cases[i].commands.length;
            t.commands = this.currentSuite.test_cases[i].commands;
            transactions.push(t);
        }
        return transactions;
    }

    totalCommandsCount() {
        let counter = 0;
        for (let i = 0; i < this.currentSuite.test_cases.length; i++) {
            for (let a = 0; a < this.currentSuite.test_cases[i].commands.length; a++) {
                counter++;
            }
        }
        return counter;
    }

    updateTransactions(transactions) {
        this.transactions = transactions;
    }

    addNewTestCase(name) {
        this.currentSuite.addNewTestCase(name);
    }

    updateTestCaseName(testCase, name) {
        this.currentSuite.updateTestCaseName(testCase, name);
    }

    updateCommandIndex(testCaseIndex, commandFromIndex, commandToIndex) {
        this.currentSuite.updateCommandIndex(testCaseIndex, commandFromIndex, commandToIndex);
    }

    getTestCase(testCase) {
        return this.currentSuite.getTestCase(testCase);
    }

    deleteCommmand(testCaseIndex, commandIndex) {
        this.currentSuite.deleteCommmand(testCaseIndex, commandIndex);
    }

    addObserver(tab) {
        //Check if the observer is already on the list
        for (let i = 0; i < this.observers.length; i++) {
            if (this.observers[i].id === tab.id) {
                return false;
            }
        }
        this.observers.push(tab);
        return true;
    }

    getAllObservers() {
        return this.observers;
    }

    deleteTestCase(testCaseIndex) {
        this.currentSuite.deleteTestCase(testCaseIndex);
    }

    removeObserver(id) {
        let targetObserverIndex;
        for (let i = 0; i < this.observers.length; i++) {
            if (this.observers[i].id === id) {
                targetObserverIndex = i;
            }
        }
        if (targetObserverIndex) {
            this.observers.splice(targetObserverIndex, 1);
        } else {
            if(debug) {
                console.log("Observer with id: " + id + "not found.");
            }
        }
    }

    notifyObservers() {
        if(debug) {
            console.log("Attempting to notify observers: ");
            console.log('observers', this.observers);
        }
        for (let i = 0; i < this.observers.length; i++) {
            browser.tabs.sendMessage(this.observers[i].id, {
                command: "recorderNotification",
                observable: this
            }).catch((reason) => {
                //Fail silently
            })
        }
        if(debug) {
            console.log("Observers notified");
        }
    }

    switchRecordingState(recordingState) {
        if(debug) {
            console.log("Switching recording state: " + recordingState);
        }
        this.recording = recordingState;
        this.notifyObservers();
    }

    updateBadgeCounter(counter) {
        if(debug) {
            console.log("Going to update the new badge counter to: " + counter);
        }
        this.countClicks = counter;
        chrome.browserAction.setBadgeText({text: "" + this.countClicks + ""});
    }

    updateCommand(testCaseIndex, commandIndex, command) {
        this.currentSuite.updateCommand(testCaseIndex, commandIndex, command);
    }

    updateCommandProperty(testCaseIndex, commandIndex, commandProperty, value) {
        this.currentSuite.updateCommandProperty(testCaseIndex, commandIndex, commandProperty, value);
    }

    loadSuiteJSON(json) {
        if (!this.currentSuite) {
            this.currentSuite = new TestSuite(json.suite_name);
        }
        this.currentSuite.loadSuiteJSON(json);
        // let counter = this.totalCommandsCount();
        //console.log("Counter commands: " + counter);
        // this.updateBadgeCounter(counter);
    }

    /**
     *
     * @param {string} command_name
     * @param {*} command_target_array
     * @param {*} command_value
     * @param {Object} [extra] - Extra information about the action
     */
    addCommandAuto(command_name, command_target_array, command_value, extra) {
        let command;
        if (command_target_array.constructor === Array) {
            command = {
                command: command_name,
                target: command_target_array[0][0],
                value: command_value,
                attributes: extra ? extra.attributes : undefined,
                targetOptions: command_target_array
            };
        } else {
            command = {
                command: command_name,
                target: command_target_array,
                value: command_value,
                attributes: extra ? extra.attributes : undefined,
                targetOptions: []
            };
        }
        this.recordCommand(command);
    }

    addCommandBeforeLastCommand(command_name, command_target_array, command_value) {
        if(debug) {
            console.log("Attempting to add command before last");
        }
        let command = {
            command: command_name,
            target: command_target_array[0][0],
            value: command_value,
            targetOptions: command_target_array
        };
        let lastTestCaseIndex = this.currentSuite.getLastTestCaseIndex();
        let lastCommandIndex = this.currentSuite.test_cases[lastTestCaseIndex].commands.length - 1;
        this.addCommand(lastTestCaseIndex, lastCommandIndex - 1, command);
    }

    // Handler for tabs.onActivated event
    // Fires when the active tab in a window changes
    activatedListener(activeInfo) {
        let self = this;
        chrome.tabs.get(activeInfo.tabId, function(tab) {
            // if url in array of forbidden to record domains not record it
            checkForForbiddenDomain(tab.url).then((isForbiddenDomain) => {
                if(!isForbiddenDomain) {
                    // record command only if tab not exists in array of known for record tabs
                    if(!self.openedTabIds.hasOwnProperty(tab.id)) {
                        const targetUrl = tab.url === 'chrome://newtab/' ? '""' : tab.url;
                        let command = {command: "openWindow", target: targetUrl, value: "", targetOptions: []};
                        self.recordCommand(command);
                        // attaching all the necessary for recording to new tab
                        self.changeRecordingTab(self.currentSuite, tab);
                    }
                    // adding command selectWindow each time new recording tab activated
                    self.addCommandAuto("selectWindow", [[self.openedTabIds[tab.id]]], "");
                    // change current url for new ones as it was changed
                    // for further checking for url changing in checkUrlsMatch function
                    self.currentUrl = tab.url;
                }
            });
        });
    };

    // Handler for tabs.onUpdated event
    // Fires when a tab is updated
    openListener(tabId, changeInfo, tab) {
        if (changeInfo.url != null) {
            // if url (domain) was changed do open command recording logic
            let urlChangeFlag = checkUrlsMatch(this.currentUrl, changeInfo.url);
            // if url in array of forbidden to record domains not record it
            checkForForbiddenDomain(tab.url).then((isForbiddenDomain) => {
                if(!urlChangeFlag && !isForbiddenDomain) {
                    // checking for new tab was opened
                    if(changeInfo.url === "chrome://newtab/") {
                        // openWindow recording in activatedListener
                    } else {
                        let command = {command: "open", target: changeInfo.url, value: "", targetOptions: []};
                        this.recordCommand(command);
                    }
                    // change current url for new ones as it was changed
                    // for further checking for url changing in checkUrlsMatch function
                    this.currentUrl = changeInfo.url;
                }
            })
        }
    }

    // Sideex Listener. Not Using at the moment
    // Sideex record.js
    // TODO: rename testCaseId to something with what to identify the current recording
    // TODO: rename method
    tabsOnActivatedHandler(activeInfo) {
        if (jQuery.isEmptyObject(this.openedTabIds)) {
            return;
        }
        var self = this;
        // Because event listener is so fast that selectWindow command is added
        // before other commands like clicking a link to browse in new tab.
        // Delay a little time to add command in order.
        setTimeout(function () {
            if (self.currentRecordingTabId === activeInfo.tabId && self.currentRecordingWindowId === activeInfo.windowId)
                return;
            // If no command has been recorded, ignore selectWindow command
            // until the user has select a starting page to record the commands
            if (self.totalCommandsCount() === 0)
                return;
            // Ignore all unknown tabs, the activated tab may not derived from
            // other opened tabs, or it may managed by other SideeX panels
            if (self.openedTabIds[activeInfo.tabId] == undefined)
                return;

            // Tab information has existed, add selectWindow command
            self.currentRecordingTabId = activeInfo.tabId;
            self.currentRecordingWindowId = activeInfo.windowId;
            self.currentRecordingFrameLocation = "root";
            self.addCommandAuto("selectWindow", [[self.openedTabIds[activeInfo.tabId]]], "");
        }, 150);
    }

    windowsOnFocusChangedHandler(windowId) {
        if (jQuery.isEmptyObject(this.openedTabIds)) {
            return;
        }
        if (windowId === browser.windows.WINDOW_ID_NONE) {
            // In some Linux window managers, WINDOW_ID_NONE will be listened before switching
            // See MDN reference :
            // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/windows/onFocusChanged
            return;
        }
        // If the activated window is the same as the last, just do nothing
        // selectWindow command will be handled by tabs.onActivated listener
        // if there also has a event of switching a activated tab
        if (this.currentRecordingWindowId === windowId)
            return;

        let self = this;

        browser.tabs.query({
            windowId: windowId,
            active: true
        }).then(function (tabs) {
            if (tabs.length === 0 || self.isPrivilegedPage(tabs[0].url)) {
                return;
            }
            // The activated tab is not the same as the last
            if (tabs[0].id !== self.currentRecordingTabId) {
                // If no command has been recorded, ignore selectWindow command
                // until the user has select a starting page to record commands
                if (self.totalCommandsCount() === 0)
                    return;

                // Ignore all unknown tabs, the activated tab may not derived from
                // other opened tabs, or it may managed by other SideeX panels
                if (self.openedTabIds[tabs[0].id] == undefined)
                    return;

                // Tab information has existed, add selectWindow command
                self.currentRecordingWindowId = windowId;
                self.currentRecordingTabId = tabs[0].id;
                self.currentRecordingFrameLocation = "root";
                self.addCommandAuto("selectWindow", [[self.openedTabIds[tabs[0].id]]], "");
            }
        });
    }

    tabsOnRemovedHandler(tabId, removeInfo) {
        if (jQuery.isEmptyObject(this.openedTabIds)) {
            return;
        }
        if (this.openedTabIds[tabId] != undefined) {
            if (this.currentRecordingTabId !== tabId) {
                this.addCommandAuto("selectWindow", [
                    [this.openedTabIds[tabId]]
                ], "");
                this.addCommandAuto("close", [
                    [this.openedTabIds[tabId]]
                ], "");
                this.addCommandAuto("selectWindow", [
                    [this.openedTabIds[this.currentRecordingTabId]]
                ], "");
            } else {
                this.addCommandAuto("close", [
                    [this.openedTabIds[tabId]]
                ], "");
            }
            // Remove tab observers
            this.removeObserver(tabId);
            this.currentSuite.removeObserver(tabId);
            delete this.openedTabNames[this.openedTabIds[tabId]];
            delete this.openedTabIds[tabId];
            this.currentRecordingFrameLocation = "root";
        }
    }

    webNavigationOnCreatedNavigationTargetHandler(details) {
        if (this.openedTabIds[details.sourceTabId] != undefined) {
            this.openedTabNames["win_ser_" + this.openedTabCount] = details.tabId;
            this.openedTabIds[details.tabId] = "win_ser_" + this.openedTabCount;
            if (details.windowId !== undefined) {
                this.setOpenedWindow(details.windowId);
            } else {
                // Google Chrome does not support windowId.
                // Retrieve windowId from tab information.
                let self = this;
                browser.tabs.get(details.tabId)
                    .then(function (tabInfo) {
                        self.setOpenedWindow(tabInfo.windowId);
                        //Observer
                        self.currentSuite.addObserver(tabInfo);
                        self.addObserver(tabInfo);
                    });
            }
            this.openedTabCount++;
            this.attachPrompt();
        }
    }

    addCommandMessageHandler(message, sender, sendRequest) {
        message = message.step;
        if (!message.command || this.openedWindowIds[sender.tab.windowId] == undefined)
            return;
        if (jQuery.isEmptyObject(this.openedTabIds)) {
            this.openedTabIds = {};
            this.openedTabNames = {};
            this.currentRecordingFrameLocation = "root";
            this.currentRecordingTabId = sender.tab.id;
            this.currentRecordingWindowId = sender.tab.windowId;
            this.openedTabCount = 1;
        }
        if (Object.keys(this.openedTabIds).length === 0) {
            this.currentRecordingTabId = sender.tab.id;
            this.currentRecordingWindowId = sender.tab.windowId;
            this.openedTabNames["win_ser_local"] = sender.tab.id;
            this.openedTabIds[sender.tab.id] = "win_ser_local";
        }
        if (this.openedTabIds[sender.tab.id] == undefined)
            return;
        if (message.frameLocation !== this.currentRecordingFrameLocation) {
            let newFrameLevels = message.frameLocation.split(':');
            let oldFrameLevels = this.currentRecordingFrameLocation.split(':');
            while (oldFrameLevels.length > newFrameLevels.length) {
                this.addCommandAuto("selectFrame", [
                    ["relative=parent"]
                ], "");
                oldFrameLevels.pop();
            }
            while (oldFrameLevels.length != 0 && oldFrameLevels[oldFrameLevels.length - 1] != newFrameLevels[oldFrameLevels.length - 1]) {
                this.addCommandAuto("selectFrame", [
                    ["relative=parent"]
                ], "");
                oldFrameLevels.pop();
            }
            while (oldFrameLevels.length < newFrameLevels.length) {
                this.addCommandAuto("selectFrame", [
                    ["index=" + newFrameLevels[oldFrameLevels.length]]
                ], "");
                oldFrameLevels.push(newFrameLevels[oldFrameLevels.length]);
            }
            this.currentRecordingFrameLocation = message.frameLocation;
        }
        if (message.command.includes("Value") && typeof message.value === 'undefined') {
            //Handle error and show message to user
            create_notification('Assertion error', 'This element does not have property \'value\'.');
            // console.log("Error: This element does not have property 'value'.");
            return;
        } else if (message.command.includes("Text") && message.value === '') {
            //Handle error and show message to user
            create_notification('Assertion error', 'This element does not have property \'Text\'.');
            // console.log("Error: This element does not have property 'Text'.");
            return;
        } else if (message.command.includes("store")) {
            // In Google Chrome, window.prompt() must be triggered in
            // an actived tabs of front window, so we let panel window been focused
            // browser.windows.update(this.selfWindowId, {focused: true})
            // .then(function() {
            let self = this;
            // Even if window has been focused, window.prompt() still failed.
            // Delay a little time to ensure that status has been updated
            setTimeout(function () {
                message.value = prompt("Enter the name of the variable");
                if (message.insertBeforeLastCommand) {
                    self.addCommandBeforeLastCommand(message.command, message.targetOptions, message.value);
                } else {
                    // notification(message.command, message.target, message.value);
                    self.addCommandAuto(message.command, message.targetOptions, message.value);
                }
            }, 100);
            return;
        }
        // handle choose ok/cancel confirm
        this.addCommandAuto(message.command, message.targetOptions, message.value, {attributes: message.attributes});
    }

    isPrivilegedPage(url) {
        if (url.substr(0, 13) == 'moz-extension' ||
            url.substr(0, 16) == 'chrome-extension') {
            return true;
        }
        return false;
    }

    rebind() {
        // this.tabsOnActivatedHandler = this.tabsOnActivatedHandler.bind(this);
        this.activatedListener = this.activatedListener.bind(this);
        this.openListener = this.openListener.bind(this);
        this.windowsOnFocusChangedHandler = this.windowsOnFocusChangedHandler.bind(this);
        this.tabsOnRemovedHandler = this.tabsOnRemovedHandler.bind(this);
        this.webNavigationOnCreatedNavigationTargetHandler = this.webNavigationOnCreatedNavigationTargetHandler.bind(this);
        this.addCommandMessageHandler = this.addCommandMessageHandler.bind(this);
    }

    attach() {
        if (this.attached) {
            return;
        }
        this.attached = true;
        // browser.tabs.onActivated.addListener(this.tabsOnActivatedHandler);
        // Fired when a tab is updated
        browser.tabs.onUpdated.addListener(this.openListener);
        // Fires when the active tab in a window changes
        browser.tabs.onActivated.addListener(this.activatedListener);
        browser.windows.onFocusChanged.addListener(this.windowsOnFocusChangedHandler);
        browser.tabs.onRemoved.addListener(this.tabsOnRemovedHandler);
        browser.webNavigation.onCreatedNavigationTarget.addListener(this.webNavigationOnCreatedNavigationTargetHandler);
        // browser.runtime.onMessage.addListener(this.addCommandMessageHandler);
    }

    detach() {
        if (!this.attached) {
            return;
        }
        this.attached = false;
        // browser.tabs.onActivated.removeListener(this.tabsOnActivatedHandler);
        browser.tabs.onUpdated.removeListener(this.openListener);
        browser.tabs.onActivated.removeListener(this.activatedListener);
        browser.windows.onFocusChanged.removeListener(this.windowsOnFocusChangedHandler);
        browser.tabs.onRemoved.removeListener(this.tabsOnRemovedHandler);
        browser.webNavigation.onCreatedNavigationTarget.removeListener(this.webNavigationOnCreatedNavigationTargetHandler);
        // browser.runtime.onMessage.removeListener(this.addCommandMessageHandler);
    }

    setOpenedWindow(windowId) {
        this.openedWindowIds[windowId] = true;
    }

    setSelfWindowId(windowId) {
        this.selfWindowId = windowId;
    }

    getSelfWindowId() {
        return this.selfWindowId;
    }

    clearRecordedDom() {
        this.recordedDomMapping = [];
        this.recordedDomSet.clear();
    }
}
