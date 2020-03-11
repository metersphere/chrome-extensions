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

$(document).ready(function() {

    var userid = browser.runtime.id;
    var tac = false;

    /**
     * Only used to count the TAC locator usages.
     */
    browser.storage.sync.get("tac")
        .then((res) => {
            if (res.tac) {
                tac = res.tac;
                if (tac) {
                    $.ajax({
                        url: 'http://log.sideex.org/usage/tacUsageCount.php',
                        type: 'POST',
                        data: {
                            userid: userid
                        }
                    });
                }
            } else {
                browser.storage.sync.set({
                    tac: tac
                });
            }
        });

    $(".tablesorter").tablesorter();

    $("#help").click(function() {
        browser.tabs.create({
            url: "http://sideex.org/",
            windowId: contentWindowId
        });
    });

    $("#options").click(function() {
        browser.runtime.openOptionsPage();		
    });	

    //init dropdown width
    $("#command-dropdown").css({
        'width': $("#command-command").width() + 29 + "px"
    });
    $("#target-dropdown").css({
        'width': $("#command-target").width() + 29 + "px"
    });
    //dropdown width change with input's width
    $(window).resize(function() {
        $("#command-dropdown").css({
            'width': $("#command-command").width() + 29 + "px"
        });
        $("#target-dropdown").css({
            'width': $("#command-target").width() + 29 + "px"
        });
    });
    //dropdown when click the down icon
    $(".fa-chevron-down").click(function() {
        dropdown($("#" + $(this).attr("id") + "dropdown"));
        $(".w3-show").on("mouseleave", function() {
            dropdown($(this));
        });
    });

    $("#command-grid").colResizable({ liveDrag: true, minWidth: 75 });
    $(function() {
        $.fn.fixMe = function() {
            return this.each(function() {
                var $this = $(this),
                    $t_fixed;

                function init() {
                    $this.wrap('<div class="container" />');
                    $t_fixed = $this.clone();
                    $t_fixed.find("tbody").remove().end().addClass("fixed").insertBefore($this);
                    $t_fixed.find("th").each(function(index) {
                        var $self = $(this);
                        $this.find("th").eq(index).on("DOMAttrModified", function(e) {
                            $self.css("width", $(this).outerWidth() + "px");
                        });
                    });
                    resizeFixed();
                }

                function resizeFixed() {
                    $t_fixed.find("th").each(function(index) {
                        $(this).css("width", $this.find("th").eq(index).outerWidth() + "px");
                    });
                }

                function scrollFixed() {
                    var offset = $(this).scrollTop(),
                        tableOffsetTop = $this.offset().top,
                        tableOffsetBottom = tableOffsetTop + $this.height() - $this.find("thead").height();
                    if (offset < tableOffsetTop || offset > tableOffsetBottom) {
                        $t_fixed.hide();
                    } else if (offset >= tableOffsetTop && offset <= tableOffsetBottom && $t_fixed.is(":hidden")) {
                        $t_fixed.show();
                    }
                    var tboffBottom = (parseInt(tableOffsetBottom));
                    var tboffTop = (parseInt(tableOffsetTop));

                    if (offset >= tboffBottom && offset <= tableOffsetBottom) {
                        $t_fixed.find("th").each(function(index) {
                            $(this).css("width", $this.find("th").eq(index).outerWidth() + "px");
                        });
                    }
                }
                $(window).resize(resizeFixed);
                $(window).scroll(scrollFixed);
                init();
            });
        };
    });

    $(".fixed").width($("table:not(.fixed)").width());

    $("#command-dropdown,#command-command-list").html(genCommandDatalist());

    $(".record-bottom").click(function() { 
        $(this).addClass("active");
        $('#records-grid .selectedRecord').removeClass('selectedRecord'); 
    });

    $("#slider").slider({
        min: 0,
        max: 3000,
        value: 0,
        step: 600
    }).slider("pips", {
        rest: "label", labels: ["Fast", "", "", "", "", "Slow"]
    });

});

var dropdown = function(node) {
    if (!node.hasClass("w3-show")) {
        node.addClass("w3-show");
        setTimeout(function() {
            $(document).on("click", clickWhenDropdownHandler);
        }, 200);
    } else {
        $(".w3-show").off("mouseleave");
        node.removeClass("w3-show");
        $(document).off("click", clickWhenDropdownHandler);
    }
};

var clickWhenDropdownHandler = function(e) {
    var event = $(e.target);
    if ($(".w3-show").is(event.parent())) {
        $(".w3-show").prev().prev().val(event.val()).trigger("input");
    }
    dropdown($(".w3-show"));
};

function closeConfirm(bool) {
    if (bool) {
        $(window).on("beforeunload", function(e) {
            var confirmationMessage = "You have a modified suite!";
            e.returnValue = confirmationMessage; // Gecko, Trident, Chrome 34+
            return confirmationMessage; // Gecko, WebKit, Chrome <34
        });
    } else {
        if (!$("#testCase-grid").find(".modified").length)
            $(window).off("beforeunload");
    }
}

function genCommandDatalist() {
    var supportedCommand = [
        "addSelection",
        "answerOnNextPrompt",
        "assertAlert",
        "assertConfirmation",
        "assertPrompt",
        "assertText",
        "assertTitle",
        "assertValue",
        "chooseCancelOnNextConfirmation",
        "chooseCancelOnNextPrompt",
        "chooseOkOnNextConfirmation",
        "clickAt",
        "close",
        "doubleClickAt",
        "dragAndDropToObject",
        "echo",
        "editContent",
        "mouseDownAt",
        "mouseMoveAt",
        "mouseOut",
        "mouseOver",
        "mouseUpAt",
        "open",
        "pause",
        "removeSelection",
        "runScript",
        "select",
        "selectFrame",
        "selectWindow",
        "sendKeys",
        "store",
        "storeEval",
        "storeText",
        "storeTitle",
        "storeValue",
        "submit",
        "type",
        "verifyText",
        "verifyTitle",
        "verifyValue"
    ];

    var datalistHTML = "";
    supportedCommand.forEach(function(command) {
        datalistHTML += ('<option value="' + command + '">' + command + '</option>\n');
    });

    return datalistHTML;
}