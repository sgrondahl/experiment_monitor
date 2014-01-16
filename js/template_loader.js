
/*global $ jQuery _*/

var $TL = new TemplateLoader();

function TemplateLoader(cb) {
    this.callback = typeof cb === 'function' ? cb : function() {};
    this.outstanding = [];
}

TemplateLoader.prototype.ready = function(cb) {
    this.callback = cb;
    this.resolveAll();
};

TemplateLoader.prototype.tryCallback = function() {
    if (this.outstanding.length === 0) this.callback();
};

TemplateLoader.prototype.add = function(src, id) {
    this.outstanding.push({src : src, id : id});
};

TemplateLoader.prototype.resolveAll = function() {
    var self = this;
    _.each(this.outstanding, function(el) {
	(function(e) {
	    $.get(e.src, function(data) {
		$(document.createElement('script')).attr('type', 'text/template').attr('id', e.id).html(data).appendTo('body');
		self.outstanding.splice(self.outstanding.indexOf(e), 1);
		self.tryCallback();
	    });
	})(el);
    });
};
