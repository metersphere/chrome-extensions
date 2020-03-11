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

var olderTestSuiteResult = undefined;
var olderTestSuiteFile = undefined;

function fileToPanel(f) {
    // set records
    var output = f.match(/<tbody>[\s\S]+?<\/tbody>/);
    if (!output) {
        return null;
    }
    output = output[0]
        .replace(/<tbody>/, "")
        .replace(/<\/tbody>/, "");
    var tr = output.match(/<tr>[\s\S]*?<\/tr>/gi);
    output = "";
    if (tr)
        for (var i = 0; i < tr.length; ++i) {
            pattern = tr[i].match(/(?:<tr>)([\s]*?)(?:<td>)([\s\S]*?)(?:<\/td>)([\s]*?)(?:<td>)([\s\S]*?)(?:<datalist>)([\s\S]*?)(?:<\/datalist>([\s]*?)<\/td>)([\s]*?)(?:<td>)([\s\S]*?)(?:<\/td>)([\s]*?)(?:<\/tr>)/);
            
            var new_tr = '<tr>' + pattern[1] + '<td><div style="display: none;">' + pattern[2] + '</div><div style="overflow:hidden;height:15px;"></div></td>' + pattern[3] + '<td><div style="display: none;">' + pattern[4] +
                '</div><div style="overflow:hidden;height:15px;"></div>\n        ' + '<datalist>' + pattern[5] + '</datalist>' + pattern[6] + '</td>' +
                pattern[7] + '<td><div style="display: none;">' + pattern[8] + '</div><div style="overflow:hidden;height:15px;"></div></td>' + pattern[9] + '</tr>';

            output = output + new_tr + "\n";

        }
    output = '<input id="records-count" value="' + ((!tr) ? 0 : tr.length) + '" type="hidden">' + output;
    return output;
}

function readCase(f) {
    var grid_content = fileToPanel(f);
    if (grid_content) {
        clean_panel();
        document.getElementById("records-grid").innerHTML = escapeHTML(grid_content);

        var count = getRecordsNum();
        if (count !== '0') {
            reAssignId("records-1", "records-" + count);
            var r = getRecordsArray();
            for (var i = 1; i <= count; ++i) {
                // do not forget that textNode is a childNode
                for (var j = 0; j < 3; ++j) {
                    var node = document.getElementById("records-" + i).getElementsByTagName("td")[j];
                    var adjust = unescapeHtml(node.childNodes[0].innerHTML);
                    node.childNodes[1].appendChild(document.createTextNode(adjust));
                }
            }
            attachEvent(1, count);
        }
    } else {
        clean_panel();
        // document.getElementById("records-grid").innerHTML = "";
    }

    // append on test grid
    var id = "case" + sideex_testCase.count;
    sideex_testCase.count++;
    var records = document.getElementById("records-grid").innerHTML;
    var case_title = f.match(/(?:<thead>[\s\S]*?<td rowspan="1" colspan="3">)([\s\S]*?)(?:<\/td>)/)[1];
    sideex_testCase[id] = {
        records: records,
        title: case_title
    };
    addTestCase(case_title, id);
}

function readSuite(f) {
    var reader = new FileReader();
    if (!f.name.includes("htm")) return;
    reader.readAsText(f);

    reader.onload = function(event) {
        var test_suite = reader.result;
        // check for input file version
        // if it is not SideeX2, transforming it
        if (!checkIsVersion2(test_suite)) {
            if (test_suite.search("<table") > 0 && test_suite.search("<datalist>") < 0) {
                // TODO: write a non-blocked confirm window
                // confrim user if want to transform input file for loading it
                let result = window.confirm("\"" + f.name + "\" is of the format of an early version of Selenium IDE. Some commands may not work. Do you still want to open it?");
                if (!result) {
                    return;
                }
                // parse for testCase or testSuite
                if (checkIsTestSuite(test_suite)) {
                    // alert("Sorry, we do not support test suite of the format of an early version of Selenium IDE now.");
                    olderTestSuiteResult = test_suite.substring(0, test_suite.indexOf("<table")) + test_suite.substring(test_suite.indexOf("</body>"));
                    olderTestSuiteFile = f;
                    loadCaseIntoSuite(test_suite);
                    return;
                } else {
                    test_suite = transformVersion(test_suite);
                }
            }
            // some early version of SideeX2 without <meta>
            test_suite = addMeta(test_suite);
        }

        // append on test grid
        appendTestSuite(f, test_suite);
        return;
        // set up some veraible for recording after loading
    };
    reader.onerror = function(e) {
        console.log("Error", e);
    };
}

document.getElementById("load-testSuite-hidden").addEventListener("change", function(event) {
    event.stopPropagation();
    for (var i = 0; i < this.files.length; i++) {
        readSuite(this.files[i]);
    }
    this.value = null;
}, false);

document.getElementById("load-testSuite-show").addEventListener("click", function(event) {
    event.stopPropagation();
    document.getElementById('load-testSuite-hidden').click();
}, false);

document.getElementById("load-testSuite-show-menu").addEventListener("click", function(event) {
    event.stopPropagation();
    document.getElementById('load-testSuite-hidden').click();
}, false);

$(document).ready(function() {

    $("#testCase-container").on('drag dragstart dragend dragover dragenter dragleave drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
    })
    .on('dragover dragenter', function() {
        $("#testCase-container").addClass('is-dragover');
    })
    .on('dragleave dragend drop', function() {
        $("#testCase-container").removeClass('is-dragover');
    })
    .on('drop', function(e) {
        let droppedFiles = e.originalEvent.dataTransfer.files;
        let droppedFilesLength = droppedFiles.length;
        for (var i = 0; i < droppedFilesLength; i++) {
            readSuite(droppedFiles[i]);
        }
    });

});