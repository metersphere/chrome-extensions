$('#record_start').click(e => {
    $('#record_download').hide();
    $('#record_stop').show();
    let bg = chrome.extension.getBackgroundPage();
    bg.start();
    $('#record_start').hide();
});

$('#record_stop').click(e => {
    $('#record_download').show();
    let bg = chrome.extension.getBackgroundPage();
    bg.end();
    $('#record_start').show();
    $('#record_stop').hide();
});


$('#record_download').click(e => {
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
