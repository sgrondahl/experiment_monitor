/*global $ jQuery _ Model*/



function hasDuplicates(arr) {
    var seen = [];
    for (var i = 0; i < arr.length; i++) {
	if (seen.indexOf(arr[i]) < 0) {
	    seen.push(arr[i]);
	} else {
	    return true;
	}
    }
    return false;
};

jQuery.fn.EditableTable = function(args) {
    return new EditableTable($(this[0]), args);
};
 
var EditableTable = Model.extend(
{
    constructor : function(el, args) {
	var i;
	if (typeof args !== 'object') throw new Error('EditableTable constructor expects object args.');
	if (typeof args.fields !== 'object') throw new Error('EditableTable constructor expects args.fields to be field -> type array.');
	if (!args.field_order instanceof Array) throw new Error('EditableTable expects args.field_order to be ordered array of fields.');
	if (hasDuplicates(args.field_order)) throw new Error('args.field_order has duplicate entries');
	if (args.field_order.length != _.keys(args.fields).length) throw new Error('length mismatch between args.fields and args.field_order');
	for (i = 0; i < args.field_order.length; i++) {
	    if (!_.has(args.fields, args.field_order[i]))
		throw new Error('args.fields and args.field_order must contain the same fields!');
	}
	if (!args.editable instanceof Array) throw new Error('EditableTable expects args.editable to be array of editable fields.');
	if (args.editable.length < 1) throw new Error('args.editable should be >= 1, else this wouldn\'t be an editable table!');
	for (i = 0; i < args.editable.length; i++) {
	    if (args.field_order.indexOf(args.editable[i]) < 0)
		throw new Error('All editable fields must also show up in fields list. Found "'
				+ args.editable[i] + '" that violates this condition.');
	}
	this.processFilters(args.filters);
	this.fields = args.fields;
	this.field_order = args.field_order;
	this.editable = args.editable;
	this.entries = {};
	this.ordered_entries = [];
	this.onupdate = typeof args.onupdate === 'function' ? args.onupdate : function(k, v) { console.log(k + ' : ' + v); };
	this.$el = $(el);
	var template = $('#editable-table-template').html();
	this.$el.html(_.template(template, { field_order : this.field_order, 
					     filters : this.filters }));
	this.$tbody = this.$el.find('tbody:first');
	this.bindSelectAll();
	this.bindColumnSorts();
	this.bindFilters();
	if (typeof args.entries === 'object') this.update(args.entries);
    },
    resizeColumns : function() {
	/* First pass to calculate the number of characters in each column. */
	var column_chars = {},
	    total_chars = 0,
	    smoothing_param = 0.05,
	    smoothing_chars = 0,
	    self = this;
	_.each(this.entries, function(e, _g) {
	    _.each(e.serialize(), function(v, k) {
		if (column_chars[k] === undefined) column_chars[k] = String(v).length;
		else column_chars[k] += String(v).length;
		total_chars += String(v).length;
	    });
	});

	/* Smooth width. */
	smoothing_chars = parseInt(total_chars * smoothing_param);
	_.each(column_chars, function(v, k) {
	    column_chars[k] += smoothing_chars;
	    total_chars += smoothing_chars;
	});
	
	/* Scale and apply css. */
	_.each(column_chars, function(v, k) {
	    self.$tbody.find('[data-field="'+k+'"]').parent().css('width', (100 * v / total_chars) + '%');
	});
    },
    processFilters : function(filters) {	
	var self = this;
	this.filters = {};
	if (filters === undefined) return;

	if (typeof filters !== 'object') throw new Error('filters must be a name -> filter (function) map.');

	_.each(filters, function(f, k) {
	    if (typeof k !== 'string') throw new Error('each filter must be attached to a name');
	    if (typeof f !== 'function') throw new Error('each filter must be a function');
	    self.filters[k] = f;
	});
    },
    bindFilters : function() {
	var self = this;
	this.$el.find('[data-field="__filter__"]').change(function() {
	    var filter = $(this).find(':selected').text();
	    if (filter === 'all') self.unfilter();
	    else if (!_.has(self.filters, filter)) throw new Error('Can\'t find filter "' + filter + '" in filter list.');
	    else self.filter(self.filters[filter]);
	});
    },
    update : function(data) {
	var self = this;
	_.each(data, function(v, k) {
	    if (!_.has(self.entries, k)) {
		self.entries[k] = new EditableEntry({ fields : self.fields,
						      field_order : self.field_order,
						      editable : self.editable,
						      onupdate : function(_v) { self.onupdate(k, _v); } });
		self.ordered_entries.push(self.entries[k]);
	    }
	    self.entries[k].update(v);
	});
	this.render();
    },
    getSelected : function() {
	var od = {};
	_.each(this.entries, function(v, k) {
	    console.log(v);
	    if (v.selected()) od[k] = v.serialize();
	});
	return od;
    },
    sort : function(comparitor, reverse) {
	function sortBy(kg) {
	    return function qsort(arr) {
		if (arr.length < 2) {
		    return arr;
		} else if (arr.length == 2) {
		    if (kg(arr[0]) < kg(arr[1])) return arr;
		    else return [arr[1], arr[0]];
		} else {
		    var pkey = kg(arr[Math.floor(arr.length/2)]);
		    var h = [], l = [], e = [];
		    for (var i = 0; i < arr.length; i++) {
			if (kg(arr[i]) < pkey) l.push(arr[i]);
			else if (kg(arr[i]) == pkey) e.push(arr[i]);
			else h.push(arr[i]);
		    }
		    return qsort(l).concat(e, qsort(h));
		}
	    };
	}
	
	if (typeof comparitor !== 'function') throw new Error('sort requires first argument to be sort key generator');
	reverse = typeof reverse === 'boolean' ? reverse : false;

	/* Sort the entries by the comparitor and render. */
	this.ordered_entries = (sortBy(comparitor))(this.ordered_entries);
	if (reverse) this.ordered_entries.reverse();
	this.render();
    },
    bindColumnSorts : function() {
	var self = this;

	function datesort(col) {
	    var date_regex = /(\d{1,2})\/(\d{2})\/(\d{4})/;
	    return function(ee) {
		var m = ee.serialize()[col].match(date_regex),
		    date = new Date(0);
		if (m) date = new Date(parseInt(m[3])-1, parseInt(m[1]), parseInt(m[2]));
		return date;
	    };
	}

	function timesort(col) {
	    var time_regex = /(\d{1,2}):(\d{2})/;
	    return function(ee) {
		var m = ee.serialize()[col].match(time_regex),
		    time = new Date(0);
		if (m) time = new Date(0, 0, 0, parseInt(m[1]), parseInt(m[2]));
		return time;
	    };
	}

	function datetimesort(col) {
	    function addSeconds(d, s) { return new Date(d.getTime() + s * 1000); }
	    function addMinutes(d, m) { return new Date(d.getTime() + m * 60 * 1000); }
	    function addHours(d, h) { return new Date(d.getTime() + h * 60 * 60 * 1000); }
	    var dt_regex = /(\d{1,2})\/(\d{2})\/(\d{4}) (\d{1,2}):(\d{2})(am|pm) (\+|-)(\d{2})(\d{2})/;
	    return function(ee) {
		var m = ee.serialize()[col].match(dt_regex),
		    dt = new Date(0);
		if (m) {
		    dt = new Date(parseInt(m[3])-1, parseInt(m[1]), parseInt(m[2]), parseInt(m[4]), parseInt(m[5]));
		    if (m[6] === 'pm') dt = addHours(dt, 12);

		    if (m[7] === '+')  {
			dt = addHours(dt,  parseInt(m[8]));
			dt = addMinutes(dt, parseInt(m[9]));
		    } else {
			dt = addHours(dt,  -1 * parseInt(m[8]));
			dt = addMinutes(dt,  -1 * parseInt(m[9]));
		    }
		}
		return dt;
	    };
	}

	this.$el.find('th').click(function() {
	    var col = $(this).html(),
		sorter = function(ee) {
		    return ee.serialize()[col];
		};
	    if (!col || !_.has(self.fields, col)) return;

	    /* Choose appropriate sorter (or fall back to default). */
	    if (self.fields[col] === 'date') sorter = datesort(col);
	    else if (self.fields[col] === 'time') sorter = timesort(col);
	    else if (self.fields[col] === 'datetime') sorter = datetimesort(col);

	    /* Check whether this field is already sorted... */
	    var sort_dir = $(this).attr('data-sort') === "true"; // 1 indicates forward sort done.
	    self.$el.find('th').removeAttr('data-sort'); // Remove sort dir on other columns.
	    $(this).attr('data-sort', !sort_dir); // Update record to note current sort.
	    $(this).addClass('sortAsc');

	    self.sort(sorter, sort_dir);
	});
    },
    bindSelectAll : function() {
	var self = this;
	this.$el.find('input[type="checkbox"][data-field="__selectall__"]:first').change(function() {
	    var ic = $(this).is(':checked');
	    _.each(self.entries, function(v, k) {
		if (ic) v.select();
		else v.deselect();
	    });
	});
    },
    render : function() {
	var self = this;
	_.each(this.ordered_entries, function(v) {
	    self.$tbody.append(v.render());
	});
	this.resizeColumns();
    },
    filter : function(condition) {
	var self = this;
	_.each(self.entries, function(v, k) {
	    if (!condition(v.serialize())) v.hide();
	    else v.show();
	});
	this.render();
    },
    unfilter : function() {
	_.each(this.entries, function(v, k) {
	    v.show();
	});
	this.render();
    }
});

var EditableEntry = Model.extend(
{
    constructor : function(args) {
	this.fields = args.fields;
	this.field_order = args.field_order;
	this.editable = args.editable;
	this.onupdate = args.onupdate;
	this.$el = $(this.template());
	this.$checkbox = this.$el.find('input[type="checkbox"][data-field="__selected__"]');
	this.edits_timeout = undefined;
	this.bindEdits();
    },
    update : function(obj) {
	var self = this;
	_.each(obj, function(v, k) {
	    self.setField(k, v);
	});
    },
    template : function() {
	var tr = $(document.createElement('tr')),
	    self = this,
	    itd = $(document.createElement('td'));
	itd.append($(document.createElement('input')).attr('type', 'checkbox').attr('data-field', '__selected__'));
	tr.append(itd);
	_.each(this.field_order, function(f) {
	    var td = $(document.createElement('td'));
	    if (self.editable.indexOf(f) < 0) {
		td.append($(document.createElement('span')).attr('data-field', f));
	    } else {
		var tdi = $(document.createElement('input')).addClass('etr-input').attr('data-field', f).css('width', '100%');
		if (self.fields[f] === 'datetime') {
		    tdi.datetimepicker({
			timeFormat: 'hh:mmtt z'
		    });
		} else if (self.fields[f] === 'date') {
		    tdi.datepicker();
		} else if (self.fields[f] === 'time') {
		    tdi.timepicker();
		}
		td.append(tdi);
	    }
	    tr.append(td);
	});
	return tr;
    },
    hide : function() {
	this.$el.hide();
    },
    show : function() {
	this.$el.show();
    },
    render : function() {
	return this.$el;
    },
    getField : function(f) {
	var fel = this.$el.find('[data-field="'+f+'"]');
	if (!fel || fel.length === 0) return undefined;
	if (fel[0].tagName.toLowerCase() === 'input') return fel.val();
	else return fel.html();
    },
    setField : function(f, v) {
	var fel = this.$el.find('[data-field="'+f+'"]');
	if (!fel || fel.length === 0) return;
	if (fel[0].tagName.toLowerCase() === 'input') fel.val(v);
	else fel.html(v);
    },
    selected : function() {
	return this.$checkbox.is(':checked');
    },
    select : function() {
	this.$checkbox.prop('checked', true);
    },
    deselect : function() {
	this.$checkbox.prop('checked', false);
    },
    serialize : function() {
	var od = {},
	    self = this;
	_.each(this.field_order, function(f) {
	    od[f] = self.getField(f);
	});
	return od;
    },
    bindEdits : function() {
	var self = this;
	this.$el.find('input').change(function(){
	    window.clearTimeout(self.edits_timeout);
	    self.edits_timeout = window.setTimeout(function() {
		self.onupdate(self.serialize());
	    }, 1000);
	});
    }
});
