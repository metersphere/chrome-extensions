chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.command) {
        switch (request.command) {
            case 'attachPrompt':
                injectMonkeyPatch();
                break;
            case 'detachPrompt':
                removeMonkeyPatch();
                break;
        }
    }
});

function injectMonkeyPatch() {
    var el = document.getElementById('monkey-patch-script');
    if(!el) {
        var elementForInjectingScript = document.createElement('script');
        elementForInjectingScript.id = 'monkey-patch-script';
        // MODIFIED FUNCTIONAL - Modified getURL() path
        elementForInjectingScript.src = chrome.runtime.getURL('sideex/monkey-patch.js');
        (document.head || document.documentElement).appendChild(elementForInjectingScript);

        if (window === window.top) {
            window.addEventListener('message', MonkeyPatchInjecterListener);
        }
    }
}

chrome.storage.local.get('isRecording', (option) => {
    if (option.isRecording) {
        injectMonkeyPatch();
    }
});


function removeMonkeyPatch() {
    window.removeEventListener('message', MonkeyPatchInjecterListener);

    let script = document.getElementById('monkey-patch-script');
    if (script) {
        script.remove();
    }
}

function MonkeyPatchInjecterListener() {
    if (event.data && event.data.direction == 'from-page-monkey-patch-script') {
        if (event.data.response) {
            switch (event.data.response) {
                case 'request':
                    chrome.runtime.sendMessage({command: 'sendResponseAjaxWithBody', message: event.data.value});
                    break;
                case 'fetch':
                    chrome.runtime.sendMessage({command: 'sendResponseAjaxWithBody', message: event.data.value});
            }
        }
    }
}
