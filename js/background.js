// Import required scripts for service worker
// importScripts('common/browser-polyfill.js', 'URI.js');

console.log('Background script starting...');

const WEB_EXTENSIONS_LIBRARY = ["atom", "json", "map", "topojson", "jsonld", "rss", "geojson", "rdf", "xml", "js", "webmanifest", "webapp", "appcache", "mid", "midi", "kar", "aac", "f4a", "f4b", "m4a", "mp3", "oga", "ogg", "opus", "ra", "wav", "bmp", "gif", "jpeg", "jpg", "jxr", "hdp", "wdp", "png", "svg", "svgz", "tif", "tiff", "wbmp", "webp", "jng", "3gp", "3gpp", "f4p", "f4v", "m4v", "mp4", "mpeg", "mpg", "ogv", "mov", "webm", "flv", "mng", "asf", "asx", "wmv", "avi", "cur", "ico", "doc", "xls", "ppt", "docx", "xlsx", "pptx", "deb", "woff", "woff2", "eot", "ttc", "ttf", "otf", "ear", "jar", "war", "hqx", "bin", "deb", "dll", "dmg", "img", "iso", "msi", "msm", "msp", "safariextz", "pdf", "ai", "eps", "ps", "rtf", "kml", "kmz", "wmlc", "7z", "bbaw", "torrent", "crx", "cco", "jardiff", "jnlp", "run", "iso", "oex", "pl", "pm", "pdb", "prc", "rar", "rpm", "sea", "swf", "sit", "tcl", "tk", "crt", "der", "pem", "xpi", "exe", "xhtml", "xsl", "zip", "css", "csv", "htm", "html", "shtml", "md", "mml", "txt", "vcard", "vcf", "xloc", "jad", "wml", "vtt", "htc", "desktop", "md", "ts", "ico", "jar", "so"];

class Transaction {
    constructor(id, name, counter) {
        this.id = id;
        this.name = name;
        this.counter = counter;
    }
}

class Transactions {
    constructor() {
        this.httpTransactions = [];
    }

    addHttpTransaction(name) {
        let id = this.httpTransactions.length;
        let httpTransaction = new Transaction(id, name, 0);
        this.httpTransactions.push(httpTransaction);
        return httpTransaction;
    }

    setHttpTransactionName(index, name) {
        this.httpTransactions[index].name = name;
    }

    getLastHttpTransactionCounter() {
        return this.getLastHttpTransaction().counter;
    }

    addLastHttpTransactionCounter() {
        this.getLastHttpTransaction().counter++;
    }

    getLastHttpTransaction() {
        let last = this.httpTransactions.length > 0 ? this.httpTransactions.length - 1 : 0;
        return this.httpTransactions[last];
    }

    isHttpTransactionEmpty() {
        return this.httpTransactions.length === 0;
    }

    reset() {
        this.httpTransactions = [];
    }
}

// 全局transactions
var transactions = new Transactions;

class Recorder {
    constructor() {
        this.status = "stopped";
        this.files = {};
        this.body = {};
        this.traffic = {};
        this.activeTabId = 0;
    }

    isRecording() {
        return this.status === "recording";
    }

    changeStatus(status) {
        this.status = status;
        // 通知所有transaction-ui页面录制状态改变
        chrome.runtime.sendMessage({ action: 'recording_status_changed', status: status });
    }

    convertTraffic(sourceTraffic) {
        let traffic = {};
        transactions.httpTransactions.forEach(transaction => {
            let key = transaction.name + " [" + transaction.id + "]";
            traffic[key] = {};
            let keys = Object.keys(sourceTraffic);
            keys.forEach(index => {
                let item = sourceTraffic[index];
                if (item.transaction_key === transaction.id) {
                    let requestId = item.method + ' ' + item.url.substring(0, 130) + ' [' + item.requestId + ']';
                    delete item.requestId;
                    delete item.tabId;
                    traffic[key][requestId] = item;
                }
            });
        })

        return traffic;
    }

    saveRecording() {
        let lastHttpTransaction = transactions.getLastHttpTransaction();
        if ((lastHttpTransaction.id === 0 && lastHttpTransaction.counter === 0) || transactions.isHttpTransactionEmpty()) {
            return;
        }
        let traffic = this.convertTraffic(this.traffic);
        // 转为字符，为了保持顺序。
        chrome.storage.local.set({ "traffic": JSON.stringify(traffic) });
    }

    resetRecording() {
        this.status = "stopped";
        this.body = {};
        this.traffic = {};
        this.activeTabId = 0;
        transactions.reset();
        transactions.addHttpTransaction("测试用例");
        chrome.storage.local.set({ "traffic": '' });
    }

    pauseRecording() {
        this.changeStatus('pause');
    }

    resumeRecording() {
        this.changeStatus('recording');
    }

    stopRecording() {
        this.changeStatus('stopped');
        chrome.webRequest.onBeforeRequest.removeListener(onBeforeRequest);
        chrome.webRequest.onSendHeaders.removeListener(onSendHeaders);
        chrome.webRequest.onBeforeSendHeaders.removeListener(onBeforeSendHeaders);
        chrome.tabs.query({}, function (tabs) {
            for (let i = 0; i < tabs.length; i++) {
                chrome.tabs.sendMessage(tabs[i].id, {
                    action: 'remove_transaction_ui'
                }
                );
            }
        });
        this.saveRecording();
    }

    startRecording(tab) {
        console.log('Starting recording for tab:', tab);
        this.resetRecording();
        this.changeStatus('recording');
        console.log('Recording status changed to:', this.status);

        chrome.storage.local.get('options', function (item) {
            console.log('Retrieved options:', item.options);
            let options = item.options || {};
            let requestFilter = {};
            let matchPatterns;
            if (!options.regex_include) {
                matchPatterns = ['http://*/*', 'https://*/*'];
            } else {
                matchPatterns = options.regex_include.split(',').map(function (item) {
                    return item.trim();
                });
            }
            console.log('Match patterns:', matchPatterns);
            requestFilter.urls = matchPatterns;
            requestFilter.types = ['main_frame', 'sub_frame', 'object'];
            if (options.record_ajax !== false) {
                requestFilter.types.push('xmlhttprequest');
            }
            if (options.record_css !== false) {
                requestFilter.types.push('stylesheet');
                requestFilter.types.push('font');
            }
            if (options.record_js !== false) {
                requestFilter.types.push('script');
            }
            if (options.record_images !== false) {
                requestFilter.types.push('image');
            }
            if (options.record_other !== false) {
                requestFilter.types.push('other');
                requestFilter.types.push('ping');
            }

            console.log('Adding webRequest listeners with filter:', requestFilter);
            chrome.webRequest.onBeforeSendHeaders.addListener(onBeforeSendHeaders, requestFilter, ['requestHeaders', 'extraHeaders']);
            chrome.webRequest.onBeforeRequest.addListener(onBeforeRequest, requestFilter, ['requestBody']);
            chrome.webRequest.onSendHeaders.addListener(onSendHeaders, requestFilter, ['requestHeaders', 'extraHeaders']);

            delete (requestFilter.types);
        });

        console.log('Sending message to tab:', tab.id);
        chrome.tabs.sendMessage(tab.id, { action: "add_transaction_ui" }, function (response) {
            if (chrome.runtime.lastError) {
                console.error('Error sending message to tab:', chrome.runtime.lastError);
            } else {
                console.log('Message sent successfully to tab');
            }
        });
    }
}

// 全局recorder
var recorder = new Recorder();
console.log('Recorder initialized:', recorder);

let onBeforeSendHeaders = function (info) {
    if (recorder.isRecording()) {
        chrome.storage.local.get("options", function (item) {
            let options = item.options;
            if (info.requestHeaders) {
                // Note: In Manifest V3 without blocking permissions, 
                // we can only observe headers, not modify them
                // The original useragent modification functionality is limited
                if (options.useragent && options.useragent !== 'Current Browser') {
                    console.log('User agent would be modified to:', options.useragent);
                }
            }
        });
    }
}

let onBeforeRequest = function (info) {
    if (recorder.isRecording()) {
        if (info.requestBody) {
            let postData = '';
            let files = [];
            if (!info.requestBody.error) {
                if (info.requestBody.formData) {
                    postData = info.requestBody.formData;
                    for (let index in postData) {
                        if (postData.hasOwnProperty(index)) {
                            postData[index] = postData[index].toString();
                        }
                    }
                } else {
                    postData = [];
                    if (info.requestBody.raw) {
                        let boundary = "";
                        info.requestBody.raw.forEach(function (raw) {
                            if (raw.bytes) {
                                const bytes = new Uint8Array(raw.bytes);
                                let encodedString = String.fromCharCode.apply(null, bytes);
                                let bodyString = decodeURIComponent(escape(encodedString));
                                if (bodyString.includes("------WebKitFormBoundary")) {
                                    if (bodyString.includes("Content-Disposition")) {
                                        boundary = bodyString;
                                    }
                                } else {
                                    postData.push(bodyString);
                                }
                            }
                            if (raw.file) {
                                let file = { path: raw.file };
                                boundary.split("\n").forEach(data => {
                                    data.split(";").forEach(item => {
                                        let string = item.trim();
                                        if (string.startsWith("name=")) {
                                            file.name = string.substring(6, string.length - 1);
                                        }
                                        if (string.startsWith("Content-Type: ")) {
                                            file.type = string.substring(14, string.length);
                                        }
                                    })
                                })
                                files.push(file);
                            }
                        });
                    }
                    let dataString = '';
                    for (let i = 0; i < postData.length; i++) {
                        dataString += (postData[i]);
                    }
                    try {
                        let jsonParsedString = JSON.parse(dataString);
                        if (!jsonParsedString) {
                            // Replace URI.parseQuery with native URLSearchParams
                            let parsedValue = {};
                            try {
                                const urlParams = new URLSearchParams(dataString);
                                for (let [key, value] of urlParams) {
                                    parsedValue[key] = value;
                                }
                            } catch (e) {
                                // Fallback to simple parsing
                                parsedValue = {};
                            }

                            if (parsedValue && Object.keys(parsedValue).length > 0) {
                                let notParseFlag = false;
                                for (const prop in parsedValue) {
                                    if (parsedValue.hasOwnProperty(prop)) {
                                        if (prop === dataString && parsedValue[prop] === null) {
                                            notParseFlag = true;
                                        }
                                    }
                                }
                                if (!notParseFlag) {
                                    postData = parsedValue;
                                }
                            }
                        }
                    } catch (e) {

                    }
                }
            } else {
                if (info.requestBody.error !== "Unknown error.") {
                    console.log(chrome.runtime.lastError.message);
                }
            }
            let key = info.method + info.requestId;
            recorder.body[key] = postData;
            recorder.files[key] = files;
        }
    }
}

let onSendHeaders = function (info) {
    if (recorder.isRecording()) {
        chrome.storage.local.get(["options"], function (item) {
            let options = item.options;
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs.length > 0) {
                    if (tabs[0].hasOwnProperty('id')) {
                        recorder.activeTabId = tabs[0].id;
                    }
                }
                if (info.tabId === recorder.activeTabId) {
                    for (let headers_index in info.requestHeaders) {
                        if (info.requestHeaders.hasOwnProperty(headers_index)) {
                            if (info.requestHeaders[headers_index].name === 'Origin') {
                                if (info.requestHeaders[headers_index].value.startsWith('chrome-extension://')) {
                                    return;
                                }
                            }
                        }
                    }

                    let data = {};
                    let requestType = 'embedded';
                    let requestSubType = '';
                    if (info.type === 'main_frame') {
                        requestType = 'top_level';
                    } else if (info.type === 'xmlhttprequest') {
                        requestType = 'ajax';
                        for (let index in info.requestHeaders) {
                            if (info.requestHeaders.hasOwnProperty(index)) {
                                if (info.requestHeaders[index].name === 'Origin' || info.requestHeaders[index].name === 'Referer') {
                                    let origin_host = (new URL(info.requestHeaders[index].value)).hostname;
                                    if (isFromRoot(origin_host, info.url)) {
                                        if (isFilepath(info.url)) {
                                            requestSubType = 'embedded_resource';
                                        } else {
                                            requestSubType = 'top_level';
                                        }
                                    } else {
                                        requestSubType = 'embedded_external';

                                    }
                                    break;
                                }
                            }
                        }
                    }

                    let key = info.method + info.requestId;
                    data.url = data.label = info.url;
                    data.method = info.method;
                    if (recorder.body[key]) {
                        data.body = recorder.body[key];
                    }
                    if (recorder.files[key]) {
                        data.files = recorder.files[key];
                    }
                    data.requestId = info.requestId;
                    data.request_type = requestType;
                    data.request_subtype = requestSubType;
                    data.timestamp = Math.round(info.timeStamp);
                    data.tabId = info.tabId;
                    data.headers = info.requestHeaders;

                    for (let index in data.headers) {
                        if (data.headers.hasOwnProperty(index)) {
                            if (data.headers[index].name === 'Cookie') {
                                if (!options.cookie) {
                                    data.headers.splice(index, 1);
                                } else {
                                    data.cookies = data.headers[index].value.split('; ');
                                }
                                break;
                            }
                        }
                    }

                    data.transaction_key = transactions.getLastHttpTransaction().id;

                    if (!recorder.traffic[key]) {
                        recorder.traffic[key] = data;
                        transactions.addLastHttpTransactionCounter();
                        chrome.runtime.sendMessage({ action: 'update_transactions' });
                    }
                }
            });
        });
    }
}

let isFromRoot = function (rootDomain, testURL) {
    if (typeof (testURL) === 'undefined') {
        return false;
    }
    let getDomainUrl = (new URL(testURL)).hostname;
    if (getDomainUrl === rootDomain) {
        return true;
    }

    let pattern = '([\\.]+' + rootDomain + ')(?![0-9a-zA-Z\\-\\.])';
    let expression = new RegExp(pattern, 'gi');
    return expression.test(getDomainUrl);
}

let isFilepath = function (url) {
    let fileType = getUrlExtension(url);
    if (fileType) {
        if (WEB_EXTENSIONS_LIBRARY.indexOf(fileType) !== -1) {
            return true;
        }
    }
    return false;
}

let getUrlExtension = function (url) {
    let file_extension = url.split(/[#?]/)[0].split('.').pop().trim();
    if (/^[a-zA-Z0-9]*$/.test(file_extension) === true) {
        return file_extension;
    }

    return null;
}

let messageHandler = function (request, sender, sendResponse) {
    console.log('Received message:', request);
    if (request.action) {
        switch (request.action) {
            case 'start_recording':
                console.log('Starting recording with tab:', request.recordingTab);
                recorder.startRecording(request.recordingTab);
                sendResponse({
                    msg: 'ok',
                    error: false
                });
                break;
            case 'stop_recording':
                recorder.stopRecording();
                sendResponse({
                    msg: 'ok',
                    error: false
                });
                break;
            case 'pause_recording':
                recorder.pauseRecording();
                sendResponse({
                    msg: 'ok',
                    error: false
                });
                break;
            case 'resume_recording':
                recorder.resumeRecording();
                sendResponse({
                    msg: 'ok',
                    error: false
                });
                break;
            case 'save_recording':
                recorder.saveRecording();
                sendResponse({
                    msg: 'ok',
                    error: false
                });
                break;
            case 'check_status':
                sendResponse({
                    status: recorder.status,
                    msg: 'ok',
                    error: false
                });
                break;
            case 'get_transactions':
                sendResponse({
                    transactions: transactions,
                    msg: 'ok',
                    error: false
                });
                break;
            case 'add_transaction':
                let httpTransaction = transactions.addHttpTransaction(request.name);
                sendResponse({
                    transaction: httpTransaction,
                    msg: 'ok',
                    error: false
                });
                break;
            case 'set_transaction_name':
                transactions.setHttpTransactionName(request.index, request.name);
                sendResponse({
                    msg: 'ok',
                    error: false
                });
                break;
            case 'update_transactions':
                // 不需要发送消息给自己，只回应即可
                sendResponse({
                    msg: 'ok',
                    error: false
                });
                break;
        }
    }
}

chrome.runtime.onMessage.addListener(messageHandler);
console.log('Message handler registered');

chrome.runtime.onInstalled.addListener(function (details) {
    console.log('Extension installed/updated:', details);
    if (details.reason === 'install') {
        chrome.storage.local.clear();
        // Set default options
        chrome.storage.local.set({
            'options': {
                'record_ajax': true,
                'record_css': true,
                'record_js': true,
                'record_images': true,
                'record_other': true,
                'regex_include': '',
                'useragent': 'Current Browser'
            }
        });
    }
});

// Initialize on startup
console.log('Background script loaded, recorder status:', recorder.status);