var https_list = [];
var body = {};
var START_END_MOD = false;
var RequestFilter = {urls: ['http://*/*', 'https://*/*']};
var useragent = null;
var activeTabId = 0;
var exist_request = {};


function start() {
    https_list = [];
    START_END_MOD = true;
    chrome.storage.local.set({
        "https_list": https_list
    });
}


function end() {
    START_END_MOD = false;

}

chrome.webRequest.onBeforeSendHeaders.addListener(info => {
    if (!START_END_MOD) {
        return
    }
    if (info.requestHeaders) {
        if (useragent && useragent != 'Current Browser') {
            // Replace the User-Agent header
            var headers = info.requestHeaders;
            headers.forEach(function (header) {
                if (header.name.toLowerCase() == 'user-agent') {
                    header.value = useragent;
                }
            });
            return {
                requestHeaders: headers
            };
        }
    } else {
        return {
            requestHeaders: []
        };
    }
}, RequestFilter, ['blocking', 'requestHeaders']);

chrome.webRequest.onBeforeRequest.addListener(info => {
    if (!START_END_MOD) {
        return
    }
    if (info.requestBody) {
        var postData = '';
        if (!info.requestBody.error) {
            if (info.requestBody.formData) {
                // If the request method is POST and the body is a sequence of key-value
                // pairs encoded in UTF8,
                // encoded as either multipart/form-data, or
                // application/x-www-form-urlencoded
                postData = info.requestBody.formData;
                // switch array to string
                for (var index in postData) {
                    postData[index] = postData[index].toString();
                }
            } else {
                // If the request method is PUT or POST, and the body is not already
                // parsed in formData, then the
                // unparsed request body elements are contained in this array.
                postData = [];
                if (info.requestBody.raw) {
                    info.requestBody.raw.forEach(function (raw) {
                        if (raw.bytes) {
                            var bodyString = '';
                            const bytes = new Uint8Array(raw.bytes);
                            const bodyLength = bytes.length;
                            for (var i = 0; i < bodyLength; i++) {
                                bodyString += String.fromCharCode(bytes[i]);
                            }
                            postData.push(bodyString);
                        } else {
                            // @todo:support for file uploads
                        }
                    });
                }
                // Encoding and Parsing Request Query String to key => value
                var dataString = '';
                for (var i = 0; i < postData.length; i++) {
                    dataString += (postData[i]);
                }
                // Check if data is correct JSON string
                try {
                    var jsonParsedString = JSON.parse(dataString);
                } catch (e) {

                }
                // If data is not correct JSON string parse it on key => value parameters
                if (!jsonParsedString) {
                    // Parsing Request Query String to key => value using URI.js library
                    // http://medialize.github.io/URI.js/docs.html#static-parseQuery
                    var parsedValue = URI.parseQuery(dataString);
                    if (!$.isEmptyObject(parsedValue)) {
                        // If query have not parsed not save it
                        var notParseFlag = false;
                        for (const prop in parsedValue) {
                            // if query not parsed URI.parseQuery method returns
                            // it like object with one property with null value
                            if (prop === dataString && parsedValue[prop] === null) {
                                notParseFlag = true;
                            }
                        }
                        if (!notParseFlag) {
                            postData = parsedValue;
                        }
                    }
                }
            }
        } else {
            if (info.requestBody.error !== "Unknown error.") {
                // console.log(chrome.runtime.lastError);
                googleAnalytics('send', 'exception', {
                    'exDescription': 'onBeforeRequest():' + chrome.runtime.lastError.message,
                    'exFatal': false
                });
            }
        }
        var key = info.method + info.requestId;
        body[key] = postData;
    }
}, RequestFilter, ['requestBody']);


chrome.webRequest.onSendHeaders.addListener(info => {
    if (!START_END_MOD) {
        return
    }
    chrome.storage.local.get(null, function (items) {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            if (tabs.length > 0) {
                if (tabs[0].hasOwnProperty('id')) {
                    activeTabId = tabs[0].id;
                }
            }
            if (info.tabId == activeTabId) {
                if (info.url == 'https://fonts.googleapis.com/css?family=Open+Sans:400,600,700&blazemeter-chrome-extension=true') {
                    //This exact url is used by Transaction Popup, ignore it
                    return;
                }

                for (var headers_index in info.requestHeaders) {
                    if (info.requestHeaders[headers_index].name == 'Origin') {
                        //If Origin is chrome-extension:// then ignore this request
                        if (info.requestHeaders[headers_index].value.startsWith('chrome-extension://')) {
                            return;
                        }
                    }
                }

                var key = info.method + info.requestId;
                data = {};
                var requestype = 'embedded';
                var request_subtype = ''; //Only for AJAX requests
                if (info.type == 'main_frame') {
                    requestype = 'top_level';
                } else if (info.type == 'xmlhttprequest') {
                    requestype = 'ajax';
                    //@todo: filter out by parentFrameId? If its not -1 then its coming from iframe.
                    for (var headers_index in info.requestHeaders) {
                        if (info.requestHeaders[headers_index].name == 'Origin' ||
                            info.requestHeaders[headers_index].name == 'Referer') {
                            //@todo: since Origin header is mostly used in CORS mark any requests with Origin as embedded?
                            var origin_host = (new URL(info.requestHeaders[headers_index].value)).hostname;
                            if (isFromRoot(origin_host, info.url)) {

                                if (url_is_filepath(info.url)) {
                                    //AJAX request is embedded file resource (JS, CSS, etc...)
                                    request_subtype = 'embedded_resource';
                                } else {
                                    //AJAX request is issued by an action from a user (eg: click, scrolling)
                                    request_subtype = 'top_level';
                                }
                            } else {
                                //AJAX request from 3rd party domain, mostly issued due to a JS (eg: analytics, tracking, ads)
                                request_subtype = 'embedded_external';

                            }
                            break;
                        }
                    }
                }

                data.url = data.label = info.url;
                data.method = info.method;
                if (body[key]) {
                    data.body = body[key];
                }
                data.requestId = info.requestId;
                data.request_type = requestype;
                data.request_subtype = request_subtype;
                data.timestamp = Math.round(info.timeStamp); // in ns??
                data.tabId = info.tabId;
                data.headers = info.requestHeaders;

                for (var index in data.headers) {
                    if (data.headers[index].name == 'Cookie') {
                        if (!cookie) {
                            // Don't record cookies
                            data.headers.splice(index, 1);
                        } else {
                            // Store cookie in the
                            var CookieArray = data.headers[index].value.split('; ');
                            data.cookies = CookieArray;
                        }
                        break;
                    }
                }

                https_list.push(data);
                chrome.storage.local.set({
                    "https_list": https_list
                });
            }
        });
    });
}, RequestFilter, ['requestHeaders']);


function isFromRoot(rootDomain, testURL) {
    if (typeof (testURL) === 'undefined') {
        return false;
    }
    var getDomainUrl = (new URL(testURL)).hostname;
    if (getDomainUrl === rootDomain) {
        return true;
    }

    var pattern = '([\\.]+' + rootDomain + ')(?![0-9a-zA-Z\\-\\.])';
    var expression = new RegExp(pattern, 'gi');
    return expression.test(getDomainUrl);
}


function url_is_filepath(url) {
    var filetype = get_url_extension(url);
    if (filetype) {
        var web_extensions = web_extensions_library();
        if ($.inArray(filetype, web_extensions) !== -1) {
            return true;
        }
    }
    return false;
}

function web_extensions_library() {
    //Source: https://github.com/AdelMahjoub/mime-type-nodejs/blob/master/mime-to-ext.json
    return ["atom", "json", "map", "topojson", "jsonld", "rss", "geojson", "rdf", "xml", "js", "webmanifest", "webapp", "appcache", "mid", "midi", "kar", "aac", "f4a", "f4b", "m4a", "mp3", "oga", "ogg", "opus", "ra", "wav", "bmp", "gif", "jpeg", "jpg", "jxr", "hdp", "wdp", "png", "svg", "svgz", "tif", "tiff", "wbmp", "webp", "jng", "3gp", "3gpp", "f4p", "f4v", "m4v", "mp4", "mpeg", "mpg", "ogv", "mov", "webm", "flv", "mng", "asf", "asx", "wmv", "avi", "cur", "ico", "doc", "xls", "ppt", "docx", "xlsx", "pptx", "deb", "woff", "woff2", "eot", "ttc", "ttf", "otf", "ear", "jar", "war", "hqx", "bin", "deb", "dll", "dmg", "img", "iso", "msi", "msm", "msp", "safariextz", "pdf", "ai", "eps", "ps", "rtf", "kml", "kmz", "wmlc", "7z", "bbaw", "torrent", "crx", "cco", "jardiff", "jnlp", "run", "iso", "oex", "pl", "pm", "pdb", "prc", "rar", "rpm", "sea", "swf", "sit", "tcl", "tk", "crt", "der", "pem", "xpi", "exe", "xhtml", "xsl", "zip", "css", "csv", "htm", "html", "shtml", "md", "mml", "txt", "vcard", "vcf", "xloc", "jad", "wml", "vtt", "htc", "desktop", "md", "ts", "ico", "jar", "so"];
}

function get_url_extension(url) {
    var file_extension = url.split(/\#|\?/)[0].split('.').pop().trim();
    if (/^[a-zA-Z0-9]*$/.test(file_extension) == true) {
        return file_extension;
    }

    return null;
}



