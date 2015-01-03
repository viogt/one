var http  = require('http'),
    fs    = require('fs'),
    ipaddress = process.env.OPENSHIFT_NODEJS_IP,
    port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;

http.createServer(function (req, res) {

	console.log(' >> ' + req.method + ' > ' + req.url);

	if(req.method == 'GET') {
    	if(req.url.substr(0,6)=='/files') returnFile('.' + req.url, res);
    	else res.end('Error: unknown request!');
    	return;
  	}
	else res.end('Error: unknown request!');
  
}).listen(port, ipaddress);

console.log('\n\t<...Working on 8080...>\n');

function returnFile(fl, resp){
	fs.readFile(fl, function (err,data) {
	if (err) {
		resp.writeHead(200, {'Content-Type': 'text/plain' });
		res.end('Error retreiving the file.'); return;
	}
	resp.writeHead(200, {'Content-Type': 'text/html' });
	resp.end(data);
    });
}