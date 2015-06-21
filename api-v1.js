'use strict';

var restify = require('restify');
var CineIO = require('cine-io');

var client = CineIO.init(require('./secrets.json'));
var Storage = require('./storage');

var exports = module.exports;


var STREAM_COUNT_LIMIT = 3;


exports.sync = function () {
  client.streams.index(function (err, streams) {
    if (!err) {

      Storage.sync(streams);

    } else {

      console.log("[SimpleSync] error:cine-io");
      console.log(err);
    }
  });
}

exports.sync_cache = function (req, res, next) {

  console.log("[Sync] syncing...");

  client.streams.index(function (err, streams) {

    if (!err) {
      console.log("[Sync] download:count " + streams.length);

      Storage.sync(streams);

      console.log("[Sync] done");
      res.json(200, Storage.getAll());

    } else {

      console.log("[Sync] error:cine-io");
      console.log(err);

      res.json(503, {});
    }
    next();
  });
}

exports.get_streams = function (req, res, next) {

  console.log("[Get] getting all...");

  var all = Storage.getAll();
  res.header('X-Stream-Count', all.length);
  res.header('X-Stream-Count-Limit', STREAM_COUNT_LIMIT);
  res.json(200, all);
  
  console.log("[Get] done all");
  next();
}

exports.get_stream = function (req, res, next) {

  var id = req.params.stream_id;

  console.log("[Get] getting... " + id);

  if (Storage.has(id)) {

    console.log("[Get] done " + id);
    res.json(200, Storage.get(id).stream);

  } else {

    console.log("[Get] error:not-in-cache " + id);
    res.json(204, {msg: "Stream not in cache."});
  }
  next();
}

exports.create_stream = function (req, res, next) {

  var password = req.params.password;

  if (!password) {
    // Generates a random password (Needed for heartbeat)
    password = Math.random().toString(36).substr(2, 5);
  }

  var current_size = Storage.size();

  var progress = current_size + "/" + STREAM_COUNT_LIMIT;

  console.log("[Create] total " + progress );

  if (current_size < STREAM_COUNT_LIMIT) {

    console.log("[Create] adding...");

    client.streams.create(function (err, stream) {

      if (!err) {

        Storage.add(stream, password, function (last_beat) {

          var url = stream.id + "?p=" + password;

          console.log("[Create] done " + url);

          res.header('X-Stream-Count', current_size + 1);
          res.header('X-Stream-Count-Limit', STREAM_COUNT_LIMIT);

          res.json(200, {
            id: stream.id,
            password: password,
            last_beat: last_beat
          });
        });

      } else {

        console.log("[Create] error:cine-io " + id);
        console.log(err);
        
        res.json(503, { stream_id: id });
      }
    });

  } else {

    console.log("[Create] error:capped " + Storage.size());
    res.json(406, { msg: "Streams exhausted. " + progress });
  }
  
  next();
}

exports.delete_stream = function (req, res, next) {

  var id = req.params.stream_id;
  var pass = req.params.password || req.params.p;

  console.log("[Delete] id " + id);

  if (Storage.has(id)) {

    var good_pass = Storage.get(id).password

    console.log("[Delete] " + good_pass + "==" + pass + " ?");
    
    if (pass === good_pass) {

      console.log("[Delete] deleting... " + id);

      client.streams.destroy(id, function (err, stream) {

        Storage.destroy(id);
        
        console.log("[Delete] done " + id);

        res.json(200, stream);
      });

    } else {

      console.log("[Delete] error:wrong-password " + id);
      res.json(401, {msg: "Wrong password."});
    }
  } else {

    console.log("[Delete] error:not-in-cache " + id);
    res.json(204, {msg: "Stream not in cache."});
  }
  next();
}

exports.heartbeat = function (req, res, next) {

  var id = req.params.stream_id;
  var pass = req.params.password || req.params.p;
  
  console.log("[Beat] beating... " + id);

  if (Storage.has(id)) {

    var stream = Storage.get(id);
    var good_pass = stream.password;
    
    if (good_pass === pass) {

      var last_beat = Storage.beat(id, Date.now());
      
      console.log("[Beat] done " + last_beat);

      res.json(200, { id: id, last_beat: last_beat });
      
    } else {

      console.log("[Beat] error:wrong-password " + id);
      res.json(401, {msg: "Wrong password."});
    }
  } else {

    console.log("[Beat] error:not-in-cache " + id);
    res.json(204, {msg: "Stream not in cache."});
  }
  next();
}

exports.get_stream_from_cineio = function (req, res, next) {

  var id = req.params.stream_id;

  console.log("[Get] getting... " + id);

  client.streams.index(function (err, streams) {

    if (!err) {

      var filtered = streams.filter(function (s) { return s.id === id; });

      if (filtered.length === 1) {

        console.log("[Get] done " + id);
        res.json(200, filtered[0]);

      } else {

        console.log("[Get] error:not-found " + id);
        res.json(204, { stream_id: id });
      }

    } else {

      console.log("[Get] error:cine-io " + id);
      console.log(err);
      
      res.json(503, { stream_id: id });
    }

    next();
  });
}