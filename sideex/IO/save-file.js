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
var background = chrome.extension.getBackgroundPage();
var jRecorder = background.getRecorder({});

function saveNewTarget() {
    var records = getRecordsArray();
    for (var i = 0; i < records.length; ++i) {
        var datalist = records[i].getElementsByTagName("datalist")[0];
        var options = datalist.getElementsByTagName("option");
        var target = getCommandTarget(records[i]);

        if (options.length == 1 && options[0].innerHTML == "") {
            options[0].innerHTML = escapeHTML(target);
        } else { // check whether it is new target
            var new_target = 1;
            for (var j = 0; j < options.length; ++j) {
                if (unescapeHtml(options[j].innerHTML) == target) {
                    new_target = 0;
                    break;
                }
            }

            if (new_target) {
                var new_option = document.createElement("option");
                new_option.innerHTML = escapeHTML(target);
                datalist.appendChild(new_option);
                var x = document.createTextNode("\n        ");
                datalist.appendChild(x);
            }
        }
    }
}

function panelToJSON(str) {
    if (!str) {
        return null;
    }
    str = str.replace(/<div style="overflow[\s\S]+?">[\s\S]*?<\/div>/gi, "")
        .replace(/<div style="display[\s\S]+?">/gi, "")
        .replace(/<\/div>/gi, "")
        .replace(/<input[\s\S]+?>/, "")
        .replace(/<tr[\s\S]+?>/gi, "<tr>");

    var tr = str.match(/<tr>[\s\S]*?<\/tr>/gi);
    temp_str = str;
    str = "\n";
    if (tr)
        for (var i = 0; i < tr.length; ++i) {
            var pattern = tr[i].match(/([\s]*?)(?:<td[\b\s\S]*>)([\s\S]*?)(?:<\/td>)([\s]*?)(?:<td>)([\s\S]*?)(?:<datalist>)([\s\S]*?)(?:<\/datalist><\/td>)([\s]*?)(?:<td>)([\s\S]*?)(?:<\/td>)/);
            if (!pattern) {
                str = temp_str;
                break;
            }

            var option = pattern[5].match(/<option>[\s\S]*?<\/option>/gi);

            str = str + '\n\t\t\t{"command":"' + pattern[1].trim() + pattern[2].trim() + '", "arg":"' + pattern[3].trim() + '", "target":"' + pattern[4].replace(/\n\s+/g, "").trim().replace("\n", "\\n") + ' ", "datalist":[';
            for (var j = 0; j < option.length; ++j) {
                option[j] = option[j].replace(/<option>/, "").replace(/<\/option>/, "");
                str = str.trim() + '"' + option[j].trim().replace("\n", "\\n") + '"';
                if (j < (option.length - 1)) {
                    str += ","
                }
            }
            str = str.trim() + "]" + pattern[6].trim() + ' , "value":"' + pattern[7] + '"}';
            if (i < (tr.length - 1)) {
                str += ","
            }
        }
    str = '' + str + '';
    return str;
}

function panelToFile(str) {
    if (!str) {
        return null;
    }
    str = str.replace(/<div style="overflow[\s\S]+?">[\s\S]*?<\/div>/gi, "")
        .replace(/<div style="display[\s\S]+?">/gi, "")
        .replace(/<\/div>/gi, "")
        .replace(/<input[\s\S]+?>/, "")
        .replace(/<tr[\s\S]+?>/gi, "<tr>");

    var tr = str.match(/<tr>[\s\S]*?<\/tr>/gi);
    temp_str = str;
    str = "\n";
    if (tr)
        for (var i = 0; i < tr.length; ++i) {
            var pattern = tr[i].match(/([\s]*?)(?:<td[\b\s\S]*>)([\s\S]*?)(?:<\/td>)([\s]*?)(?:<td>)([\s\S]*?)(?:<datalist>)([\s\S]*?)(?:<\/datalist><\/td>)([\s]*?)(?:<td>)([\s\S]*?)(?:<\/td>)/);
            if (!pattern) {
                str = temp_str;
                break;
            }

            var option = pattern[5].match(/<option>[\s\S]*?<\/option>/gi);

            str = str + "<tr>" + pattern[1] + "<td>" + pattern[2] + "</td>" + pattern[3] + "<td>" + pattern[4].replace(/\n\s+/g, "") + "<datalist>";
            for (var j = 0; j < option.length; ++j) {
                option[j] = option[j].replace(/<option>/, "").replace(/<\/option>/, "");
                str = str + "<option>" + option[j] + "</option>";
            }
            str = str + "</datalist></td>" + pattern[6] + "<td>" + pattern[7] + "</td>\n</tr>\n";
        }
    str = '<tbody>' + str + '</tbody>';
    return str;
}

var textFile = null,
    makeTextFile = function (text) {
        var data = new Blob([text], {
            type: 'text/plain'
        });
        // If we are replacing a previously generated file we need to
        // manually revoke the object URL to avoid memory leaks.
        if (textFile !== null) {
            window.URL.revokeObjectURL(textFile);
        }
        textFile = window.URL.createObjectURL(data);
        return textFile;
    };

function downloadFile(file_name, data) {
    var fakelink = $('<a>Download</a>');
    fakelink.attr('download', file_name);
    fakelink.attr('href', data);
    fakelink[0].click();
    fakelink.remove();
}

function downloadSuite(s_suite, callback) {
    if (s_suite) {
        var cases = s_suite.getElementsByTagName("p"),
            output = "",
            old_case = getSelectedCase();
        for (var i = 0; i < cases.length; ++i) {
            setSelectedCase(cases[i].id);
            saveNewTarget();
            output = output +
                '<table cellpadding="1" cellspacing="1" border="1">\n<thead>\n<tr><td rowspan="1" colspan="3">' +
                sideex_testCase[cases[i].id].title +
                '</td></tr>\n</thead>\n' +
                panelToFile(document.getElementById("records-grid").innerHTML) +
                '</table>\n';
        }
        output = '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" ' +
            'http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">\n<html xmlns="http://www.w3.org/1999/xhtml" xml:' +
            'lang="en" lang="en">\n<head>\n\t<meta content="text/html; charset=UTF-8" http-equiv="content-type" />\n\t<title>' +
            sideex_testSuite[s_suite.id].title +
            '</title>\n</head>\n<body>\n' +
            output +
            '</body>\n</html>';

        if (old_case) {
            setSelectedCase(old_case.id);
        } else {
            setSelectedSuite(s_suite.id);
        }

        var f_name = sideex_testSuite[s_suite.id].file_name + ".yaml",
            link = makeTextFile(output);

        downloadFile(f_name, link);
    } else {
        alert("Choose a test suite to download!");
    }
}

function getSuiteJSON(s_suite) {
    var cases = s_suite.getElementsByTagName("p"),
        output = "",
        old_case = getSelectedCase();
    for (var i = 0; i < cases.length; ++i) {
        setSelectedCase(cases[i].id);
        saveNewTarget();
        if (i > 0) {
            output += ",";
        }
        output = output +
            '{"testStep":"' +
            sideex_testCase[cases[i].id].title +
            '", \n\t\t "commands": [\n\t\t\t' +
            panelToJSON(document.getElementById("records-grid").innerHTML) +
            '\n\t\t\t]}\n';
    }
    output = '{\n\t "suite":"' +
        sideex_testSuite[s_suite.id].title +
        '",\n\t "test_cases":[\n\t\t' +
        output +
        ']}';

    if (old_case) {
        setSelectedCase(old_case.id);
    } else {
        setSelectedSuite(s_suite.id);
    }
    suite_name = sideex_testSuite[s_suite.id].file_name.replace(".html", "");

    return {suite_name: suite_name, output: output};
}

function downloadSuiteJSON(s_suite, callback) {
    if (s_suite) {
        var suite_json = getSuiteJSON(s_suite);
        var f_name = suite_json.suite_name + ".json",
            link = makeTextFile(suite_json.output);

        downloadFile(f_name, link);
    } else {
        alert("Choose a test suite to download!");
    }
}

function ln(line) {
    return "\n" + line;
}

async function downloadSuiteScript(s_suite, { language = 'yaml', fileFormat }) {
    if (s_suite && language === 'yaml') {
        chrome.storage.local.get(null, function (items) {
            const extended = items && items.features && items.features.ard;
            background.getSuiteYAML(s_suite, extended).then(output => {
                var fileName = background.getNameSeleniumFile();
                const link = makeTextFile(output);
                downloadFile(fileName, link);
            });
        });
    }
    else if (s_suite) {
        const output = await background.generateScriptOutput(s_suite, language);
        const fileName = background.getNameSeleniumFile(fileFormat, language);
        const link = makeTextFile(output);
            downloadFile(fileName, link);
    } else {
        alert("Choose a test suite to download!");
    }
}


function getDateFormatted() {
    var d = new Date();
    var day = d.getDay();
    var hr = d.getHours();
    var min = d.getMinutes();
    var sec = d.getSeconds();
    var ms = d.getMilliseconds();
    var date = d.getDate();
    var month = d.getMonth();
    var year = d.getFullYear();

    if (day < 10) {
        day = '0' + day;
    }

    if (ms < 1000) {
        ms = '0' + ms;
    }
    if (month < 10) {
        month = '0' + month;
    }
    var timebm = year + "_" + month + "_" + day + "_" + hr + "_" + min + "_" + sec + "_" + ms + "00" + "_" + "0000";
    return timebm;
}

function loadJSON(path, success, error) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                if (success)
                    success(JSON.parse(xhr.responseText));
            } else {
                if (error)
                    error(xhr);
            }
        }
    };
    xhr.open("GET", path, true);
    xhr.send();
}
