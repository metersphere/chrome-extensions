/**
 * JS 生成 JMX
 * 作者：W23123
 * 日期：2020-02-11
 */


function Xml4js(options = {}) {
    this.depth = 0;
    this.encoding = options.encoding || 'UTF-8';
    this.xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    this.prototype = {
        write: function () {
            let context = this,
                elem = null,
                attr = null,
                value = null,
                callback = false,
                fn = null,
                hasValue = null,
                empty = null;

            elem = arguments[0];

            if (typeof arguments[1] == 'object') {
                attr = arguments[1];
            } else if (typeof arguments[1] == 'function') {
                callback = true;
                fn = arguments[1];
            } else {
                value = arguments[1];
            }

            if (typeof arguments[2] == 'function') {
                if (!callback) {
                    callback = true;
                    fn = arguments[2];
                }
            } else {
                if (!value)
                    value = arguments[2];
            }

            hasValue = value ? true : false;
            hasChilds = callback ? true : false;
            empty = !hasValue && !hasChilds;

            function indent(depth) {
                if (depth == null)
                    return '';

                var space = '';
                for (var i = 0; i < depth; i++)
                    if (context.tabs)
                        space += "\t";
                    else
                        space += '  ';

                return space;
            }

            if (elem == 'cdata') {
                this.xml += indent(this.depth) + '<![CDATA[' + value + ']]>\n';
            } else {
                this.xml += indent(this.depth) + '<' + elem;
                if (attr) {
                    for (var key in attr) {
                        this.xml += ' ';
                        this.xml += key + '="' + attr[key] + '"';
                    }
                }

                if (value)
                    this.xml += '>' + value + '</' + elem + '>\n';

                if (callback) {
                    this.xml += '>\n'
                    this.depth++;
                    fn();
                    this.depth--;
                    this.xml += indent(this.depth) + '</' + elem + '>\n'
                }

                if (empty)
                    this.xml += '/>\n';
            }
        },
        toString: function () {
            return this.xml;
        }
    };
}


function Jmx(options = {}) {
    let resultData;
    chrome.storage.local.get(['recordData'], function (items) {
        resultData = items.recordData;
    });

    this.prototype = {
        generate: function () {
            let xml = new Xml4js();

            xml.write("jmeterTestPlan", {version: "1.2"}, function () {
                xml.write("hashTree", function () {
                    xml.write("TestPlan", {
                        guiclass: "TestPlanGui",
                        testclass: "TestPlan",
                        testname: "Test Plan",
                        enabled: "true"
                    }, function () {
                        xml.write("stringProp", {name: "TestPlan.comments"})
                    })
                })
            });
            return xml.toString();
        }
    };
}


function HeaderManager(options = {}) {
    this.name = ""
}

function HttpSamplerProxy(options = {}) {
    this.name = "";
    let plan = TestPlan();
    plan.open11().open11();
}

function TestPlan(options = {}) {
    this.testname = options.testname || "Plan";
    this.testclass = options.testclass || "TestPlan";
    this.guiclass = options.guiclass || "TestPlanGui";

    this.prototype = {
        open11: function () {
            return this;
        }
    }
}



