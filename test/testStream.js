'use strict';

var restify = require('restify');
var assert = require('assert');
var server = require('../server');

// Client
var client = restify.createJsonClient({
  // url: 'http://localhost:6969/api/v0/', // Api endpoint
  url: 'http://localhost:4242',
  version: '~1.0'
});

describe('nomad-live-api', function () {
  
  it('require', function () {
    assert.equal(require('../server'), server);
  });

  it('get root page should fail', function (done) {
    client.get('/', function (err, req, res, obj) {

      assert.notEqual(err.statusCode, 200);

      done();
    });
  });
});

describe('stream', function () {

  var stream_id, password;

  it('create new', function (done) {
    client.post('/streams', function (err, req, res, obj) {

      assert.ifError(err);

      assert.ok(obj.id);
      assert.ok(obj.password);

      stream_id = obj.id;
      password = obj.password;

      done();
    });
  });

  it('sync streams with cine.io', function (done) {
    client.post('/streams/sync', function (err, req, res, obj) {

      assert.ifError(err);

      assert.ok(obj);

      done();
    });
  });

  it('get newly created', function (done) {
    client.get('/stream/' + stream_id, function (err, req, res, obj) {

      assert.ifError(err);

      assert.ok(obj.id, stream_id);

      done();
    });
  });

  it('belongs to cache', function (done) {
    client.get('/streams', function (err, req, res, obj) {

      assert.ifError(err);
      
      var filtered = obj.filter(function (item) {
        return item.id === stream_id;
      });

      assert.ok(filtered.length !== 0);
      assert.ok(filtered.length === 1);

      done();
    });
  });

  it('heartbeat with bad password', function (done) {
    client.post('/stream/' + stream_id + "?p=badpassword", function (err, req, res, obj) {

      assert.ok(err);
      assert.equal(err.statusCode, 401);

      done();
    });
  });

  it('heartbeat', function (done) {
    client.post('/stream/' + stream_id + "?p=" + password, function (err, req, res, obj) {

      assert.ifError(err);

      assert.equal(obj.id, stream_id);
      assert.ok(obj.last_beat);

      done();
    });
  });

  it('release with bad password', function (done) {
    client.del('/stream/' + stream_id + "?p=badpassword", function (err, req, res, obj) {

      assert.ok(err);
      assert.equal(err.statusCode, 401);

      done();
    });
  });

  it('release', function (done) {
    client.del('/stream/' + stream_id + "?p=" + password, function (err, req, res, obj) {

      assert.ifError(err);

      assert.equal(obj.id, stream_id);

      done();
    });
  });

});