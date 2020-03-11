/*
 * Copyright 2017 SideeX committers
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var typeTarget;
var typeLock = 0;
Recorder.inputTypes = ["text", "password", "file", "datetime", "datetime-local", "date", "month", "time", "week", "number", "range", "email", "url", "search", "tel", "color"];
Recorder.addEventHandler('type', 'change', function(event) {
    // © Chen-Chieh Ping, SideeX Team
    if (event.target.tagName && !preventType && typeLock == 0 && (typeLock = 1)) {
        // END
            var tagName = event.target.tagName.toLowerCase();
            var type = event.target.type;
            if ('input' == tagName && Recorder.inputTypes.indexOf(type) >= 0) {
                if (event.target.value.length > 0) {
                    this.record("type", this.locatorBuilders.buildAll(event.target), event.target.value);
    
                    // © Chen-Chieh Ping, SideeX Team
                    if (enterTarget != null) {
                        var tempTarget = event.target.parentElement;
                        var formChk = tempTarget.tagName.toLowerCase();
                        while (formChk != 'form' && formChk != 'body') {
                            tempTarget = tempTarget.parentElement;
                            formChk = tempTarget.tagName.toLowerCase();
                        }
                        if (formChk == 'form' && (tempTarget.hasAttribute("id") || tempTarget.hasAttribute("name")) && (!tempTarget.hasAttribute("onsubmit"))) {
                            if (tempTarget.hasAttribute("id"))
                                this.record("submit", [
                                    ["id=" + tempTarget.id, "id"]
                                ], "");
                            else if (tempTarget.hasAttribute("name"))
                                this.record("submit", [
                                    ["name=" + tempTarget.name, "name"]
                                ], "");
                        } else
                            this.record("sendKeys", this.locatorBuilders.buildAll(enterTarget), "${KEY_ENTER}");
                        enterTarget = null;
                    }
                    // END
                } else {
                    this.record("type", this.locatorBuilders.buildAll(event.target), event.target.value);
                }
            } else if ('textarea' == tagName) {
                this.record("type", this.locatorBuilders.buildAll(event.target), event.target.value);
            }
        }
        typeLock = 0;
});

Recorder.addEventHandler('type', 'input', function(event) {
    //console.log(event.target);
    typeTarget = event.target;
});

// © Jie-Lin You, SideeX Team
var preventClickTwice = false;
Recorder.addEventHandler('clickAt', 'click', function(event) {
    if (event.button == 0 && !preventClick && event.isTrusted) {
        if (!preventClickTwice) {
            var top = event.pageY,
                left = event.pageX;
            var element = event.target;
            do {
                top -= element.offsetTop;
                left -= element.offsetLeft;
                element = element.offsetParent;
            } while (element);
            var target = event.target;
            this.record("clickAt", this.locatorBuilders.buildAll(event.target), left + ',' + top);
            var arrayTest = this.locatorBuilders.buildAll(event.target);
            preventClickTwice = true;
        }
        setTimeout(function() { preventClickTwice = false; }, 30);
    }
}, true);
// END

// © Chen-Chieh Ping, SideeX Team
Recorder.addEventHandler('doubleClickAt', 'dblclick', function(event) {
    var top = event.pageY,
        left = event.pageX;
    var element = event.target;
    do {
        top -= element.offsetTop;
        left -= element.offsetLeft;
        element = element.offsetParent;
    } while (element);
    this.record("doubleClickAt", this.locatorBuilders.buildAll(event.target), left + ',' + top);
}, true);
// END

// © Chen-Chieh Ping, SideeX Team
var focusTarget = null;
var focusValue = null;
var tempValue = null;
var preventType = false;
var inp = document.getElementsByTagName("input");
for (var i = 0; i < inp.length; i++) {
    if (Recorder.inputTypes.indexOf(inp[i].type) >= 0) {
        inp[i].addEventListener("focus", function(event) {
            focusTarget = event.target;
            focusValue = focusTarget.value;
            tempValue = focusValue;
            preventType = false;
        });
        inp[i].addEventListener("blur", function(event) {
            focusTarget = null;
            focusValue = null;
            tempValue = null;
        });
    }
}
// END

// © Chen-Chieh Ping, SideeX Team
var preventClick = false;
var enterTarget = null;
var enterValue = null;
var tabCheck = null;
Recorder.addEventHandler('sendKeys', 'keydown', function(event) {
    if (event.target.tagName) {
        var key = event.keyCode;
        var tagName = event.target.tagName.toLowerCase();
        var type = event.target.type;
        if (tagName == 'input' && Recorder.inputTypes.indexOf(type) >= 0) {
            if (key == 13) {
                enterTarget = event.target;
                enterValue = enterTarget.value;
                var tempTarget = event.target.parentElement;
                var formChk = tempTarget.tagName.toLowerCase();
                //console.log(tempValue + " " + enterTarget.value + " " + tabCheck + " " + enterTarget + " " + focusValue);
                console.log(focusValue);
                console.log(enterTarget.value);
                if (tempValue == enterTarget.value && tabCheck == enterTarget) {
                    this.record("sendKeys", this.locatorBuilders.buildAll(enterTarget), "${KEY_ENTER}");
                    enterTarget = null;
                    preventType = true;
                } else if (focusValue == enterTarget.value) {
                    while (formChk != 'form' && formChk != 'body') {
                        tempTarget = tempTarget.parentElement;
                        formChk = tempTarget.tagName.toLowerCase();
                    }
                    if (formChk == 'form' && (tempTarget.hasAttribute("id") || tempTarget.hasAttribute("name")) && (!tempTarget.hasAttribute("onsubmit"))) {
                        if (tempTarget.hasAttribute("id"))
                            this.record("submit", [["id=" + tempTarget.id]], "");
                        else if (tempTarget.hasAttribute("name"))
                            this.record("submit", [["name=" + tempTarget.name]], "");
                    } else
                        this.record("sendKeys", this.locatorBuilders.buildAll(enterTarget), "${KEY_ENTER}");
                    enterTarget = null;
                }
                if (typeTarget.tagName && !preventType && (typeLock = 1)) {
                    // END
                        var tagName = typeTarget.tagName.toLowerCase();
                        var type = typeTarget.type;
                        if ('input' == tagName && Recorder.inputTypes.indexOf(type) >= 0) {
                            if (typeTarget.value.length > 0) {
                                this.record("type", this.locatorBuilders.buildAll(typeTarget), typeTarget.value);
                
                                // © Chen-Chieh Ping, SideeX Team
                                if (enterTarget != null) {
                                    var tempTarget = typeTarget.parentElement;
                                    var formChk = tempTarget.tagName.toLowerCase();
                                    while (formChk != 'form' && formChk != 'body') {
                                        tempTarget = tempTarget.parentElement;
                                        formChk = tempTarget.tagName.toLowerCase();
                                    }
                                    if (formChk == 'form' && (tempTarget.hasAttribute("id") || tempTarget.hasAttribute("name")) && (!tempTarget.hasAttribute("onsubmit"))) {
                                        if (tempTarget.hasAttribute("id"))
                                            this.record("submit", [
                                                ["id=" + tempTarget.id, "id"]
                                            ], "");
                                        else if (tempTarget.hasAttribute("name"))
                                            this.record("submit", [
                                                ["name=" + tempTarget.name, "name"]
                                            ], "");
                                    } else
                                        this.record("sendKeys", this.locatorBuilders.buildAll(enterTarget), "${KEY_ENTER}");
                                    enterTarget = null;
                                }
                                // END
                            } else {
                                this.record("type", this.locatorBuilders.buildAll(typeTarget), typeTarget.value);
                            }
                        } else if ('textarea' == tagName) {
                            this.record("type", this.locatorBuilders.buildAll(typeTarget), typeTarget.value);
                        }
                    }
                preventClick = true;
                setTimeout(function() {
                    preventClick = false;
                }, 500);
                setTimeout(function() {
                    if (enterValue != event.target.value) enterTarget = null;
                }, 50);
            }

            var tempbool = false;
            if ((key == 38 || key == 40) && event.target.value != '') {
                if (focusTarget != null && focusTarget.value != tempValue) {
                    tempbool = true;
                    tempValue = focusTarget.value;
                }
                if (tempbool) {
                    this.record("type", this.locatorBuilders.buildAll(event.target), tempValue);
                }

                setTimeout(function() {
                    tempValue = focusTarget.value;
                }, 250);

                if (key == 38) this.record("sendKeys", this.locatorBuilders.buildAll(event.target), "${KEY_UP}");
                else this.record("sendKeys", this.locatorBuilders.buildAll(event.target), "${KEY_DOWN}");
                tabCheck = event.target;
            }
            if (key == 9) {
                if (tabCheck == event.target) {
                    this.record("sendKeys", this.locatorBuilders.buildAll(event.target), "${KEY_TAB}");
                    preventType = true;
                }
            }
        }
    }
}, true);
// END

// © Shuo-Heng Shih, SideeX Team
Recorder.addEventHandler('dragAndDrop', 'mousedown', function(event) {
    var self = this;
    if (event.clientX < window.document.documentElement.clientWidth && event.clientY < window.document.documentElement.clientHeight) {
        this.mousedown = event;
        this.mouseup = setTimeout(function() {
            delete self.mousedown;
        }.bind(this), 200);

        this.selectMouseup = setTimeout(function() {
            self.selectMousedown = event;
        }.bind(this), 200);
    }
    this.mouseoverQ = [];

    if (event.target.nodeName) {
        var tagName = event.target.nodeName.toLowerCase();
        if ('option' == tagName) {
            var parent = event.target.parentNode;
            if (parent.multiple) {
                var options = parent.options;
                for (var i = 0; i < options.length; i++) {
                    options[i]._wasSelected = options[i].selected;
                }
            }
        }
    }
}, true);
// END

// © Shuo-Heng Shih, SideeX Team
Recorder.addEventHandler('dragAndDrop', 'mouseup', function(event) {
    clearTimeout(this.selectMouseup);
    if (this.selectMousedown) {
        var x = event.clientX - this.selectMousedown.clientX;
        var y = event.clientY - this.selectMousedown.clientY;

        function getSelectionText() {
            var text = "";
            var activeEl = window.document.activeElement;
            var activeElTagName = activeEl ? activeEl.tagName.toLowerCase() : null;
            if (activeElTagName == "textarea" || activeElTagName == "input") {
                text = activeEl.value.slice(activeEl.selectionStart, activeEl.selectionEnd);
            } else if (window.getSelection) {
                text = window.getSelection().toString();
            }
            return text.trim();
        }

        if (this.selectMousedown && event.button === 0 && (x + y) && (event.clientX < window.document.documentElement.clientWidth && event.clientY < window.document.documentElement.clientHeight) && getSelectionText() === '') {
            var sourceRelateX = this.selectMousedown.pageX - this.selectMousedown.target.getBoundingClientRect().left - window.scrollX;
            var sourceRelateY = this.selectMousedown.pageY - this.selectMousedown.target.getBoundingClientRect().top - window.scrollY;
            var targetRelateX, targetRelateY;
            if (!!this.mouseoverQ.length && this.mouseoverQ[1].relatedTarget == this.mouseoverQ[0].target && this.mouseoverQ[0].target == event.target) {
                targetRelateX = event.pageX - this.mouseoverQ[1].target.getBoundingClientRect().left - window.scrollX;
                targetRelateY = event.pageY - this.mouseoverQ[1].target.getBoundingClientRect().top - window.scrollY;
                this.record("mouseDownAt", this.locatorBuilders.buildAll(this.selectMousedown.target), sourceRelateX + ',' + sourceRelateY);
                this.record("mouseMoveAt", this.locatorBuilders.buildAll(this.mouseoverQ[1].target), targetRelateX + ',' + targetRelateY);
                this.record("mouseUpAt", this.locatorBuilders.buildAll(this.mouseoverQ[1].target), targetRelateX + ',' + targetRelateY);
            } else {
                targetRelateX = event.pageX - event.target.getBoundingClientRect().left - window.scrollX;
                targetRelateY = event.pageY - event.target.getBoundingClientRect().top - window.scrollY;
                this.record("mouseDownAt", this.locatorBuilders.buildAll(event.target), targetRelateX + ',' + targetRelateY);
                this.record("mouseMoveAt", this.locatorBuilders.buildAll(event.target), targetRelateX + ',' + targetRelateY);
                this.record("mouseUpAt", this.locatorBuilders.buildAll(event.target), targetRelateX + ',' + targetRelateY);
            }
        }
    } else {
        delete this.clickLocator;
        delete this.mouseup;
        var x = event.clientX - this.mousedown.clientX;
        var y = event.clientY - this.mousedown.clientY;

        if (this.mousedown && this.mousedown.target !== event.target && !(x + y)) {
            this.record("mouseDown", this.locatorBuilders.buildAll(this.mousedown.target), '');
            this.record("mouseUp", this.locatorBuilders.buildAll(event.target), '');
        } else if (this.mousedown && this.mousedown.target === event.target) {
            var self = this;
            var target = this.locatorBuilders.buildAll(this.mousedown.target);
            // setTimeout(function() {
            //     if (!self.clickLocator)
            //         this.record("click", target, '');
            // }.bind(this), 100);
        }

    }
    delete this.mousedown;
    delete this.selectMousedown;
    delete this.mouseoverQ;

}, true);
// END

// © Shuo-Heng Shih, SideeX Team
Recorder.addEventHandler('dragAndDropToObject', 'dragstart', function(event) {
    var self = this;
    this.dropLocator = setTimeout(function() {
        self.dragstartLocator = event;
    }.bind(this), 200);
}, true);
// END

// © Shuo-Heng Shih, SideeX Team
Recorder.addEventHandler('dragAndDropToObject', 'drop', function(event) {
    clearTimeout(this.dropLocator);
    if (this.dragstartLocator && event.button == 0 && this.dragstartLocator.target !== event.target) {
        //value no option
        this.record("dragAndDropToObject", this.locatorBuilders.buildAll(this.dragstartLocator.target), this.locatorBuilders.build(event.target));
    }
    delete this.dragstartLocator;
    delete this.selectMousedown;
}, true);
// END

// © Shuo-Heng Shih, SideeX Team
var prevTimeOut = null;
Recorder.addEventHandler('runScript', 'scroll', function(event) {
    if (pageLoaded === true) {
        var self = this;
        this.scrollDetector = event.target;
        clearTimeout(prevTimeOut);
        prevTimeOut = setTimeout(function() {
            delete self.scrollDetector;
        }.bind(self), 500);
    }
}, true);
// END

// © Shuo-Heng Shih, SideeX Team
var nowNode = 0;
Recorder.addEventHandler('mouseOver', 'mouseover', function(event) {
    if (window.document.documentElement)
        nowNode = window.document.documentElement.getElementsByTagName('*').length;
    var self = this;
    if (pageLoaded === true) {
        var clickable = this.findClickableElement(event.target);
        if (clickable) {
            this.nodeInsertedLocator = event.target;
            setTimeout(function() {
                delete self.nodeInsertedLocator;
            }.bind(self), 500);

            this.nodeAttrChange = this.locatorBuilders.buildAll(event.target);
            this.nodeAttrChangeTimeout = setTimeout(function() {
                delete self.nodeAttrChange;
            }.bind(self), 10);
        }
        //drop target overlapping
        if (this.mouseoverQ) //mouse keep down
        {
            if (this.mouseoverQ.length >= 3)
                this.mouseoverQ.shift();
            this.mouseoverQ.push(event);
        }
    }
}, true);
// END

// © Shuo-Heng Shih, SideeX Team
Recorder.addEventHandler('mouseOut', 'mouseout', function(event) {
    if (this.mouseoutLocator !== null && event.target === this.mouseoutLocator) {
        this.record("mouseOut", this.locatorBuilders.buildAll(event.target), '');
    }
    delete this.mouseoutLocator;
}, true);
// END

// © Shuo-Heng Shih, SideeX Team
Recorder.addEventHandler('mouseOver', 'DOMNodeInserted', function(event) {
    if (pageLoaded === true && window.document.documentElement.getElementsByTagName('*').length > nowNode) {
        var self = this;
        if (this.scrollDetector) {
            //TODO: fix target
            this.record("runScript", [
                [
                    ["window.scrollTo(0," + window.scrollY + ")", ]
                ]
            ], '');
            pageLoaded = false;
            setTimeout(function() {
                pageLoaded = true;
            }.bind(self), 550);
            delete this.scrollDetector;
            delete this.nodeInsertedLocator;
        }
        if (this.nodeInsertedLocator) {
            this.record("mouseOver", this.locatorBuilders.buildAll(this.nodeInsertedLocator), '');
            this.mouseoutLocator = this.nodeInsertedLocator;
            delete this.nodeInsertedLocator;
            delete this.mouseoverLocator;
        }
    }
}, true);
// END

// © Shuo-Heng Shih, SideeX Team
var readyTimeOut = null;
var pageLoaded = true;
Recorder.addEventHandler('checkPageLoaded', 'readystatechange', function(event) {
    var self = this;
    if (window.document.readyState === 'loading') {
        pageLoaded = false;
    } else {
        pageLoaded = false;
        clearTimeout(readyTimeOut);
        readyTimeOut = setTimeout(function() {
            pageLoaded = true;
        }.bind(self), 1500); //setReady after complete 1.5s
    }
}, true);
// END

// © Ming-Hung Hsu, SideeX Team
Recorder.addEventHandler('contextMenu', 'contextmenu', function(event) {
    var myPort = browser.runtime.connect();
    var tmpText = this.locatorBuilders.buildAll(event.target);
    var tmpVal = getText(event.target);
    var tmpTitle = normalizeSpaces(event.target.ownerDocument.title);
    var self = this;
    myPort.onMessage.addListener(function portListener(m) {
        if (m.cmd.includes("Text")) {
            self.record(m.cmd, tmpText, tmpVal);
        } else if (m.cmd.includes("Title")) {
            self.record(m.cmd, [[tmpTitle]], '');
        } else if (m.cmd.includes("Value")) {
            self.record(m.cmd, tmpText, getInputValue(event.target));
        }
        myPort.onMessage.removeListener(portListener);
    });
}, true);
// END

// © Yun-Wen Lin, SideeX Team
var getEle;
var checkFocus = 0;
Recorder.addEventHandler('editContent', 'focus', function(event) {
    var editable = event.target.contentEditable;
    if (editable == 'true') {
        getEle = event.target;
        contentTest = getEle.innerHTML;
        checkFocus = 1;
    }
}, true);
// END

// © Yun-Wen Lin, SideeX Team
Recorder.addEventHandler('editContent', 'blur', function(event) {
    if (checkFocus == 1) {
        if (event.target == getEle) {
            if (getEle.innerHTML != contentTest) {
                this.record("editContent", this.locatorBuilders.buildAll(event.target), getEle.innerHTML);
            }
            checkFocus = 0;
        }
    }
}, true);
// END

browser.runtime.sendMessage({
    attachRecorderRequest: true
}).catch(function(reason){
    // Failed silently if receiveing end does not exist
});

// Copyright 2005 Shinya Kasatani
Recorder.prototype.getOptionLocator = function(option) {
    var label = option.text.replace(/^ *(.*?) *$/, "$1");
    if (label.match(/\xA0/)) { // if the text contains &nbsp;
        return "label=regexp:" + label.replace(/[\(\)\[\]\\\^\$\*\+\?\.\|\{\}]/g, function(str) {
                return '\\' + str
            })
            .replace(/\s+/g, function(str) {
                if (str.match(/\xA0/)) {
                    if (str.length > 1) {
                        return "\\s+";
                    } else {
                        return "\\s";
                    }
                } else {
                    return str;
                }
            });
    } else {
        return "label=" + label;
    }
};

Recorder.prototype.findClickableElement = function(e) {
    if (!e.tagName) return null;
    var tagName = e.tagName.toLowerCase();
    var type = e.type;
    if (e.hasAttribute("onclick") || e.hasAttribute("href") || tagName == "button" ||
        (tagName == "input" &&
            (type == "submit" || type == "button" || type == "image" || type == "radio" || type == "checkbox" || type == "reset"))) {
        return e;
    } else {
        if (e.parentNode != null) {
            return this.findClickableElement(e.parentNode);
        } else {
            return null;
        }
    }
};

//select / addSelect / removeSelect
Recorder.addEventHandler('select', 'focus', function(event) {
    if (event.target.nodeName) {
        var tagName = event.target.nodeName.toLowerCase();
        if ('select' == tagName && event.target.multiple) {
            var options = event.target.options;
            for (var i = 0; i < options.length; i++) {
                if (options[i]._wasSelected == null) {
                    // is the focus was gained by mousedown event, _wasSelected would be already set
                    options[i]._wasSelected = options[i].selected;
                }
            }
        }
    }
}, true);

Recorder.addEventHandler('select', 'change', function(event) {
    if (event.target.tagName) {
        var tagName = event.target.tagName.toLowerCase();
        if ('select' == tagName) {
            if (!event.target.multiple) {
                var option = event.target.options[event.target.selectedIndex];
                this.record("select", this.locatorBuilders.buildAll(event.target), this.getOptionLocator(option));
            } else {
                var options = event.target.options;
                for (var i = 0; i < options.length; i++) {
                    if (options[i]._wasSelected == null) {}
                    if (options[i]._wasSelected != options[i].selected) {
                        var value = this.getOptionLocator(options[i]);
                        if (options[i].selected) {
                            this.record("addSelection", this.locatorBuilders.buildAll(event.target), value);
                        } else {
                            this.record("removeSelection", this.locatorBuilders.buildAll(event.target), value);
                        }
                        options[i]._wasSelected = options[i].selected;
                    }
                }
            }
        }
    }
});
