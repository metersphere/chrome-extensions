//taken from selenium patcher
(function() {

    function handleResponse(response) {
        let responseText;
        if (response.responseType === 'json') {
            responseText = JSON.parse(JSON.stringify(response.response));
        } else {
            responseText = response.responseText;
        }

        return responseText;
    }

    // console.log(window);
    // console.log("Intercepting Script");
    let send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function() {
        // console.log("XMLHttpRequest.prototype.send");
        this.addEventListener('readystatechange', function() {
            if (this.readyState === 4) {
                var self = this;
                window.top.postMessage({
                    direction: "from-page-monkey-patch-script",
                    response: "response",
                    value: {
                        "body" : handleResponse(self),
                        "responseUrl" : self.responseURL
                    }
                }, "*");
            }
        }, false);
        send.apply(this, arguments);
    };
    let open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
        // console.log("XMLHttpRequest.prototype.open");
        this.addEventListener('readystatechange', function() {
            if (this.readyState === 4) {
                var self = this;
                // console.log('self', self)
                window.top.postMessage({
                    direction: "from-page-monkey-patch-script",
                    response: "request",
                    value: {
                        "body" : handleResponse(self),
                        "responseUrl" : self.responseURL
                    }
                }, "*");
            }
        }, false);
        open.apply(this, arguments);
    };

    const constantMock = window.fetch;
    window.fetch = function() {
        return new Promise((resolve, reject) => {
            constantMock.apply(this, arguments)
                .then((response) => {
                    const responseForText = response.clone();
                    responseForText.text().then((text) => {
                        console.log('prpr', response);
                        window.top.postMessage({
                            direction: "from-page-monkey-patch-script",
                            response: "fetch",
                            value: {
                                "body" : text,
                                "responseUrl" : response.url
                            }
                        }, "*");
                        resolve(response);
                    });
                })
                .catch(() => {
                    reject(response);
                })
        });
    };
}());
