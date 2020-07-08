let downloadRecording = new DownloadRecording();

$(document).ready(function () {
    let name = $('#name');
    let transactions;
    chrome.storage.local.get('jmxName', item => {
        name.val(item.jmxName);
    })

    let container = $('#json-editor')[0];
    let options = {}
    let editor = new JSONEditor(container, options);
    chrome.storage.local.get('traffic', item => {
        editor.set(JSON.parse(item.traffic));
    })

    let click = $('#export-json').click(() => {
        transactions = checkTransactions(editor.get());
        let exportResult = {};
        let scenarios = [];
        for (const scenarioKey of Object.keys(transactions)) {
            let scenario = {};
            let requests = [];
            let requestObj = transactions[scenarioKey];
            scenario.name = scenarioKey;
            for (const requestKey of Object.keys(requestObj)) {
                let request = {};
                Object.assign(request, requestObj[requestKey]);
                request.name = requestKey;
                if (request.method === 'POST' && request.body) {
                    let bodyStr = '';
                    for (const body of request.body) {
                        bodyStr += body;
                    }
                    request.body = {};
                    request.body.raw = bodyStr;
                }
                requests.push(request);
            }
            scenario.requests = requests;
            scenarios.push(scenario);
        };
        exportResult.scenarios = scenarios;
        downloadRecording.downloadJSON(name.val(), exportResult);
    });

    $('#export-jmx').click(() => {
        transactions = checkTransactions(editor.get());
        let domains = downloadRecording.getDomains(transactions);
        if (domains.length > 1) {
            let domainsDiv = $('#domains');
            domainsDiv.empty();
            domains.forEach(domain => {
                domainsDiv.prepend(
                    '<div>' +
                    '   <input type="checkbox"  name="domains" id="' + domain + '">' +
                    '   <label for="' + domain + '">' + domain + '</label>' +
                    '</div>'
                )
            })
            $("#json-editor").hide();
            $("#domains-select").show();
        } else {
            downloadRecording.downloadJMX(name.val(), domains, transactions);
        }
    });

    $('#submit').click(() => {
        let checked = [];
        $("input[name='domains']:checked").each(function () {
            checked.push($(this).attr("id"));
        });
        downloadRecording.downloadJMX(name.val(), checked, transactions);
    });

    $('#cancel').click(() => {
        transactions = null;
        $("#json-editor").show();
        $("#domains-select").hide();
    });
});

let checkTransactions = function (transactions) {
    let keys = Object.keys(transactions);
    keys.forEach(key => {
        if (transactions[key].hasOwnProperty("url")) {
            transactions[key] = checkRequest(transactions[key]);
        } else {
            transactions[key] = checkTraffic(transactions[key]);
        }
    });

    return transactions;
}

let checkTraffic = function (traffic) {
    let keys = Object.keys(traffic);
    keys.forEach(key => {
        traffic[key] = checkRequest(traffic[key]);
    });

    return traffic;
}

let checkRequest = function (request) {
    if (request.label && typeof (request.label) !== 'string') {
        request.label = String(request.label);
    }
    if (request.method && typeof (request.method) !== 'string') {
        request.method = String(request.method);
    }
    if (request.url && typeof (request.url) !== 'string') {
        request.url = String(request.url);
    }
    if (request.timestamp && typeof (request.timestamp) !== 'number') {
        request.timestamp = 0;
    }
    if (request.transaction_key && typeof (request.transaction_key) !== 'number') {
        request.transaction_key = 0;
    }
    if (request.headers.length > 1) {
        request.headers.forEach(header => {
            if (header.name && typeof (header.name) !== 'string') {
                header.name = String(header.name);
            }
            if (header.value && typeof (header.value) !== 'string') {
                header.value = String(header.value);
            }
        })
    }
    return request;
}