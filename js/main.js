let downloadRecording = new DownloadRecording();

$(document).ready(function () {
    chrome.storage.local.get(null, function (item) {
        if (!item.jmxName || !item.traffic || item.traffic.length < 1) {
            item.jmxName = generateJmxName();
            chrome.storage.local.set({"jmxName": item.jmxName});
        }
        $("#jmx_name").val(item.jmxName);

        if (!item.options) {
            let options = {};
            options.requests_to_record = 'top_level';
            options.record_ajax = true;
            options.functional_test = false;
            options.cookie = true;
            options.record_css = false;
            options.record_js = false;
            options.record_images = false;
            options.record_other = false;
            options.cache = true;
            options.regex_include = 'http://*/*, https://*/*';
            options.useragent = 'Current Browser';
            //options
            chrome.storage.local.set({"options": options});
        }

        hideBtn('main_download')

        chrome.runtime.sendMessage({action: "check_status"}, function (response) {
                let status = response.status;
                switchBtn(status);
            }
        );
    });
});


$("#jmx_name").change(() => {
    chrome.storage.local.set({"jmxName": $(" #jmx_name ").val()});
});


$('#record_start').click(() => {
    switchBtn("recording");
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        if (tabs.length > 0 && tabs[0].hasOwnProperty('id')) {
            let message = {
                action: "start_recording",
                recordingTab: tabs[0]
            };
            chrome.runtime.sendMessage(message);
            window.close();
        }
    });
});

$('#record_pause').click(() => {
    switchBtn("pause");
    chrome.runtime.sendMessage({action: "pause_recording"});
});

$('#record_resume').click(() => {
    switchBtn("recording");
    chrome.runtime.sendMessage({action: "resume_recording"});
});

$('#record_stop').click(() => {
    switchBtn("stopped");
    chrome.runtime.sendMessage({action: "stop_recording"});
});

$('#record_edit').click(() => {
    chrome.tabs.create({
        url: 'editor.html'
    });
});

let d
$('#record_download').click(() => {
    chrome.storage.local.get(['traffic', 'jmxName'], item => {
        let name = item.jmxName;
        let data = JSON.parse(item.traffic);
        let domains = downloadRecording.getDomains(data);
        if (domains.length > 1) {
            let domainsDiv = $('#checkboxs');
            domainsDiv.empty();
            domains.forEach(domain => {
                domainsDiv.prepend(
                    '<div>' +
                    '   <input type="checkbox"  name="domains" id="' + domain + '">' +
                    '   <label for="' + domain + '">' + domain + '</label>' +
                    '</div>'
                )
            });
            $('#main_page').hide();
            $('#main_download').show();
        } else {
            downloadRecording.downloadJMX(name, domains, data);
        }
    });
});

$('#record_save').click(() => {
    let domains = [];
    $("input[name='domains']:checked").each(function () {
        domains.push($(this).attr("id"));
    });
    chrome.storage.local.get(['traffic', 'jmxName'], item => {
        let name = item.jmxName;
        let data = JSON.parse(item.traffic);
        downloadRecording.downloadJMX(name, domains, data);
        showBtn('main_page');
        hideBtn('main_download');
    });
});


$('#record_back').click(() => {
    showBtn('main_page');
    hideBtn('main_download');
});

function switchBtn(status) {
    switch (status) {
        case "recording":
            hideBtns('record_download', 'record_edit', 'record_start', 'record_resume');
            showBtns('record_stop', 'record_pause');
            break;
        case "pause":
            hideBtns('record_download', 'record_edit', 'record_start', 'record_pause');
            showBtns('record_stop', 'record_resume');
            break;
        case "stopped":
            hideBtns('record_stop', 'record_pause', 'record_resume');
            showBtn('record_start');
            chrome.storage.local.get('traffic', function (item) {
                if (item.traffic && item.traffic.length > 0) {
                    showBtns('record_download', 'record_edit');
                } else {
                    hideBtns('record_download', 'record_edit');
                }
            });
            break;
    }
}

function showBtn(id) {
    if (id.indexOf("#") === -1) {
        id = "#" + id;
    }
    $(id).show();
}

function showBtns() {
    for (let i = 0; i < arguments.length; i++) {
        showBtn(arguments[i]);
    }
}

function hideBtn(id) {
    if (id.indexOf("#") === -1) {
        id = "#" + id;
    }
    $(id).hide();
}

function hideBtns() {
    for (let i = 0; i < arguments.length; i++) {
        hideBtn(arguments[i]);
    }
}

function generateJmxName() {
    let d = new Date(),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear(),
        hour = d.getHours(),
        min = d.getMinutes();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    if (hour.length < 2) hour = '0' + hour;
    if (min.length < 2) min = '0' + min;

    return ["RECORD", year, month, day, hour, min].join('-');
}