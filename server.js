var http	= require('http'),
    fs		= require('fs'),
    pdf = require('html-pdf'),
    Mng   = require('mongodb'),
    MngIp = 'mongodb://127.0.0.1:27017/test',
    ipadd	= process.env.OPENSHIFT_NODEJS_IP,
    port	= process.env.OPENSHIFT_NODEJS_PORT || 8080,
    body, _DB = null;

    MngIp = 'mongodb://'+process.env.OPENSHIFT_MONGODB_DB_USERNAME + ":" +
    	process.env.OPENSHIFT_MONGODB_DB_PASSWORD + "@" +
    	process.env.OPENSHIFT_MONGODB_DB_HOST + ':' +
    	process.env.OPENSHIFT_MONGODB_DB_PORT + '/' +
    	process.env.OPENSHIFT_APP_NAME;

http.createServer(function (req, res) {
  
	console.log(' >> ' + req.method + ' > ' + req.url);

	if(req.method == 'GET') {
		if(req.url == '/') returnFile('./index.html', res);
		else if(req.url.substr(0,11)=='/files/mng/') {
		    operate( JSON.parse( decodeURIComponent( req.url.substr(11) ) ), res );
		}
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
    if(_DB) { _oper( _DB, js, resp ); return; }
    Mng.MongoClient.connect(MngIp, function(err, db) {
        if(err) { resp.end('0 Database cannot be opened!'); return; }
        _DB = db; _oper( _DB, js, resp ); return;
    });
}

function _oper( db, js, resp) {
    resp.writeHead(200, {'Content-Type': 'text/plain' });
    db.collection(js.collection, {strict:true}, function(err, collection) {
        var cll = collection, collExists = err?false:true;
        switch( js.action ) {
            case 'get one':
                if(!collExists) { resp.end('null'); return; }
                cll.findOne({file: js.file}, function(err, obj) { sc(obj, err, resp); });
		        return;
		    case 'list':
                db.collection(js.collection).find({}, { file:1, modified:1 }).sort({modified:-1}).toArray(function(err, recs) { sc(recs, err, resp); });
		        return;
            case 'save':
                js.modified = new Date();
                db.collection(js.collection).update({file: js.file}, js, {upsert: true}, function(err, obj) { sc(obj, err, resp); });
		        return;
            case 'remove':
                cll.remove( {file: js.file}, function(err, obj) { sc(obj, err, resp); });
		        return;
            case 'rename':
                cll.update({ _id: new Mng.ObjectID(js.id) }, {$set: { file: js.file, modified: new Date() }}, function(err, obj) { sc(obj, err, resp); });
		        return;
            case 'usrGet':
                if(!collExists) { scr('*', resp); return; }
                cll.findOne({user: js.user}, function(err, obj) {
                  if(err || obj==null) { scr('*', resp); return; }
                  if(js.hasOwnProperty('psw')) scr((obj.psw == js.psw)?'1':'*', resp);
                  else scr('1', resp);
                });
		        return;
            case 'usrCreate':
                js.modified = new Date();
                db.collection(js.collection).update({user: js.user}, js, {upsert: true}, function(err, obj) { scr(err?'*':'1', resp); return; });
		        return;
            case 'usrDelete':
                db.collection(js.collection).remove( {user: js.user}, function(err, obj) {
                    if(!err) db.collection(js.delCollection).drop( function(err, res) { scr(err?'*':'1', resp); return; });
                    else scr('*', resp);
                });
		        return;
            case 'download':
                cll.findOne({file: js.file}, function(err, obj) {
                    if(err) return shucher(resp, err, db);
	                resp.writeHead(200, {'Content-disposition': 'attachment; filename='+obj.file});
                    var html = '<HTML><HEAD><TITLE>' + obj.file + '</TITLE><STYLE>' + obj.theme + '</STYLE></HEAD>';
	                html += '<BODY>' + obj.content + '</BODY></HTML>';
                    resp.end(html);
		        });
		        return;
            case 'coll exists':
                resp.end(collExists?'+':'-'); return;
            case 'readDir':
                var p = './files';
                fs.readdir(p, function (err, files){
                    if(err) return shucher(resp, err, db);
                    resp.end( JSON.stringify(files) );
                }); 
                return;
            case 'getFile':
                var file = fs.createReadStream('./files/'+js.file); file.pipe(resp);
                return;
            case 'putFile':
                //var writeStream = fs.createWriteStream('./output'); req.pipe(writeStream);
            	fs.writeFile('./files/'+js.file, js.fileBody, function(err) {
            	  if (err) return shucher(resp, err, db);
            	  resp.end('File saved!');
                });
                return;
		    default: resp.end('0 Unknown command');
        }
    });
}

function scr(what, res) { res.end(what); }
function sc(obj, err, res) { res.end(err?('0' + JSON.stringify(err)):JSON.stringify(obj)); }

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