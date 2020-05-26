const INDENT = '  '; // 缩进2空格

class Element {
    constructor(name, attributes, value) {
        this.indent = '';
        this.name = name;  // 标签名
        this.attributes = attributes || {}; // 属性
        this.value = undefined; // 基础类型的内容
        this.elements = []; // 子节点

        if (value instanceof Element) {
            this.elements.push(value);
        } else {
            this.value = value;
        }
    }

    set(value) {
        this.elements = [];
        this.value = value;
    }

    add(element) {
        if (element instanceof Element) {
            this.value = undefined;
            this.elements.push(element);
            return element;
        }
    }

    getDefault(value, defaultValue) {
        return value === undefined ? defaultValue : value;
    }

    commonValue(tag, name, value, defaultValue) {
        let v = this.getDefault(value, defaultValue)
        return this.add(new Element(tag, {name: name}, v));
    }

    boolProp(name, value, defaultValue) {
        return this.commonValue('boolProp', name, value, defaultValue);
    }

    intProp(name, value, defaultValue) {
        return this.commonValue('intProp', name, value, defaultValue);
    }

    longProp(name, value, defaultValue) {
        return this.commonValue('longProp', name, value, defaultValue);
    }

    stringProp(name, value, defaultValue) {
        return this.commonValue('stringProp', name, value, defaultValue);
    }

    collectionProp(name) {
        return this.commonValue('collectionProp', name);
    }

    elementProp(name, elementType) {
        return this.add(new Element('elementProp', {name: name, elementType: elementType}));
    }

    isEmptyValue() {
        return this.value === undefined || this.value === '';
    }

    isEmptyElement() {
        return this.elements.length === 0;
    }

    isEmpty() {
        return this.isEmptyValue() && this.isEmptyElement();
    }

    toXML(indent) {
        if (indent) {
            this.indent = indent;
        }

        let str = this.start();
        str += this.content();
        str += this.end();
        return str;
    }

    start() {
        let str = this.indent + '<' + this.name;
        for (let key in this.attributes) {
            if (this.attributes.hasOwnProperty(key)) {
                str += ' ' + key + '="' + this.attributes[key] + '"';
            }
        }
        if (this.isEmpty()) {
            str += '/>';
        } else {
            str += '>';
        }
        return str;
    }

    content() {
        if (!this.isEmptyValue()) {
            return this.value;
        }

        let str = '';
        let parent = this;
        if (this.elements.length > 0) {
            str += '\n';
            this.elements.forEach(e => {
                e.indent += parent.indent + INDENT;
                str += e.toXML();
            });
        }
        return str;
    }

    end() {
        if (this.isEmpty()) {
            return '\n';
        }
        let str = '</' + this.name + '>\n';
        if (!this.isEmptyValue()) {
            return str;
        }
        if (!this.isEmptyElement()) {
            return this.indent + str;
        }
    }
}

// HashTree, 只能添加TestElement的子元素，没有基础类型内容
class HashTree extends Element {
    constructor() {
        super('hashTree');
    }

    add(te) {
        if (te instanceof TestElement) {
            super.add(te);
        }
    }
}

// TestElement包含2部分，Element 和 HashTree
class TestElement extends Element {
    constructor(name, attributes, value) {
        // Element, 只能添加Element
        super(name, attributes, value);
        // HashTree, 只能添加TestElement
        this.hashTree = new HashTree();
    }

    put(te) {
        this.hashTree.add(te);
    }

    toXML() {
        let str = super.toXML();
        str += this.hashTree.toXML(this.indent);
        return str;
    }
}

class DefaultTestElement extends TestElement {
    constructor(tag, guiclass, testclass, testname, enabled) {
        super(tag, {
            guiclass: guiclass,
            testclass: testclass,
            testname: testname === undefined ? tag + ' Name' : testname,
            enabled: enabled || true
        });
    }
}

class TestPlan extends DefaultTestElement {
    constructor(testName, props) {
        super('TestPlan', 'TestPlanGui', 'TestPlan', testName);

        props = props || {};
        this.boolProp("TestPlan.functional_mode", props.mode, false);
        this.boolProp("TestPlan.serialize_threadgroups", props.stg, false);
        this.boolProp("TestPlan.tearDown_on_shutdown", props.tos, true);
        this.stringProp("TestPlan.comments", props.comments);
        this.stringProp("TestPlan.user_define_classpath", props.classpath);
        this.add(new ElementArguments(props.args, "TestPlan.user_defined_variables", "User Defined Variables"));
    }
}

class ThreadGroup extends DefaultTestElement {
    constructor(testName, props) {
        super('ThreadGroup', 'ThreadGroupGui', 'ThreadGroup', testName);

        props = props || {};
        this.intProp("ThreadGroup.num_threads", props.threads, 1);
        this.intProp("ThreadGroup.ramp_time", props.ramp, 1);
        this.longProp("ThreadGroup.delay", props.delay, 0);
        this.longProp("ThreadGroup.duration", props.delay, 0);
        this.stringProp("ThreadGroup.on_sample_error", props.error, "continue");
        this.boolProp("ThreadGroup.scheduler", props.scheduler, false);

        let loopAttrs = {
            name: "ThreadGroup.main_controller",
            elementType: "LoopController",
            guiclass: "LoopControlPanel",
            testclass: "LoopController",
            testname: "Loop Controller",
            enabled: "true"
        };
        let loopProps = props.loopProps || {};
        let loopController = this.add(new Element('elementProp', loopAttrs));
        loopController.boolProp('LoopController.continue_forever', loopProps.continue, false);
        loopController.stringProp('LoopController.loops', loopProps.loops, 1);
    }
}

class HTTPSamplerProxy extends DefaultTestElement {
    constructor(testName, request) {
        super('HTTPSamplerProxy', 'HttpTestSampleGui', 'HTTPSamplerProxy', testName);
        this.request = request || {};

        this.stringProp("HTTPSampler.domain", this.request.hostname);
        this.stringProp("HTTPSampler.protocol", this.request.protocol.split(":")[0]);
        this.stringProp("HTTPSampler.path", this.request.pathname);
        this.stringProp("HTTPSampler.method", this.request.method);
        if (!this.request.port) {
            this.stringProp("HTTPSampler.port", "");
        } else {
            this.stringProp("HTTPSampler.port", this.request.port);
        }

        this.boolProp("HTTPSampler.follow_redirects", this.request.follow, true);
    }
}

// 这是一个Element
class HTTPSamplerArguments extends Element {
    constructor(args) {
        super('elementProp', {
            name: "HTTPsampler.Arguments", // s必须小写
            elementType: "Arguments",
            guiclass: "HTTPArgumentsPanel",
            testclass: "Arguments",
            enabled: "true"
        });

        this.args = args || [];

        let collectionProp = this.collectionProp('Arguments.arguments');
        this.args.forEach(arg => {
            let elementProp = collectionProp.elementProp(arg.name, 'HTTPArgument');
            elementProp.boolProp('HTTPArgument.always_encode', arg.encode, true);
            elementProp.boolProp('HTTPArgument.use_equals', arg.equals, true);
            if (arg.name) {
                elementProp.stringProp('Argument.name', arg.name);
            }
            elementProp.stringProp('Argument.value', arg.value);
            elementProp.stringProp('Argument.metadata', arg.metadata || "=");
        });
    }
}

class HeaderManager extends DefaultTestElement {
    constructor(testName, headers) {
        super('HeaderManager', 'HeaderPanel', 'HeaderManager', testName);
        this.headers = headers || [];

        let collectionProp = this.collectionProp('HeaderManager.headers');
        this.headers.forEach(header => {
            let elementProp = collectionProp.elementProp('', 'Header');
            elementProp.stringProp('Header.name', header.name);
            elementProp.stringProp('Header.value', header.value);
        });
    }
}

class AuthManager extends DefaultTestElement {
    constructor(testName, auths, props) {
        super("AuthManager", "AuthPanel", "AuthManager", testName || "HTTP Authorization Manager");
        this.auths = auths || [];
        this.props = props || {};

        this.boolProp('AuthManager.clearEachIteration', this.props.clear, false);
        this.boolProp('AuthManager.controlledByThreadGroup', this.props.control, false);

        let collectionProp = this.collectionProp('AuthManager.auth_list');
        this.auths.forEach(auth => {
            let elementProp = collectionProp.elementProp('', 'Authorization')
            elementProp.stringProp('Authorization.url', auth.url);
            elementProp.stringProp('Authorization.username', auth.username);
            elementProp.stringProp('Authorization.password', auth.password);
            elementProp.stringProp('Authorization.domain', auth.domain);
            elementProp.stringProp('Authorization.realm', auth.realm);
        });
    }
}

class DNSCacheManager extends DefaultTestElement {
    constructor(testName, servers, hosts, props) {
        super("DNSCacheManager", "DNSCachePanel", "DNSCacheManager", testName || "DNS Cache Manager");
        this.servers = servers || [];
        this.hosts = hosts || [];
        this.props = props || {};

        this.boolProp('DNSCacheManager.clearEachIteration', this.props.clear, false);
        this.boolProp('DNSCacheManager.isCustomResolver', this.props.custom, false);

        let serversCollectionProp = this.collectionProp('DNSCacheManager.servers');
        this.servers.forEach(server => {
            let random = Math.floor(Math.random() * 10000);
            serversCollectionProp.stringProp(random, server)
        });

        let hostsCollectionProp = this.collectionProp('DNSCacheManager.hosts');
        this.hosts.forEach(host => {
            let elementProp = hostsCollectionProp.elementProp(host.name, 'StaticHost')
            elementProp.stringProp('StaticHost.Name', host.name);
            elementProp.stringProp('StaticHost.Address', host.value);
        });
    }
}

class CookieManager extends DefaultTestElement {
    constructor(testName, cookies, props) {
        super("CookieManager", "CookiePanel", "CookieManager", testName || "HTTP Cookie Manager");
        this.cookies = cookies || [];
        this.props = props || {};

        this.boolProp('CookieManager.clearEachIteration', this.props.clear, false);
        this.boolProp('CookieManager.controlledByThreadGroup', this.props.control, false);

        let collectionProp = this.collectionProp('CookieManager.cookies');
        this.cookies.forEach(cookie => {
            let elementProp = collectionProp.elementProp(cookie.name, 'Cookie')
            elementProp.stringProp('Cookie.value', cookie.value);
            elementProp.stringProp('Cookie.path', cookie.path);
            elementProp.boolProp('Cookie.secure', cookie.secure, false);
            elementProp.longProp('Cookie.value', cookie.expires, 0);
            elementProp.boolProp('Cookie.path_specified', true);
            elementProp.boolProp('Cookie.domain_specified', cookie.true);
        });
    }
}

class CacheManager extends DefaultTestElement {
    constructor(testName, props) {
        super("CacheManager", "CacheManagerGui", "CacheManager", testName || "HTTP Cache Manager");
        this.props = props || {};

        this.boolProp('clearEachIteration', this.props.clear, false);
        this.boolProp('CacheManager.controlledByThreadGroup', this.props.control, false);
        this.boolProp('useExpires', this.props.expires, true);
    }
}

class Arguments extends DefaultTestElement {
    constructor(testName, args) {
        super('Arguments', 'ArgumentsPanel', 'Arguments', testName);
        this.args = args || [];

        let collectionProp = this.collectionProp('Arguments.arguments');
        this.args.forEach(arg => {
            let elementProp = collectionProp.elementProp(arg.name, 'Argument');
            elementProp.stringProp('Argument.name', arg.name);
            elementProp.stringProp('Argument.value', arg.value);
            elementProp.stringProp('Argument.desc', arg.desc);
            elementProp.stringProp('Argument.metadata', arg.metadata, "=");
        });
    }
}

class ElementArguments extends Element {
    constructor(args, name, testName) {
        super('elementProp', {
            name: name || "arguments",
            elementType: "Arguments",
            guiclass: "ArgumentsPanel",
            testclass: "Arguments",
            testname: testName || "",
            enabled: "true"
        });

        let collectionProp = this.collectionProp('Arguments.arguments');
        if (args) {
            args.forEach(arg => {
                let elementProp = collectionProp.elementProp(arg.name, 'Argument');
                elementProp.stringProp('Argument.name', arg.name);
                elementProp.stringProp('Argument.value', arg.value);
                elementProp.stringProp('Argument.metadata', arg.metadata, "=");
            });
        }
    }
}

class JMXRequest {
    constructor(item, domains) {
        let url = new URL(item.url);
        this.method = item.method;
        this.hostname = "${" + domains[url.hostname] + "}";
        this.pathname = url.pathname;
        this.port = url.port;
        this.protocol = url.protocol.split(":")[0];
        this.parameters = [];
        if (this.method.toUpperCase() !== "GET") {
            this.pathname += url.search.replace('&', '&amp;');
        }
        url.searchParams.forEach((value, key) => {
            if (key && value) {
                this.parameters.push({name: key, value: value});
            }
        });
    }
}

class JMeterTestPlan extends Element {
    constructor() {
        super('jmeterTestPlan', {
            version: "1.2", properties: "5.0", jmeter: "5.2.1"
        });

        this.add(new HashTree());
    }

    put(te) {
        if (te instanceof TestElement) {
            this.elements[0].add(te);
        }
    }
}

class JMXGenerator {
    constructor(data, name, ds) {
        this.data = data;
        this.name = name;
        let domains = {};
        ds.forEach((name, index) => {
            domains[name] = "BASE_URL_" + index;
        });
        this.domains = domains;

        let testPlan = new TestPlan(this.name);
        testPlan.put(this.getVariables());
        testPlan.put(this.getHeaderManager());
        testPlan.put(this.getDNSCacheManager());
        testPlan.put(this.getAuthManager());
        testPlan.put(this.getCookieManager());
        testPlan.put(this.getCacheManager());

        let threadGroup = new ThreadGroup("Thread Group");
        this.getRequestSamplers().forEach(sampler => {
            threadGroup.put(sampler);
        })
        testPlan.put(threadGroup);
        this.jmeterTestPlan = new JMeterTestPlan();
        this.jmeterTestPlan.put(testPlan);
    }

    getVariables() {
        let args = [];
        for (let host in this.domains) {
            if (this.domains.hasOwnProperty(host)) {
                args.push({name: this.domains[host], value: host});
            }
        }
        return new Arguments("User Defined Variables", args);
    }

    getHeaderManager() {
        return new HeaderManager("Header Manager");
    }

    getDNSCacheManager() {
        return new DNSCacheManager('DNS Cache Manager');
    }

    getAuthManager() {
        return new AuthManager('HTTP Authorization Manager');
    }

    getCookieManager() {
        return new CookieManager('HTTP Cookie Manager');
    }

    getCacheManager() {
        return new CacheManager('HTTP Cache Manager');
    }

    getRequestSamplers() {
        let self = this;
        let samplers = [];
        this.data.forEach(function (item) {
            let url = new URL(item.url);
            if (self.domains[url.hostname]) {
                let name = self.replace(item.label);
                let request = new JMXRequest(item, self.domains);
                let httpSamplerProxy = new HTTPSamplerProxy(name || "", request);
                httpSamplerProxy.put(new HeaderManager(name + " Headers", item.headers));

                if (item.method.toUpperCase() === 'GET') {
                    httpSamplerProxy.add(new HTTPSamplerArguments(request.parameters));
                } else {
                    let args = [];
                    // raw
                    if (item.body instanceof Array) {
                        httpSamplerProxy.boolProp('HTTPSampler.postBodyRaw', true);
                        args.push({name: '', value: item.body[0], encode: false});
                    } else {
                        // form-data, x-www-form-urlencoded
                        for (let key in item.body) {
                            if (item.body.hasOwnProperty(key)) {
                                args.push({name: key, value: item.body[key], encode: false});
                            }
                        }
                    }
                    httpSamplerProxy.add(new HTTPSamplerArguments(args));
                }
                samplers.push(httpSamplerProxy);
            }
        });
        return samplers;
    }

    replace(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&apos;").replace(/"/g, "&quot;");
    }

    toXML() {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += this.jmeterTestPlan.toXML();
        return xml;
    }
}
