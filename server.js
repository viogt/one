var http	= require('http'),
    fs		= require('fs'),
    path = require('path'),
    pdf = require('html-pdf'),
    Mng   = require('mongodb'),
    MngIp = 'mongodb://127.0.0.1:27017/test',
    ipadd	= process.env.OPENSHIFT_NODEJS_IP,
    port	= process.env.OPENSHIFT_NODEJS_PORT || 8080,
    body;

    MngIp = 'mongodb://'+process.env.OPENSHIFT_MONGODB_DB_USERNAME + ":" +
    	process.env.OPENSHIFT_MONGODB_DB_PASSWORD + "@" +
    	process.env.OPENSHIFT_MONGODB_DB_HOST + ':' +
    	process.env.OPENSHIFT_MONGODB_DB_PORT + '/' +
    	process.env.OPENSHIFT_APP_NAME;

http.createServer(function (req, res) {
  
	console.log(' >> ' + req.method + ' > ' + req.url);

	if(req.method == 'GET') {
		if(req.url == '/') returnFile('./index.html', res);
    	else if(req.url.substr(0,12)=='/files/down/') download('./files/'+req.url.substr(12) ,res);
    	else if(req.url.substr(0,7)=='/files/') returnFile('.' + req.url, res);
    	else res.end('Error: unknown request!');
    	return;
  	}

  if(req.url.substr(0,12)=='/files/pipe/') {
		body = '';
		req.on('data', function (chunk) { body += chunk; });
		req.on('end', function () { pipping(req.url.substr(12), body, res); });
  	}

  else if(req.url.substr(0,10)=='/files/mng') {
    body = '';
    req.on('data', function (chunk) { body += chunk; });
    req.on('end', function () { try { operate( JSON.parse(body), res ); } catch(e) { shucher(res, {error: 'Bad request/json'}, null); } });
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

function pipping( file, body, resp ){

  console.log('File = ' + file);
  var html, wh = body.charAt(0);
	var cnt = JSON.parse(body.substr(2));
  //console.log( 'FileName = ' + cnt.fileName );
  
  if(wh == 'S') html = cnt.content;
  else html = '<HTML><BODY style="'+ cnt.body +'">'+cnt.content+'</BODY></HTML>';

    	var opts = {
      "format": 'A4',
      "footer": {
        "height": cnt.borders.footer,
        "contents": cnt.footer
      },
      "orientation": "portrait",
      "border": {
        "top": cnt.borders.top,
        "right": cnt.borders.right,
        "bottom": cnt.borders.bottom,
        "left": cnt.borders.left
      },
      "quality": "100"
    };

    if(cnt.bkgr) opts.border = '0px';
  
  if(wh=='Q' || wh=='S') {
    resp.writeHead(200,{'Content-disposition': 'inline; filename='+cnt.fileName});
    resp.writeHead(200,{'Content-type':'application/pdf'});
  }
  else resp.writeHead(200, {'Content-disposition': 'attachment; filename='+cnt.fileName});
  
	pdf.create(html, opts).toStream(function(err, stream){
	  	stream.pipe(resp);
	});
}

function operate( js, resp ) {
    resp.writeHead(200, {'Content-Type': 'text/plain' });
    Mng.MongoClient.connect(MngIp, function(err, db) {
        if(err) return shucher(resp, err, null);
        
        try {
        var cll = db.collection( js.collection );
        resp.end( JSON.stringify( cll.dataSize() ) );
        //resp.end('0 :' + cll.exists()); return;
        } catch(e) { resp.end('0 :' + e.message); return; }
        
        switch( js.action ) {
            case 'get one':
                cll.findOne({file: js.file}, function(err, obj) {
                    if(err) return shucher(resp, err, db); db.close();
                    resp.end(JSON.stringify(obj));
		        });
		        return;
		    case 'list':
                cll.find({}, { file:1, modified:1 }).sort({modified:-1}).toArray(function(err, recs) {
                    if(err) return shucher(resp, err, db); db.close();
			        resp.end(JSON.stringify(recs));
		        });
		        return;
            case 'save':
                js.modified = new Date();
                cll.update({file: js.file}, js, {upsert: true}, function(err, obj) {
                    if(err) return shucher(resp, err, db); db.close();
			        resp.end(JSON.stringify(obj));
		        });
		        return;
            case 'remove':
                cll.remove( {file: js.file}, function(err, obj) {
                    if(err) return shucher(resp, err, db); db.close();
                    resp.end(JSON.stringify(obj));
                });
		        return;
            case 'rename':
                cll.update({ _id: new Mng.ObjectID(js.id) }, {$set: { file: js.file, modified: new Date() }}, function(err, obj) {
                    if(err) return shucher(resp, err, db); db.close();
			        resp.end(JSON.stringify(obj));
		        });
		        return;
            case 'download':
                cll.findOne({file: js.file}, function(err, obj) {
                    if(err) return shucher(resp, err, db); db.close();
	                resp.writeHead(200, {'Content-disposition': 'attachment; filename='+obj.file});
                    var html = '<HTML><HEAD><TITLE>' + obj.file + '</TITLE><STYLE>' + obj.theme + '</STYLE></HEAD>';
	                html += '<BODY>' + obj.content + '</BODY></HTML>';
                    resp.end(html);
		        });
		        return;
		    default: shucher(resp, {error: 'Unknown command'}, db);
        }
    });
}

function returnFile(fl, resp){
    fs.readFile(fl, function (err,data) {
      if (err) return shucher(resp, err);
      resp.writeHead(200, {'Content-Type': 'text/html' });
      resp.end(data);
    });
}

function shucher(res, err, DB) { if(DB != null) DB.close(); res.end('0' + JSON.stringify(err)); return false; }
/*
pdf.create(html, opts).toFile('./files/' +fileName, function(err, res) {
  if (err) return console.log(err);
  console.log('PDF created.');
	resp.end( fileName );
*/