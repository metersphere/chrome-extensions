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
class Log {

    constructor(container) {
        this.container = container;
    }

    log(str) {
        this._write(str, "log-info");
    }

    info(str) {
        this._write("[info] " + str, "log-info");
    }

    error(str) {
        this._write("[error] " + str, "log-error");
    };

    _write(str, className) {
        let textElement = document.createElement('h4');
        textElement.setAttribute("class", className);
        textElement.textContent = str;
        this.container.appendChild(textElement);
        this.container.scrollIntoView(false);
    }
}

// TODO: new by another object(s)
var sideex_log = new Log(document.getElementById("logcontainer"));
var help_log = new Log(document.getElementById("refercontainer"));

document.getElementById("clear-log").addEventListener("click", function() {
    emptyNode(document.getElementById("logcontainer"));
}, false);
