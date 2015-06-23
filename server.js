'use strict';

var restify = require('restify');
var assert = require('assert');
var api = require('./src/api-v1');

var server = restify.createServer({
  name: 'nomad-live-api',
  version: '1.0.0'
});

var port = process.argv[2] || process.env.npm_package_config_port;

// Checks that the port is an int and within a valid range.
assert.ok(1 <= port && port <= 65535, 'Port given is not within range.');

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
});
