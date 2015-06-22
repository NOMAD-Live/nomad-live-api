'use strict';

var isOnline = require('is-online');
var restify = require('restify');
var assert = require('assert');
var isUp = require('is-up');


var server = require('../server');


// Client
var client = restify.createJsonClient({
  // url: 'http://localhost:6969/api/v0/', // Api endpoint
  url: 'http://localhost:' + process.env.npm_package_config_port,
  version: '~1.0'
});


describe('nomad-live-api', function () {
  
  var stream_id, password, last_beat;

  it('require', function () {
    assert.equal(require('../server'), server);
  });

  it('has internet access', function (done) {
    isOnline(function (err, online) {

      assert.ifError(err);
      assert.ok(online);
      done();
    });
  });

  it('has access to cine.io api', function (done) {
    isUp('www.cine.io', function (err, up) {
      assert.ok(up);
      done();
    });
  });

  it('get root page should fail', function (done) {
    client.get('/', function (err, req, res, obj) {

      assert.notEqual(err.statusCode, 200);

      done();
    });
  });
});

describe('stream (valid path)', function () {

  var stream_id, password, last_beat;

  it('sync streams with cine.io', function (done) {

    // Makes sure the connection to cine.io is established.
    setTimeout(done, 4000);

    client.post('/streams/sync', function (err, req, res, obj) {

      assert.ifError(err);

      assert.ok(obj);

      done();
    });
  });

  it('create new', function (done) {

    // Makes sure the connection to cine.io is established.
    setTimeout(done, 4000);

    client.post('/streams', function (err, req, res, obj) {

      assert.ifError(err);

      assert.ok(obj.id);
      assert.ok(obj.password);

      stream_id = obj.id;
      password = obj.password;
      last_beat = obj.last_beat;

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

  it('get all streams', function (done) {
    client.get('/streams', function (err, req, res, obj) {

      assert.ifError(err);
      
      assert.ok(Array.isArray(obj));

      done();
    });
  });

  it('headers set for all streams', function (done) {
    client.get('/streams', function (err, req, res, obj) {

      assert.ifError(err);
      
      var size_in_header = res.header('X-Stream-Count');
      assert.equal(obj.length, size_in_header);

      var limit_in_header = res.header('X-Stream-Count-Limit');
      assert.equal(3, limit_in_header);

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

  it('heartbeat', function (done) {
    client.post('/stream/' + stream_id + "?p=" + password, function (err, req, res, obj) {

      assert.ifError(err);

      assert.equal(obj.id, stream_id);
      assert.equal(obj.last_beat, last_beat);

      done();
    });
  });

  it('release', function (done) {

    // Makes sure the connection to cine.io is established.
    setTimeout(done, 4000);

    client.del('/stream/' + stream_id + "?p=" + password, function (err, req, res, obj) {

      assert.ifError(err);

      assert.equal(obj.id, stream_id);

      done();
    });
  });
});

describe('stream (error path)', function () {

  var stream_id, password, last_beat;

  before(function (done){

    client.post('/streams', function (err, req, res, obj) {
 
      stream_id = obj.id;
      password = obj.password;
      last_beat = obj.last_beat;
 
      done();
    });
  });

  after(function (done){

    client.del('/stream/' + stream_id + "?p=" + password, function (err, req, res, obj) {
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

  it('release with bad password', function (done) {
    client.del('/stream/' + stream_id + "?p=badpassword", function (err, req, res, obj) {

      assert.ok(err);
      assert.equal(err.statusCode, 401);

      done();
    });
  });
});