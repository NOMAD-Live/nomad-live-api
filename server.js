'use strict';

var restify = require('restify');
var assert = require('assert');
var api = require('./src/api-v1');

var SERVER_SETUP = {
  name: 'nomad-live-api',
  version: '1.0.1'
};

var server = restify.createServer(SERVER_SETUP);

var port = process.argv[2];

// Checks that the port is an int and within a valid range.
if (!(1 <= port && port <= 65535)) {
  console.log('Port "' + port + '" is not within range (0-65536).');
  port = process.env.npm_package_config_port;
}

server.use(restify.acceptParser(server.acceptable));
server.use(restify.authorizationParser());
server.use(restify.queryParser({ mapParams: true }));
server.use(restify.gzipResponse());
server.use(restify.throttle({
  burst: 100,
  rate: 50,
  ip: true,
  overrides: {
    '127.0.0.1': {
      rate: 0,        // unlimited
      burst: 0
    }
  }
}));
server.use(restify.conditionalRequest());

// Allows CORS
server.use(restify.CORS());
server.use(restify.fullResponse());

// route to display versions
server.get('/', function (req, res) {
  res.json(SERVER_SETUP);
});

server.post('/streams', api.create_stream);
server.get('/streams', api.get_streams);
server.get('/streams/sync', api.sync_cache);
server.post('/streams/sync', api.sync_cache);
server.get('/streams/clean', api.clean_streams);
server.post('/streams/clean', api.clean_streams);
server.get('/stream/:stream_id', api.get_stream);
server.post('/stream/:stream_id', api.heartbeat);
server.del('/stream/:stream_id', api.destroy_stream);

server.listen(port, function () {
  console.log('%s listening at %s', server.name, server.url);
  api.sync();
  //api.auto_clean();
});
