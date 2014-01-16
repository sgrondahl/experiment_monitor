/*global jQuery $ _ Model $TL*/

$TL.add('./templates/editable_table.html', 'editable-table-template');
$TL.ready(t);

function t() {
    var subject_filters = { 'waiting subjects' : function(p) { return p.Status !== 'not logged in'; } },
	subject_table = $('#subjects-table').EditableTable({ fields : { Subject : 'string', 
									Password : 'string', 
									Status : 'string' }, 
							     field_order : [ 'Subject', 'Password', 'Status' ], 
							     editable : [ 'Subject', 'Password' ],
							     filters :  subject_filters }),
	session_filters = { 'running' : function(s) { return s.Status !== 'not yet started'; },
			    'finished' : function(s) { return s.Status.indexOf('finished') === 0; } },
	session_table = $('#sessions-table').EditableTable({ fields : { Name : 'string',
									Type : 'string',
									Seed : 'number',
									Players : 'string',
									'Secret Word' : 'string',
									'Start After' : 'datetime',
									'Start Before' : 'datetime',
									Status : 'string',
									Errors : 'string' },
							     field_order : [ 'Name',
									     'Type',
									     'Seed',
									     'Players',
									     'Secret Word',
									     'Start After',
									     'Start Before',
									     'Status',
									     'Errors' ],
							     editable : [ 'Name',
									  'Type',
									  'Seed',
									  'Players',
									  'Secret Word',
									  'Start After',
									  'Start Before' ],
							     filters : session_filters });
    subject_table.render();
    subject_table.update({ 
	abc123 : { Subject : 'markus',
		   Password : 'mobius',
		   Status : 'not logged in' },
	cde984 : { Subject : 'samuel',
		   Password : 'grondahl',
		   Status : 'waiting for 3 minutes (8:36pm)' }
    });

    session_table.render();
    session_table.update({ 
	abc123 : { Name : 'TreatA',
		   Type : 'A',
		   Seed : 1971,
		   Players : '4,6,8',
		   'Secret Word' : 'cukoo',
		   'Start After' : '12/09/2013 9:00pm -500',
		   'Start Before' : '12/09/2013 11:00pm -500',
		   Status : 'not yet started',
		   Errors : '' }
    });


};

