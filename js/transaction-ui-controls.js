function showButtons() {
    for (let i = 0; i < arguments.length; i++) {
        $("#" + arguments[i]).show();
    }
}

function hideButtons() {
    for (let i = 0; i < arguments.length; i++) {
        $("#" + arguments[i]).hide();
    }
}

function switchButtons(status) {
    switch (status) {
        case "recording":
            hideButtons('resume');
            showButtons('pause', 'stop');
            break;
        case "pause":
            hideButtons('pause');
            showButtons('stop', 'resume');
            break;
        case "stopped":
            hideButtons('pause', 'stop');
            showButtons('resume');
    }
}

function loadButtons() {
    chrome.runtime.sendMessage({action: "check_status"}, function (response) {
        let status = response.status;
        switchButtons(status);
    });
    $('#pause').click(function () {
        switchButtons("pause");
        chrome.runtime.sendMessage({action: "pause_recording"});
    });
    $('#resume').click(function () {
        switchButtons("recording");
        chrome.runtime.sendMessage({action: "resume_recording"});
    });
    $('#stop').click(function () {
        switchButtons("stopped");
        chrome.runtime.sendMessage({action: "stop_recording"});
    });
}

$(document).ready(function () {
    loadButtons();
});

function isMacintosh() {
    return navigator.platform.indexOf('Mac') > -1
}

function isWindows() {
    return navigator.platform.indexOf('Win') > -1
}
