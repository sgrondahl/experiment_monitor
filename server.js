/*global require*/

var static_server = require('node-static'),
    http = require('http'),
    util = require('util');

var webroot = '.',
    port = 8080;

var file = new(static_server.Server)(webroot, { 
    cache: 600, 
    headers: { 'X-Powered-By': 'node-static' } 
});

http.createServer(function(req, res) {
    file.serve(req, res, function(err, result) {
	if (err) {
	    console.error('Error serving %s - %s', req.url, err.message);
	    if (err.status === 404 || err.status === 500) {
		file.serveFile(util.format('/%d.html', err.status), err.status, {}, req, res);
	    } else {
		res.writeHead(err.status, err.headers);
		res.end();
	    }
	} else {
	    //console.log('%s - %s', req.url, res.message); 
	}
    });
}).listen(port);

console.log('created server');
