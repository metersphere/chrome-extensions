/**
 * JS 生成 JMX
 * 作者：W23123
 * 日期：2020-02-11
 */


/**
 *具体生成 XML 工具对象
 */
let Xml4js = function (options = {}) {
    this.depth = 0;
    this.encoding = options.encoding || 'UTF-8';
    this.xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
};

Xml4js.prototype = {
    toString: function () {
        return this.xml;
    },
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
            if (value !== undefined) {
                value = arguments[2];
            }
        }

        hasValue = value !== undefined;
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

            if (value !== undefined)
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
    }
};


/**
 *
 *JMX 构造对象
 */

var Jmx = function () {
    let resultData;
    chrome.storage.local.get(['recordData'], function (items) {
        resultData = items.recordData;
    });
    this.xml = new Xml4js();
};

Jmx.prototype = {
    generate: function () {
        generateXml(this.xml, this.preprocessing());
        return this.xml.toString();
    },
    preprocessing: function () {
        let jmeterTestPlan = new JmeterTestPlan();
        let hashTree = new HashTree();
        jmeterTestPlan.addValue(hashTree);
        let threadGroup = new ThreadGroup();
        hashTree.addValue(threadGroup);

        threadGroup.threadNums(1);
        threadGroup.rampTime(1);
        threadGroup.delay(0);
        threadGroup.duration(0);
        threadGroup.onSampleError("continue");
        threadGroup.scheduler(false);

        return jmeterTestPlan;
    }
};


function generateXml(xml, hashTree) {
    if (hashTree.values.length > 0 && !(hashTree.values[0] instanceof HashTree)) {
        xml.write(hashTree.element, hashTree.attributes, hashTree.values[0]);
    } else {
        xml.write(hashTree.element, hashTree.attributes, function () {
            if (hashTree.values.length > 0) {
                hashTree.values.forEach(function (v) {
                    generateXml(xml, v);
                })
            }
        });
    }
}


/**
 * HashTree 初始对象
 */
let HashTree = function (element, attributes, value) {
    this.element = element || "hashTree";
    this.attributes = attributes || {};
    this.values = [];
    if (value !== undefined) {
        this.values.push(value);
    }
};

HashTree.prototype.addValue = function (hashTree) {
    this.values.push(hashTree)
};

HashTree.prototype.commonValue = function (element, name, value) {
    this.values.push(new HashTree(element, {name: name}, value))
};

HashTree.prototype.intProp = function (name, value) {
    this.commonValue("intProp", name, value);
};

HashTree.prototype.longProp = function (name, value) {
    this.commonValue("longProp", name, value);
};

HashTree.prototype.stringProp = function (name, value) {
    this.commonValue("stringProp", name, value);
};

HashTree.prototype.boolProp = function (name, value) {
    this.commonValue("boolProp", name, value);
};


/**
 * HashTree 的帮助对象
 */

let CHashTree = function (element, guiclass, testclass, testname, enabled) {
    HashTree.call(this, element, {
        guiclass: guiclass,
        testclass: testclass,
        testname: testname || "TEST",
        enabled: enabled || "true"
    });
};
CHashTree.prototype = new HashTree();


/**
 * JmeterTestPlan
 *
 */
let JmeterTestPlan = function (options = {}) {
    HashTree.call(this, "jmeterTestPlan",
        {
            version: options.version || "1.2",
            properties: options.properties || "5.0",
            jmeter: options.jmeter || "5.2.1"
        });
};
JmeterTestPlan.prototype = new HashTree();


/**
 * TestPlan
 *
 */
let TestPlan = function () {
    CHashTree.call(this, "TestPlan", "TestPlanGui", "TestPlan");
};
TestPlan.prototype = new CHashTree();


/**
 * HeaderManager
 *
 */
let HeaderManager = function () {
    CHashTree.call(this, "HeaderManager", "HeaderPanel", "HeaderManager", "HTTP Header manager");
};
HeaderManager.prototype = new CHashTree();


/**
 * ThreadGroup
 *
 */
let ThreadGroup = function () {
    CHashTree.call(this, "ThreadGroup", "ThreadGroupGui", "ThreadGroup", "Group1");
};
ThreadGroup.prototype = new CHashTree();

ThreadGroup.prototype.threadNums = function (value) {
    this.intProp("ThreadGroup.num_threads", value);
};

ThreadGroup.prototype.rampTime = function (value) {
    this.intProp("ThreadGroup.ramp_time", value);
};

ThreadGroup.prototype.delay = function (value) {
    this.longProp("ThreadGroup.delay", value);
};

ThreadGroup.prototype.duration = function (value) {
    this.longProp("ThreadGroup.duration", value);
};

ThreadGroup.prototype.onSampleError = function (value) {
    this.stringProp("ThreadGroup.on_sample_error", value);
};
ThreadGroup.prototype.scheduler = function (value) {
    this.boolProp("ThreadGroup.scheduler", value);
};

let LoopController = function () {
    CHashTree.call(this, "elementProp", "LoopControlPanel", "LoopController", "Loop Controller");
};
ThreadGroup.prototype = new CHashTree();

/**
 * HTTPSamplerProxy
 *
 */
let HTTPSamplerProxy = function () {
    HashTree.call(this, "HTTPSamplerProxy", {
        guiclass: options.guiclass || "TestPlanGui",
        testclass: options.testclass || "TestPlan",
        testname: options.testname || "Plan",
        enabled: options.enabled || "true"
    });
};






