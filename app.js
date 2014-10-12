#!/usr/bin/env node-harmony

var Server = require('./server');

Server.start(8080, '127.0.0.1', function(req, res, proxy) {

  console.log(req.headers.host);

  proxy(null, 'docker://dev-redis:6301');

});
