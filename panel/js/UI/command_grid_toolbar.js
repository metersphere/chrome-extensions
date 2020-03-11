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

$("#command-command").on("input", function(event) {
    var temp = getSelectedRecord();
    if (temp) {
        var div = getTdRealValueNode(document.getElementById(temp), 0);
        // set innerHTML = ""
        if (div.childNodes && div.childNodes[0]) {
            div.removeChild(div.childNodes[0]);
        }
        div.appendChild(document.createTextNode(event.target.value));

        var command_command = event.target.value;
        div = getTdShowValueNode(document.getElementById(temp), 0);
        if (div.childNodes && div.childNodes[0]) {
            div.removeChild(div.childNodes[0]);
        }
        div.appendChild(document.createTextNode(command_command));

        // store command grid to testCase
        var s_case = getSelectedCase();
        if (s_case) {
            sideex_testCase[s_case.id].records = document.getElementById("records-grid").innerHTML;
			modifyCaseSuite();		
        }
    }
});

$("#command-target").on("input", function(event) {
    var temp = getSelectedRecord();
    if (temp) {
        var div = getTdRealValueNode(document.getElementById(temp), 1);
        // Check hidden value and target value
        if (!(div.childNodes[0].textContent.includes("d-XPath") && event.target.value.includes("tac"))) {
            var real_command_target = event.target.value;
            if (real_command_target == "auto-located-by-tac") {
                // Real tac value is hidden
                var real_tac = getTargetDatalist(document.getElementById(temp)).options[0].text;
                if (real_tac == "") real_tac = "auto-located-by-tac";
                real_command_target = real_tac;
            }
            if (div.childNodes && div.childNodes[0]) {
                div.removeChild(div.childNodes[0]);
            }
            div.appendChild(document.createTextNode(real_command_target));

            var command_target = event.target.value;
            div = getTdShowValueNode(document.getElementById(temp), 1); 
            if (command_target.includes("tac")) {
                command_target = "auto-located-by-tac";
            }
            if (div.childNodes && div.childNodes[0]) {
                div.removeChild(div.childNodes[0]);
            }
            div.appendChild(document.createTextNode(command_target));
            let datalist = getTargetDatalist(document.getElementById(temp));
        }

        // store command grid to testCase
        var s_case = getSelectedCase();
        if (s_case) {
            sideex_testCase[s_case.id].records = document.getElementById("records-grid").innerHTML;
			modifyCaseSuite();
        }
    }
});

$("#command-value").on("input", function(event) {
    var temp = getSelectedRecord();
    if (temp) {
        var div = getTdRealValueNode(document.getElementById(temp), 2);
        // set innerHTML = ""
        if (div.childNodes && div.childNodes[0]) {
            div.removeChild(div.childNodes[0]);
        }
        div.appendChild(document.createTextNode(event.target.value));

        var command_value = event.target.value;
        div = getTdShowValueNode(document.getElementById(temp), 2);
        if (div.childNodes && div.childNodes[0]) {
            div.removeChild(div.childNodes[0]);
        }
        div.appendChild(document.createTextNode(command_value));

        // store command grid to testCase
        var s_case = getSelectedCase();
        if (s_case) {
            sideex_testCase[s_case.id].records = document.getElementById("records-grid").innerHTML;
			modifyCaseSuite();
        }
    }
});
