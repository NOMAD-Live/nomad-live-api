'use strict';

var restify = require('restify');
var api = require('./api-v1');

var server = restify.createServer({
  name: 'nomad-live-api',
  version: '1.0.0'
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.authorizationParser());
server.use(restify.queryParser());
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

server.post('/streams', api.create_stream);
server.get('/streams', api.get_streams);
server.get('/streams/sync', api.sync_cache);
server.post('/streams/sync', api.sync_cache);
server.get('/stream/:stream_id', api.get_stream);
server.post('/stream/:stream_id', api.heartbeat);
server.del('/stream/:stream_id', api.delete_stream);

server.listen(4242, function () {
  console.log('%s listening at %s', server.name, server.url);
  api.sync();
});
