$('#start_fit2cloud').click(e => {
    let bg = chrome.extension.getBackgroundPage();
    bg.start();
    alert('开始录制');
});

$('#end_fit2cloud').click(e => {
    let bg = chrome.extension.getBackgroundPage();
    bg.end();
    alert('结束录制');
});

$('#export_json_fit2cloud').click(e => {
    chrome.storage.local.get(['https_list'], function (items) {
        const blob = new Blob([JSON.stringify(items.https_list)], {type: "application/json"});
        const fileName = `fit2cloud_meter_sphere.json`;
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(link.href);
    })

});