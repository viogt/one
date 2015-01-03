var http	= require('http'),
    fs		= require('fs'),
    ipadd	= process.env.OPENSHIFT_NODEJS_IP,
    port	= process.env.OPENSHIFT_NODEJS_PORT || 8080,
    body	= '';

http.createServer(function (req, res) {

	console.log(' >> ' + req.method + ' > ' + req.url);

	if(req.method == 'GET') {
		if(req.url == '/') returnFile('./index.html', res);
		else if(req.url == '/receive') returnFile('eng.txt', res);
		/*{
		res.writeHead(200, {'Content-Type': 'text/plain' });
		res.end('(url: ' + req.url + ')'); return;
		}*/
    	else if(req.url.substr(0,6)=='/files') returnFile('.' + req.url, res);
    	else res.end('Error: unknown request!');
    	return;
  	}
	if(req.url == '/save') {
		body = '';
		req.on('data', function (chunk) { body += chunk; });
		req.on('end', function () { saveFile( body, res); });
  	}
	else res.end('Error: unknown request!');
  
}).listen(port, ipadd);

function returnFile(fl, resp){
	fs.readFile(fl, function (err,data) {
	if (err) {
		resp.writeHead(200, {'Content-Type': 'text/plain' });
		resp.end('Error retreiving the file ' + fl + '... (url: ' + req.url + ')'); return;
	}
	resp.writeHead(200, {'Content-Type': 'text/html' });
	resp.end(data);
    });
}

function saveFile( bd, resp ){
	fs.writeFile("./eng.txt", bd, function(err) {
	if (err) {
		resp.writeHead(200, {'Content-Type': 'text/plain' });
		resp.end('Error writing the file.'); return;
	}
	resp.writeHead(200, {'Content-Type': 'text/plain' });
	resp.end('File saved!');
    });
}