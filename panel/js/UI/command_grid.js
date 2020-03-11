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

// get <tr> array
function getRecordsArray() {
    return document.getElementById("records-grid").getElementsByTagName("tr");
}

function getTdRealValueNode(node, index) {
    return node.getElementsByTagName("td")[index].getElementsByTagName("div")[0];
}

function getTdShowValueNode(node, index) {
    return node.getElementsByTagName("td")[index].getElementsByTagName("div")[1];
}

function getTargetDatalist(node) {
    return node.getElementsByTagName("td")[1].getElementsByTagName("datalist")[0];
}

function getCommandName(tr, for_show) {
    if (for_show) {
        return getTdShowValueNode(tr, 0).textContent;
    }
    return getTdRealValueNode(tr, 0).textContent;
}

function getCommandTarget(tr, for_show) {
    if (for_show) {
        return getTdShowValueNode(tr, 1).textContent;
    }
    return getTdRealValueNode(tr, 1).textContent;
}

function getCommandValue(tr, for_show) {
    if (for_show) {
        return getTdShowValueNode(tr, 2).textContent;
    }
    return getTdRealValueNode(tr, 2).textContent;
}

function getRecordsNum() {
    return document.getElementById("records-count").value;
}

function setColor(index, state) {
    if (typeof(index) == "string") {
        $("#" + index).addClass(state);
    } else {
        var node = document.getElementById("records-" + index);
        node.className = state;
        setRecordScrollTop(node);
    }
}

function setRecordScrollTop(record) {
    if ($(".smallSection").scrollTop() > record.offsetTop - 65)
        $(".smallSection").animate({
            scrollTop: record.offsetTop - 65
        }, 200);
    else if ($(".smallSection").height() + $(".smallSection").scrollTop() - 55 < record.offsetTop)
        $(".smallSection").animate({
            scrollTop: record.offsetTop - ($(".smallSection").height() - 55)
        }, 200);
}

function setCaseScrollTop(testCase) {
    if ($(".case_list").scrollTop() > testCase.offsetTop - 143)
        $(".case_list").animate({
            scrollTop: testCase.offsetTop - 143
        }, 200);
    else if ($(".case_list").height() + $(".case_list").scrollTop() - 60 < testCase.offsetTop - $(".case_list").offset().top)
        $(".case_list").animate({
            scrollTop: testCase.offsetTop - $(".case_list").offset().top - ($(".case_list").height() - 60)
        }, 600);
}

// according to "ID" to set odd/even class
function classifyRecords(start, end) {
    var i = start,
        node;
    try {
        if (i % 2 == 1) {
            while (i <= end) {
                node = document.getElementById("records-" + i);
                if (!node.className || node.className == "odd" || node.className == "even") {
                    node.className = "odd";
                }
                i = parseInt(i) + 1;
                node = document.getElementById("records-" + i);
                if (!node.className || node.className == "odd" || node.className == "even") {
                    node.className = "even";
                }
                i = parseInt(i) + 1;
            }
        } else {
            while (i <= end) {
                node = document.getElementById("records-" + i);
                if (!node.className || node.className == "odd" || node.className == "even") {
                    node.className = "even";
                }
                i = parseInt(i) + 1;
                node = document.getElementById("records-" + i);
                if (!node.className || node.className == "odd" || node.className == "even") {
                    node.className = "odd";
                }
                i = parseInt(i) + 1;
            }
        }
    } catch (e) {}

    // document.getElementById("records-" + getRecordsNum()).style.borderBottom = "green solid 2px";
}

// according to <tr> array's "order" to reassign id
function reAssignId(start, end) {
    var records = getRecordsArray();
    start = parseInt(start.split("-")[1]);
    end = parseInt(end.split("-")[1]);
    var len = end - start,
        i;

    if (len > 0) {
        records[end - 1].id = "records-" + end;
        for (i = start; i < start + len; ++i) {
            records[i - 1].id = "records-" + i;
        }
        classifyRecords(start, end);
    } else if (len < 0) {
        records[end].id = "records-" + (end + 1);
        len *= -1;
        for (i = end + 1; i < end + len; ++i) {
            records[i].id = "records-" + (i + 1);
        }
        classifyRecords(end, start);
    } else {
        records[start - 1].id = "records-" + start;
        classifyRecords(start, end);
    }
}

// attach event on <tr> (records)
var firstSelectedTrId = undefined;
function attachEvent(start, end) {
    for (var i = start; i <= end; ++i) {
        var node = document.getElementById("records-" + i);

        // sometimes target will be <td> or <tr>        
        // click
        node.addEventListener("click", function(event) {
            // use jquery's API to add and remove class property
            if (firstSelectedTrId == undefined && $(".selectedRecord").length>0) {
                firstSelectedTrId = parseInt($(".selectedRecord")[0].id.substring(8));
            }

            if (!event.ctrlKey && !event.shiftKey) {
                $('#records-grid .selectedRecord').removeClass('selectedRecord');
                firstSelectedTrId = undefined;
            }

            if (event.shiftKey) {
                if (firstSelectedTrId != undefined) {
                    let thisSelectedTrId = parseInt($(this)[0].id.substring(8));
                    $('#records-grid .selectedRecord').removeClass('selectedRecord');
                    if (firstSelectedTrId < thisSelectedTrId) {
                        for (let i=firstSelectedTrId ; i<thisSelectedTrId ; i++) {
                            $("#records-" + i).addClass("selectedRecord");
                        }

                    } else {
                        for (let i=firstSelectedTrId ; i>thisSelectedTrId ; i--) {
                            $("#records-" + i).addClass("selectedRecord");
                        }
                    }
                }
            }
            $(".record-bottom").removeClass("active");
            $(this).addClass('selectedRecord');

            // show on grid toolbar
            // var ref = event.target.parentNode;
            // if (ref.tagName != "TR") {
            //     ref = ref.parentNode;
            // }
            var ref = event.target;
            while (ref.tagName.toLowerCase() != "tr") {
                ref = ref.parentNode;
            }

            // notice that "textNode" also is a node
            document.getElementById("command-command").value = getCommandName(ref);
            scrape(document.getElementById("command-command").value);
            document.getElementById("command-target").value = getCommandTarget(ref, true);
            var targetList = ref.getElementsByTagName("td")[1].getElementsByTagName("datalist")[0].cloneNode(true);
            if (targetList.options[0].text.includes("d-XPath")) {
                targetList.options[0].text = "auto-located-by-tac";
            }
            assignChildNodes(document.getElementById("target-dropdown"), targetList, false);
            assignChildNodes(document.getElementById("command-target-list"), ref.getElementsByTagName("td")[1].getElementsByTagName("datalist")[0], true, true);
            document.getElementById("command-value").value = getCommandValue(ref);
        }, false);

        // right click
        node.addEventListener("contextmenu", function(event) {
            // use jquery's API to add and remove class property
            $('#records-grid .selectedRecord').removeClass('selectedRecord');
            $(".record-bottom").removeClass("active");
            $(this).addClass('selectedRecord');

            // show on grid toolbar
            var ref = event.target.parentNode;
            if (ref.tagName != "TR") {
                ref = ref.parentNode;
            }

            // notice that "textNode" also is a node
            document.getElementById("command-command").value = getCommandName(ref);
            scrape(document.getElementById("command-command").value);
            document.getElementById("command-target").value = getCommandTarget(ref, true);
            var targetList = ref.getElementsByTagName("td")[1].getElementsByTagName("datalist")[0].cloneNode(true);
            if (targetList.options[0].text.includes("d-XPath")) {
                targetList.options[0].text = "auto-located-by-tac";
            }
            assignChildNodes(document.getElementById("target-dropdown"), targetList, false);
            assignChildNodes(document.getElementById("command-target-list"), ref.getElementsByTagName("td")[1].getElementsByTagName("datalist")[0], true, true);
            document.getElementById("command-value").value = getCommandValue(ref);
        }, false);
    }
}

// "delete" command is different from add and reorder
function reAssignIdForDelete(delete_ID, count) {
    var records = getRecordsArray();
    for (var i = delete_ID - 1; i < count; ++i) {
        records[i].id = "records-" + (i + 1);
    }
    classifyRecords(delete_ID, count);
}

function getSelectedCase() {
    if (document.getElementById("testCase-grid").getElementsByClassName("selectedCase")) {
        return document.getElementById("testCase-grid").getElementsByClassName("selectedCase")[0];
    } else {
        return null;
    }
}

function getSelectedRecord() {
    var selectedNode = document.getElementById("records-grid")
        .getElementsByClassName("selectedRecord");
    if (selectedNode.length) {
        return selectedNode[0].id;
    } else {
        return "";
    }
}

function getSelectedRecords() {
    var selectedNode = document.getElementById("records-grid").getElementsByClassName("selectedRecord");
    if (selectedNode.length) {
        return selectedNode;
    } else {
        return "";
    }
}

function addCommand(command_name, command_target_array, command_value, auto, insertCommand) {
    // create default test suite and case if necessary
    var s_suite = getSelectedSuite(),
        s_case = getSelectedCase();
    if (!s_suite || !s_case) {
        var id = "case" + sideex_testCase.count;
        sideex_testCase.count++;
        addTestCase("Untitled Test Case", id);
    }

    // mark modified
    modifyCaseSuite();
    closeConfirm(true);
    
    // create tr node     
    var new_record = document.createElement("tr");
    new_record.setAttribute("class", "");
    new_record.setAttribute("style", "");

    // create td node
    for (var i = 0; i < 3; ++i) {
        var td = document.createElement("td");
        var div_show = document.createElement("div");
        var div_hidden = document.createElement("div");
        div_show.style = "overflow:hidden;height:15px;";
        div_hidden.style = "display:none;";
        new_record.appendChild(td);
        if (i == 0) {
            div_hidden.appendChild(document.createTextNode(command_name));
        } else if (i == 1) {
            // use textNode to avoid tac's tag problem (textNode's content will be pure text, does not be parsed as html)
            div_hidden.appendChild(document.createTextNode(command_target_array[0][0]));
        } else {
            div_hidden.appendChild(document.createTextNode(command_value));
        }
        td.appendChild(div_hidden);
        td.appendChild(div_show);
    }

    // append datalist to target
    var targets = document.createElement("datalist");
    for (var m = 0; m < command_target_array.length; ++m) {
        var option = document.createElement("option");
        // use textNode to avoid tac's tag problem (textNode's content will be pure text, does not be parsed as html)
        option.appendChild(document.createTextNode(command_target_array[m][0]));
        option.text=command_target_array[m][0];
        targets.appendChild(option);
    }
    new_record.getElementsByTagName("td")[1].appendChild(targets);

    // var selected_ID = getSelectedRecord();
    // NOTE: change new API for get selected records
    var selectedRecords = getSelectedRecords();
    var selected_ID;
    if (selectedRecords.length > 0) {
         selected_ID = selectedRecords[selectedRecords.length-1].id;
    }

    var count = parseInt(getRecordsNum()) + 1;
    document.getElementById("records-count").value = count;
    if (count != 1) {
        // remove green line
        // document.getElementById("records-" + (count - 1)).style = "";
    }
    if (selected_ID) {
        if (auto) {
            document.getElementById(selected_ID).parentNode.insertBefore(new_record, document.getElementById(selected_ID));
            selected_ID = parseInt(selected_ID.split("-")[1]);
        } else {
            document.getElementById(selected_ID).parentNode.insertBefore(new_record, document.getElementById(selected_ID).nextSibling);
            selected_ID = parseInt(selected_ID.split("-")[1]) + 1;
        }
        reAssignId("records-" + selected_ID, "records-" + count);
        attachEvent(selected_ID, selected_ID);
        if (auto) {
            selected_ID = "#records-" + (selected_ID + 1);
            $(selected_ID).addClass('selectedRecord');
        }
    } else {
        if (insertCommand) {
            document.getElementById("records-grid").insertBefore(new_record, getRecordsArray()[getRecordsNum()-2]);
        } else {
            document.getElementById("records-grid").appendChild(new_record);
        }
        reAssignId("records-1", "records-" + count);
        attachEvent(1, count);

        // focus on new element
        document.getElementById("records-" + count).scrollIntoView(false);
    }
    if (auto) {
        new_record.parentNode.insertBefore(document.createTextNode("\n"), new_record.nextSibling);
    } else {
        new_record.parentNode.insertBefore(document.createTextNode("\n"), new_record);
    }

    // set div_show's innerHTML here, because we need div's clientWidth 
    for (var k = 0; k < 3; ++k) {
        var string;
        if (k == 0) {
            string = command_name;
        } else if (k == 1) {
            // some target is not a pure string, so we need to change the type to string
            string = command_target_array[0][0].toString();
            if (string.includes("d-XPath")) {
                string = "auto-located-by-tac";
            }
        } else {
            string = command_value;
        }
        getTdShowValueNode(new_record, k).appendChild(document.createTextNode(string));
    }

    // store command grid to testCase
    var s_case = getSelectedCase();
    if (s_case) {
        sideex_testCase[s_case.id].records = document.getElementById("records-grid").innerHTML;
    }
}

// add command manually (append downward)
function addCommandManu(command_name, command_target_array, command_value) {
    addCommand(command_name, command_target_array, command_value, 0, false);
}

// add command before last command (append upward)
function addCommandBeforeLastCommand(command_name, command_target_array, command_value) {
    addCommand(command_name, command_target_array, command_value, 0, true);
}

// add command automatically (append upward)
function addCommandAuto(command_name, command_target_array, command_value) {
    addCommand(command_name, command_target_array, command_value, 1, false);
}
