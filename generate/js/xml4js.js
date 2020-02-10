/*
 *  xml4js v1.0.0 by poliveira89 (github)
 *  Copyright 2013 Paulo Oliveira
 *  Licensed under MIT License
 *  <URL>
 */

function xml4js(options = {}) {
	this.depth = 0;
	this.encoding = options.encoding || 'UTF-8';
	this.tabs = options.tabs == undefined ? false : options.tabs;
	var declaration = options.declaration == undefined ? true : options.declaration;
	this.xml = declaration ? '<?xml version="1.0" encoding="' + this.encoding + '"?>\n' : '';
}

xml4js.prototype.write = function() {
	var context = this,
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
	}
	else if (typeof arguments[1] == 'function') {
		callback = true;
		fn = arguments[1];
	}
	else {
		value = arguments[1];
	}	

	if (typeof arguments[2] == 'function') {
		if (!callback) {
			callback = true;
			fn = arguments[2];
		}
	}
	else {
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
		for (var i=0; i<depth; i++)
			if (context.tabs)
				space += "\t";
			else
				space += '  ';

		return space;
	}

	if (elem == 'cdata') {
		this.xml += indent(this.depth) + '<![CDATA[' + value + ']]>\n';
	}
	else {
		this.xml += indent(this.depth) + '<' + elem;
		if (attr) {
			this.xml += ' ';
			for (var key in attr)
				this.xml +=  key + '="' + attr[key] + '"';
		}
		
		if (value)
			this.xml +=  '>' + value + '</' + elem + '>\n';
		
		if (callback) {
			this.xml += '>\n'
			this.depth++;
			fn();
			this.depth--;
			this.xml += indent(this.depth) + '</' + elem + '>\n'
		}
		
		if (empty)
			this.xml += ' />\n';
	}
}

xml4js.prototype.toString = function() {
	return this.xml;
}