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

class Recorder {
    constructor(window) {
        this.window = window;
        this.attached = false;
        this.locatorBuilders = new LocatorBuilders(window);
        this.frameLocation = this.getFrameLocation();
        browser.runtime.sendMessage({
            frameLocation: this.frameLocation
        }).catch(function (reason) {
            // Failed silently if receiving end does not exist
        });
    }

    // This part of code is copyright by Software Freedom Conservancy(SFC)
    parseEventKey(eventKey) {
        if (eventKey.match(/^C_/)) {
            return {eventName: eventKey.substring(2), capture: true};
        } else {
            return {eventName: eventKey, capture: false};
        }
    }

    // This part of code is copyright by Software Freedom Conservancy(SFC)
    attach() {
        if (this.attached) {
            return;
        }
        this.attached = true;
        this.eventListeners = {};
        var self = this;
        for (let eventKey in Recorder.eventHandlers) {
            var eventInfo = this.parseEventKey(eventKey);
            var eventName = eventInfo.eventName;
            var capture = eventInfo.capture;

            // create new function so that the variables have new scope.
            function register() {
                var handlers = Recorder.eventHandlers[eventKey];
                var listener = function (event) {
                    for (var i = 0; i < handlers.length; i++) {
                        handlers[i].call(self, event);
                    }
                };
                this.window.document.addEventListener(eventName, listener, capture);
                this.eventListeners[eventKey] = listener;
            }

            register.call(this);
        }
    }

    // This part of code is copyright by Software Freedom Conservancy(SFC)
    detach() {
        if (!this.attached) {
            return;
        }
        this.attached = false;
        for (let eventKey in this.eventListeners) {
            var eventInfo = this.parseEventKey(eventKey);
            var eventName = eventInfo.eventName;
            var capture = eventInfo.capture;
            this.window.document.removeEventListener(eventName, this.eventListeners[eventKey], capture);
        }
        delete this.eventListeners;
    }

    getFrameLocation() {
        let currentWindow = window;
        let currentParentWindow;
        let frameLocation = "";
        let i = 0;
        while (currentWindow !== window.top) {
            currentParentWindow = currentWindow.parent;
            for (let idx = 0; idx < currentParentWindow.frames.length; idx++) {
                if (currentParentWindow.frames[idx] === currentWindow) {
                    frameLocation = ":" + idx + frameLocation;
                    currentWindow = currentParentWindow;
                    break;
                }
            }
            if(i > 100) {
                break;
            }
            i++;
        }
        return frameLocation = "root" + frameLocation;
    }

    /**
     *
     * @param {string} command
     * @param target
     * @param {Object} meta
     */
    recordEx(command, target, meta) {
        const message = {
            command: 'recordCommand',
            step: {
                command: command,
                target: target[0][0],
                value: meta.value,
                attributes: {
                    ...meta.attributes,
                    'page-title': document.title,
                    'page-url': window.location.href
                },
                targetOptions: target,
                frameLocation: this.frameLocation
            },
            url: window.location.href,
            label: document.title
        };

        chrome.runtime.sendMessage(message);
    }

    record(command, target, value, insertBeforeLastCommand, actualFrameLocation) {
        //Fix for html selector bug
        let c = command.toLowerCase();
        if(c.includes('click')){
            for(let i=0; i<target.length; i++){
                if(['css=html', '//html'].indexOf(target[i][0]) >= 0){
                    target[i][0] = target[i][0].replace('html', 'body');
                }
            }
        }
        var message = {
            command: "recordCommand",
            step: {
                command: command,
                target: target[0][0],
                value: value,
                targetOptions: target,
                attributes: {
                    'page-title': document.title,
                    'page-url': window.location.href
                },
                insertBeforeLastCommand: insertBeforeLastCommand,
                frameLocation: (actualFrameLocation != undefined) ? actualFrameLocation : this.frameLocation,
            },
            url: window.location.href,
            label: document.title
        };
        browser.runtime.sendMessage(message).catch(function (reason) {
            //Fail silently
        });

        let recordedDom = null;
        target.forEach((option) => {
            if (option[1] === 'xpath:position') {
                recordedDom = document.evaluate(
                    option[0],
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                ).singleNodeValue.outerHTML;
            }
        });
        if (recordedDom) {
            chrome.runtime.sendMessage({
                command: "recordDom",
                dom: recordedDom
            });
        }
    }
}

Recorder.eventHandlers = {};
Recorder.addEventHandler = function (handlerName, eventName, handler, options) {
    handler.handlerName = handlerName;
    if (!options) options = false;
    let key = options ? ('C_' + eventName) : eventName;
    if (!this.eventHandlers[key]) {
        this.eventHandlers[key] = [];
    }
    this.eventHandlers[key].push(handler);
};

// TODO: new by another object
var recorder = new Recorder(window);

// TODO: move to appropriate file
// show element
function startShowElement(message, sender, sendResponse) {
    if (message.showElement) {
        result = selenium["doShowElement"](message.targetValue);
        return Promise.resolve({result: result});
    }
}

browser.runtime.onMessage.addListener(startShowElement);
