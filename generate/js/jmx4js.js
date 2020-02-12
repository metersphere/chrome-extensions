/**
 * JS 生成 JMX
 * 作者：W23123
 * 日期：2020-02-11
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
    }
};


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
        jmeterTestPlan.addSubElement(hashTree);
        hashTree.addSubElement(new TestPlan());
        return jmeterTestPlan;
    }
};


function generateXml(xml, hashTree) {
    xml.write(hashTree.element, hashTree.attributes, function () {
        if (hashTree.funcs.length > 0) {
            hashTree.funcs.forEach(function (v) {
                generateXml(xml, v);
            })
        }
    });
}


let HashTree = function (element, attributes) {
    /**
     * 元素名称
     */
    this.element = element || "hashTree";
    /**
     * 元素属性 key-value
     */
    this.attributes = attributes || {};

    this.funcs = [];
};

HashTree.prototype.addSubElement = function (hashTree) {
    this.funcs.push(hashTree)
};

let JmeterTestPlan = function (options = {}) {
    HashTree.call(this, "jmeterTestPlan",
        {
            version: options.version || "1.2",
            properties: options.properties || "5.0",
            jmeter: options.jmeter || "5.2.1"
        });
};
JmeterTestPlan.prototype = new HashTree();


let TestPlan = function (options = {}) {
    HashTree.call(this, "TestPlan", {
        guiclass: options.guiclass || "TestPlanGui",
        testclass: options.testclass || "TestPlan",
        testname: options.testname || "Plan",
        enabled: options.enabled || "true"
    });
};
TestPlan.prototype = new HashTree();

let HeaderManager = function (options = {}) {
    HashTree.call(this, "HeaderManager", {
        guiclass: options.guiclass || "HeaderPanel",
        testclass: options.testclass || "HeaderManager",
        testname: options.testname || "HTTP Header manager",
        enabled: options.enabled || "true"
    });
};
HeaderManager.prototype = new HashTree();
HeaderManager.prototype.addProterties = function () {

};

let HTTPSamplerProxy = function () {
    HashTree.call(this, "HTTPSamplerProxy", {
        guiclass: options.guiclass || "TestPlanGui",
        testclass: options.testclass || "TestPlan",
        testname: options.testname || "Plan",
        enabled: options.enabled || "true"
    });
};






