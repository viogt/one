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
    	else if(req.url.substr(0,12)=='/files/down/') download('./files/'+req.url.substr(12) ,res);
    	else if(req.url.substr(0,7)=='/files/') returnFile('.' + req.url, res);
    	else res.end('Error: unknown request!');
    	return;
  	}
	if(req.url.substr(0,10)=='/files/pdf') {
		body = '';
		req.on('data', function (chunk) { body += chunk; });
		req.on('end', function () { downPDF(body, res); });
  	}
	else if(req.url.substr(0,7)=='/files/') {
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

function download( file, resp ){
	resp.writeHead(200, {'Content-disposition': 'attachment; filename='+file.substr(file.lastIndexOf('/')+1)});
	var filestream = fs.createReadStream(file);
	filestream.pipe(resp);
}

function downPDF( body, resp ){
	
	//var pdf = require('html-pdf');
	//resp.end(body.substr(0,200) + body.slice(-200));
	//return;
	
	var cnt = JSON.parse(body);
	//resp.writeHead(200, {'Content-disposition': 'attachment; filename='+ cnt.fileName + '.pdf'});
	
	resp.end(cnt.fileName + '\n' + cnt.borders + '\n' + cnt.footer + '\n' + cnt.body);
	return;
	
	/*var html = '<HTML><BODY>' + cnt.content + '</BODY></HTML>';
	
	/var opts = {};
	
	var pdf = require('html-pdf');
	pdf.create(html, opts).toStream(function(err, stream){
	  	stream.pipe(resp);
	});
*/
}