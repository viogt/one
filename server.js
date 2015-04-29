var http	= require('http'),
    fs		= require('fs'),
    path = require('path'),
    ipadd	= process.env.OPENSHIFT_NODEJS_IP,
    port	= process.env.OPENSHIFT_NODEJS_PORT || 8080,
    body	= '';

http.createServer(function (req, res) {

	console.log(' >> ' + req.method + ' > ' + req.url);

	if(req.method == 'GET') {
		if(req.url == '/') returnFile('./index.html', res);
    	else if(req.url=='/files/down') download(res);
    	else if(req.url.substr(0,7)=='/files/') returnFile('.' + req.url, res);
    	else res.end('Error: unknown request!');
    	return;
  	}
	if(req.url.substr(0,7)=='/files/') {
		body = '';
		req.on('data', function (chunk) { body += chunk; });
		req.on('end', function () { saveFile('.' + req.url, body, res); });
  	}
	else res.end('Error: unknown request! (' + req.url + ')');
  
}).listen(port, ipadd);

function returnFile(fl, resp){
	fs.readFile(fl, function (err,data) {
	  if (err) {
		  resp.writeHead(200, {'Content-Type': 'text/plain' });
		  resp.end('Error retreiving the file ' + fl + '...'); return;
	  }
	  resp.writeHead(200, {'Content-Type': 'text/html' });
	  resp.end(data);
  });
}

/*function returnFile(fl, resp){
  var file = fs.createReadStream(fl);
  file.pipe(resp);
}*/

function saveFile( fl, bd, resp ){
	fs.writeFile(fl, bd, function(err) {
	  if (err) {
		  resp.writeHead(200, {'Content-Type': 'text/plain' });
		  resp.end('Error writing the file.'); return;
	  }
	  resp.writeHead(200, {'Content-Type': 'text/plain' });
	  resp.end('File saved!');
  });
}

function download( resp ){
	var file = './files/eng.txt';
	resp.writeHead(200, {'Content-disposition': 'attachment; filename=eng.txt'});
	var filestream = fs.createReadStream(file);
	filestream.pipe(resp);
}