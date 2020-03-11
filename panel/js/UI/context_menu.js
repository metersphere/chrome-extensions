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

var tempCommand = [];
var isOnCommandContainer = false;
 
// Trigger action when the contexmenu is about to be shown
$(document).on("contextmenu", function(event) {

    $(".menu").css("left", event.pageX);
    $(".menu").css("top", event.pageY);

    if (event.target.id == "testCase-container") {
        event.preventDefault();
        $("#suite-grid-menu").show();
        return;
    }

    var child = document.getElementById("tempChild");
    if (child) {
        document.getElementById("command-grid-menu").childNodes[1].removeChild(child);
    } 

    var temp = event.target;
    var inCommandGrid = false;
    while (temp.tagName.toLowerCase() != "body") {
        if (/records-(\d)+/.test(temp.id)) {
            var exe = document.createElement("li");
            exe.setAttribute("id", "tempChild");
            a = document.createElement("a");
            a.setAttribute("href", "#");
            a.textContent = "Execute This Command";
            exe.appendChild(a);
            var index = temp.id.split("-")[1];
            exe.addEventListener("click", function(event) {
                executeCommand(index);
            }, true);

            document.getElementById("command-grid-menu").childNodes[1].appendChild(exe);
        }
        if (temp.id == "command-grid" || temp.className.search("record-bottom") >= 0) {
            inCommandGrid = true;
            break;
        } else {
            temp = temp.parentElement;
        }
    }
    if (inCommandGrid) {
        event.preventDefault();
        $("#command-grid-menu").show();
    };
});


// If the document is clicked somewhere
$(document).on("mousedown", function(e) {
    if (!$(e.target).parents(".menu").length > 0) $(".menu").hide();
    else setTimeout(function() { $(".menu").hide(); }, 150);
});

document.getElementById("grid-add").addEventListener("click", function() {
    // target is 2-D array
    addCommandManu("", [
        [""]
    ], "");
}, false);

document.getElementById("grid-deleteAll").addEventListener("click", function() {
    var selectedNode = document.getElementById("records-grid").getElementsByTagName("TR");
    for(var i=selectedNode.length;i>0;i--){
        deleteCommand("records-" + i);
    }
}, false);

document.getElementById("grid-delete").addEventListener("click", function() {
    deleteCommand(getSelectedRecord());
}, false);

document.getElementById("grid-copy").addEventListener("click", function(event) {
    copyCommand();
}, false);

document.getElementById("grid-paste").addEventListener("click", function() {
    /*if (tempCommand != undefined) {
        addCommandManu(tempCommand["command"], tempCommand["target"], tempCommand["value"]);
        // addCommandManu(tempCommand["command"], [[tempCommand["test"]]], tempCommand["value"]);
    }*/
    pasteCommand();
}, false);

document.getElementById("grid-breakpoint").addEventListener("click",function() {
    setBreakpoint(getSelectedRecord());
}, false);

document.getElementById("command-container").addEventListener("click", function(event) {
    document.getElementById("command-command").blur();
    document.getElementById("command-target").blur();
    document.getElementById("command-value").blur();
});

// let hot key (Ctrl + C/V) only enable on command container
document.getElementById("command-container").addEventListener("click", function(event) {
    event.stopPropagation();
    isOnCommandContainer = true;
})

document.addEventListener("click", function(event) {
    isOnCommandContainer = false;
});

function stopNativeEvent(event) {
    // NOTE: lock the browser default shortcuts
    // and this should be careful
    event.preventDefault();
    event.stopPropagation();
}

// Hot key setting
document.addEventListener("keydown", function(event) {
    var keyNum;
    if(window.event) { // IE
        keyNum = event.keyCode;
    } else if(event.which) { // Netscape/Firefox/Opera
        keyNum = event.which;
    }

    if (keyNum == 123) { // enable F12
        return;
    } else if (event.target.tagName.toLowerCase() == "input") {
        // to avoid typing in input
        if (event.ctrlKey || keyNum == 116) {
            if (keyNum == 65 || keyNum == 67 || keyNum == 86 || keyNum == 88) {
                // enable Ctrl + A, C, V, X
                return;
            }
            stopNativeEvent(event);
        }
        if(keyNum == 46) { // enable del
            return;
        }
    }

    // Hot keys
    switch (keyNum) {
        case 38: // up arrow
            selectForeRecord();
            break;
        case 40: // down arrow
            selectNextRecord();
            break;
        case 46: // del
            let selectedTr = getSelectedRecords();
            for (let i=selectedTr.length-1 ; i>=0 ; i--) {
                deleteCommand(selectedTr[i].id);
            }
            break;
        default:
            break;
    }

    // Hot keys: Ctrl + [KEY]
    if (event.ctrlKey) {
        if (!isOnCommandContainer && (keyNum == 67 || keyNum == 86)) {
            return;
        }
        stopNativeEvent(event);
        switch (keyNum) {
            case 65: // Ctrl + A
                var recordNode = document.getElementById("records-grid").getElementsByTagName("TR");
                for (let i=0 ; i<recordNode.length ; i++) {
                    recordNode[i].classList.add("selectedRecord");
                }
                break;
            case 66: // Ctrl + T
                setBreakpoint(getSelectedRecord());
                break;
            case 67: // Ctrl + C
                copyCommand();
                break;
            case 73: // Ctrl + I
                $("#grid-add").click();
                break;
            case 79: // Ctrl + O
                $('#load-testSuite-hidden').click();
                break;
            case 80: // Ctrl + P
                $("#playback").click();
                break;
            case 83: // Ctrl + S
                $("#save-testSuite").click();
                break;
            case 86: // Ctrl + V
                pasteCommand();
                break;
            case 88: // Ctrl + X
                copyCommand();
                let selectedRecords = getSelectedRecords();
                for(let i=selectedRecords.length-1 ; i>=0 ; i--){
                    deleteCommand(selectedRecords[i].id);
                }
                break;
            default:
                break;
        }
    }
}, false);

function deleteCommand(selected_ID) {
    if (selected_ID) {
	
	    modifyCaseSuite();
	
        var delete_node = document.getElementById(selected_ID);
        // do not forget to remove textNode
        if (delete_node.previousSibling.nodeType == 3) {
            delete_node.parentNode.removeChild(delete_node.previousSibling);
        }
        delete_node.parentNode.removeChild(delete_node);

        var count = parseInt(getRecordsNum()) - 1;
        document.getElementById("records-count").value = count;
        selected_ID = parseInt(selected_ID.split("-")[1]);

        // delete last one
        if (selected_ID - 1 != count) {
            reAssignIdForDelete(selected_ID, count);
        } else {
            // if (count != 0) {
            //     document.getElementById("records-" + count).style.borderBottom = "green solid 2px";
            // }
        }

        // store command grid to testCase
        var s_case = getSelectedCase();
        if (s_case) {
            sideex_testCase[s_case.id].records = document.getElementById("records-grid").innerHTML;
        }
    }
}

function copyCommand() {
    // clear tempCommand
    tempCommand = [];
    let ref = getSelectedRecords();
    let targetOptions;
    let showTarget;
    for (let i=0 ; i<ref.length ; i++) {
        showTarget = ref[i].getElementsByTagName("td")[1].getElementsByTagName("div")[1].textContent;
        targetOptions = ref[i].getElementsByTagName("td")[1]
            .getElementsByTagName("datalist")[0]
            .getElementsByTagName("option");
        let targetElements = [];
        let tempTarget;
        for (let j=0 ; j<targetOptions.length ; j++) {
            tempTarget = targetOptions[j].text;
            if (showTarget == tempTarget) {
                targetElements.splice(0, 0, [tempTarget]);
            } else {
                targetElements.push([tempTarget]);
            }
        }
        tempCommand[i] = {
            "command": getCommandName(ref[i]),
            "test": getCommandTarget(ref[i]),
            "target": targetElements,
            "value": getCommandValue(ref[i])
        };
        console.log("showTarget: ", showTarget);
    }
}

function pasteCommand() {
    if (tempCommand.length > 0) {
        if (getSelectedRecords().length == 0) {
            // NOTE: because there is no selected record.
            // Therefore, index i is form 0 to length-1.
            for (let i=0 ; i<tempCommand.length ; i++) {
                addCommandManu(tempCommand[i]["command"], tempCommand[i]["target"], tempCommand[i]["value"]);
            }
            return;
        }

        // NOTE: because addCommandManu is add command on this below.
        // Therefore, index i is form length-1 to 0
        for (let i=tempCommand.length-1 ; i>=0 ; i--) {
            addCommandManu(tempCommand[i]["command"], tempCommand[i]["target"], tempCommand[i]["value"]);
        }
    }
}

function selectForeRecord() {
    pressArrowKey(38);
}

function selectNextRecord() {
    pressArrowKey(40);
}

function pressArrowKey(direction) {
    let selectedRecords = getSelectedRecords();
    if (selectedRecords.length == 0) {
        return;
    }
    let lastRecordId = selectedRecords[selectedRecords.length - 1].id;
    let recordNum = parseInt(lastRecordId.substring(lastRecordId.indexOf("-") + 1));
    $("#records-grid .selectedRecord").removeClass("selectedRecord");
    if (direction == 38) { // press up arrow
        if (recordNum == 1) {
            $("#records-1").addClass("selectedRecord");
            $("#records-1").click();
        } else {
            $("#records-" + (recordNum - 1)).addClass("selectedRecord");
            $("#records-" + (recordNum - 1)).click();
        }
    } else if (direction == 40) { // press down arrow
        if (recordNum == getRecordsNum()) {
            $("#records-" + recordNum).addClass("selectedRecord");
            $("#records-" + recordNum).click();
        } else {
            $("#records-" + (recordNum + 1)).addClass("selectedRecord");
            $("#records-" + (recordNum + 1)).click();
        }
    }
}

function setBreakpoint(selected_ID) {
    if (selected_ID) {
        var current_node = document.getElementById(selected_ID).getElementsByTagName("td")[0];
        if (!current_node.classList.contains("break")) {
            current_node.classList.add("break");
        } else {
            current_node.classList.remove("break");
        }
    }
}
