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
            if (value === null) {
                value = arguments[2];
            }
        }

        hasValue = value !== null;
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

            if (value !== null)
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

var Jmx = function (data) {
    this.data = data;
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

        let testPlan = new TestPlan();
        testPlan.boolProp("TestPlan.functional_mode", false);
        testPlan.boolProp("TestPlan.serialize_threadgroups", false);
        testPlan.boolProp("TestPlan.tearDown_on_shutdown", true);
        testPlan.stringProp("TestPlan.comments", "");
        testPlan.stringProp("TestPlan.user_define_classpath", "");
        hashTree.addValue(testPlan);

        let threadGroup = new ThreadGroup();
        hashTree.addValue(threadGroup);
        threadGroup.intProp("ThreadGroup.num_threads", 1);
        threadGroup.intProp("ThreadGroup.ramp_time", 1);
        threadGroup.longProp("ThreadGroup.delay", 0);
        threadGroup.longProp("ThreadGroup.duration", 0);
        threadGroup.stringProp("ThreadGroup.on_sample_error", "continue");
        threadGroup.boolProp("ThreadGroup.scheduler", false);

        let lc = new LoopController();
        threadGroup.addValue(lc);
        lc.boolProp("LoopController.continue_forever", false);
        lc.stringProp("LoopController.loops", 1);

        let ht = new HashTree();
        hashTree.addValue(ht);

        if (this.data !== null) {
            this.data.forEach(function (item) {
                let hsp = new HTTPSamplerProxy(item.label);
                let url = new URL(item.url);
                hsp.stringProp("HTTPSampler.protocol", url.protocol);
                hsp.stringProp("HTTPSampler.path", url.pathname + url.search);
                hsp.stringProp("HTTPSampler.method", item.method);
                hsp.stringProp("HTTPSampler.domain", url.hostname);
                hsp.intProp("HTTPSampler.port", url.port);
                ht.addValue(hsp);
            });
        }

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


let LoopController = function () {
    HashTree.call(this, "elementProp", {
        name: "ThreadGroup.main_controller",
        elementType: "LoopController",
        guiclass: "LoopControlPanel",
        testclass: "LoopController",
        testname: "Loop Controller",
        enabled: "true"
    });
};
LoopController.prototype = new HashTree();


/**
 * HTTPSamplerProxy
 *
 */
let HTTPSamplerProxy = function (name) {
    HashTree.call(this, "HTTPSamplerProxy", {
        guiclass: "HttpTestSampleGui",
        testname: name,
    });
};

HTTPSamplerProxy.prototype = new HashTree();






