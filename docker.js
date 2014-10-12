var Dockerode = require('dockerode');
var Promise = require('bluebird');
var url = require('url');

function getConnectionParams() {
  if (process.env.DOCKER_HOST) {
    // On Mac we use boot2docker which does not use unix sockets
    var parsedURL = url.parse(process.env.DOCKER_HOST);
    if (parsedURL.protocol !== 'tcp:') {
      throw new Error('only supports tcp DOCKER_HOST right now')
    }
    return {
      host: parsedURL.hostname,
      port: parseInt(parsedURL.port, 10)
    };
  } else {
    return {socketPath: '/var/run/docker.sock'};
  }
}

var client = Promise.promisifyAll(
  new Dockerode(getConnectionParams())
);

var Docker = {
  fetchContainer: Promise.coroutine(function*(containerName) {
    // Dockerode does not have a fetch single container function so grab it out
    // of the list. This should ideally be replaced later
    var containers = yield client.listContainersAsync({});
    for (var i = 0; i < containers.length; i++) {
      var hasName = containers[i].Names.some(function(name) {
        return name === '/' + containerName;
      });
      if (hasName) {
        return containers[i];
      }
    }
    throw new Error('Could not find a container with the given name');
  }),

  fetchPorts: Promise.coroutine(function*(name) {
    /**
     * Returns a list of (internal port => public port) for each exposed port
     * inside the container.
     */
    var container = yield Docker.fetchContainer(name);
    var ports = {};
    container.Ports.forEach(function(port) {
      if (port.PublicPort) {
        ports[port.PrivatePort] = port.PublicPort;
      }
    });
    return ports;
  }),
};

module.exports = Docker;
