#!/usr/bin/env node-harmony

var Docker = require('./docker');
var HttpProxy = require('http-proxy');

var http = require('http');
var util = require('util');
var url = require('url');

var proxy = HttpProxy.createProxyServer();

var Server = {
  start: function(port, host, callback) {
    var httpServer = http.createServer(function(req, res) {
      callback(req, res, function(error, destination) {
        if (error) {
          console.log("Error serving response: ", error);
          Server.internalError(req, res, "We failed to route your request.");
          return;
        }
        Server.proxyTo(req, res, destination);
      });
    });
    httpServer.listen(port, host);
  },

  internalError: function(req, res, message) {
    res.writeHead(500)
    res.end("Internal server error: " + message)
  },

  proxyTo: function(req, res, destination) {
    var parsedURL = url.parse(destination);
    if (parsedURL.protocol == 'docker:') {
      return Server.proxyToDocker(req, res,
        parsedURL.hostname,
        parseInt(parsedURL.port, 10)
      );
    } else if (parsedURL.protocol == 'http:') {
      return Server.proxyToHttp(req, res,
        parsedURL.hostname,
        parseInt(parsedURL.port, 10)
      );
    }else{
      return Server.internalError(req, res,
        "Unknown protocol: " + parsedURL.protocol
      );
    }
  },

  proxyToDocker: function(req, res, container, port) {
    Docker.fetchPorts(container).then(function(portMap) {
      if (!portMap[port]) {
        return Server.internalError(req, res,
          util.format("Port %d not found in port map for %s", port, container)
        );
      }
      return Server.proxyToHttp(req, res, '127.0.0.1', portMap[port]);
    });
  },

  proxyToHttp: function(req, res, hostname, port) {
    proxy.web(req, res, {
      target: util.format('http://%s:%d', hostname, port),
    });
  },
};

module.exports = Server;

