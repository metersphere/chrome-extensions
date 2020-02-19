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


$('#export_JMX_fit2cloud').click(e => {
    chrome.storage.local.get(['recordData'], function (items) {
        let jmx = new Jmx(items.recordData);
        let blob = new Blob([jmx.generate()], {type: "application/octet-stream"});
        let link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = "fit2cloud_jmx.jmx";
        link.click();
        window.URL.revokeObjectURL(link.href);
    })
});