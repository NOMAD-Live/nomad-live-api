'use strict';

var restify = require('restify');
var CineIO = require('cine-io');

try {
  var conf = require('../secrets.json');
} catch (e) {
  if (process.env.CINE_IO_SECRET_KEY) {
    var conf = {secretKey: process.env.CINE_IO_SECRET_KEY};
  } else {
    console.log("Add CINE_IO_SECRET_KEY to you environnement variables,");
    console.log("or create a secrets.json file like the following:");
    console.log("{'secretKey': 'THE_CINE_IO_SECRET_KEY'}");
  }
}

var client = CineIO.init(conf);
var Storage = require('./storage');

var exports = module.exports;


var STREAM_COUNT_LIMIT = 5;
var STREAM_EXPIRATION_TIME = 15; // In seconds


/**
 * Pulls the streams from cine.io to the server cache (Storage)
 */
exports.sync = function () {
  client.streams.index(function (err, streams) {
    if (!err) {

      Storage.sync(streams);

    } else {

      console.log("[SimpleSync] error:cine-io");
      console.log(err);
    }
  });
};


/**
 * Cleans the cache by deleting all streams older than
 * the number of seconds specified by STREAM_EXPIRATION_TIME.
 * It then records a new auto_clean task STREAM_EXPIRATION_TIME seconds after.
 */
exports.auto_clean = function () {

  console.log("[AutoClean] Cleaning...");
  var to_destroy = exports.clean();
  console.log("[AutoClean] done " + to_destroy);

  var clean_every = STREAM_EXPIRATION_TIME * 1000;

  setTimeout(exports.auto_clean, clean_every);
}


/**
 * Gets the stream from the cache whose last heartbeat was longer than
 * STREAM_EXPIRATION_TIME seconds ago, and delete them one by one from the
 * Cine.IO API.
 */
exports.clean = function () {

  console.log("[Clean] cleaning older than " + STREAM_EXPIRATION_TIME + "s...");

  var to_destroy = Storage.get_old(STREAM_EXPIRATION_TIME);
  var destroyed = [];

  to_destroy.forEach(function (item) {

    console.log("[Clean] deleting... " + item);

    client.streams.destroy(item.id, function (err, stream) {

      if (!err) {

        Storage.destroy(item.id);
        destroyed.push(item);
        console.log("[Clean] deleted " + item);

      } else {

        console.log("[Clean] error:cine-io");
        console.log(err);
      }
    });
  });

  return to_destroy;
}


/**
 * An API endpoint to trigger stream cleaning manually.
 */
exports.clean_streams = function (req, res, next) {

  console.log("[ManualClean] Cleaning...");
  
  var to_destroy = exports.clean();

  if (to_destroy.length === 0) {

    console.log("[ManualClean] nothing to do");
    res.json(304, to_destroy);

  } else {

    res.json(202, to_destroy);
    console.log("[ManualClean] done " + to_destroy);
  }

  next();
};


/**
 * Pulls all streams from Cine.IO to the cache.
 */
exports.sync_cache = function (req, res, next) {

  console.log("[Sync] syncing...");

  client.streams.index(function (err, streams) {

    if (!err) {
      console.log("[Sync] download:count " + streams.length);

      Storage.sync(streams);

      console.log("[Sync] done");
      res.json(200, Storage.get_all());

    } else {

      console.log("[Sync] error:cine-io");
      console.log(err);

      res.json(503, {});
    }
    next();
  });
};


/**
 * Get all streams in the cache.
 * Also returns how many streams are free.
 */
exports.get_streams = function (req, res, next) {

  console.log("[Get] getting all...");

  var current_size = Storage.size();
  res.header('X-Stream-Count', current_size);
  res.header('X-Stream-Count-Limit', STREAM_COUNT_LIMIT);
  res.json(200, all);

  console.log("[Get] done all");
  next();
};


/**
 * Returns all informations from a given stream.
 */
exports.get_stream = function (req, res, next) {

  var id = req.params.stream_id;

  console.log("[Get] getting... " + id);

  if (Storage.has(id)) {

    console.log("[Get] done " + id);
    res.json(200, Storage.get(id));

  } else {

    console.log("[Get] error:not-in-cache " + id);
    res.json(204, {code: "204", message: "Stream not in cache."});
  }
  next();
};


/**
 * Create a new stream from the Cine.IO API.
 */
exports.create_stream = function (req, res, next) {

  var custom_password = req.params.password;

  var current_size = Storage.size();

  var progress = current_size + "/" + STREAM_COUNT_LIMIT;

  console.log("[Create] total " + progress );

  if (current_size < STREAM_COUNT_LIMIT) {

    console.log("[Create] adding...");

    client.streams.create(function (err, stream) {

      if (!err) {

        // Allows for custom password.
        var password = custom_password || stream.password;

        Storage.add(stream, password, function (last_beat) {

          stream.password = password;
          stream.last_beat = last_beat;

          var url = stream.id + "?p=" + stream.password;

          console.log("[Create] done " + url);

          res.header('X-Stream-Count', current_size + 1);
          res.header('X-Stream-Count-Limit', STREAM_COUNT_LIMIT);

          res.json(200, stream);
        });

      } else {

        console.log("[Create] error:cine-io " + id);
        console.log(err);

        res.json(503, { code: 503, message: 'Could not get stream ' + id });
      }
    });

  } else {

    // Cannot create more streams. Maximum already attained.
    console.log("[Create] error:capped " + Storage.size());
    res.json(406, { code: "406", message: "Streams exhausted. " + progress });
  }

  next();
};


/**
 * Contacts the Cine.IO API, and deletes the given stream.
 */
exports.destroy_stream = function (req, res, next) {

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
      res.json(401, {code: "401", message: "Wrong password."});
    }
  } else {

    console.log("[Delete] error:not-in-cache " + id);
    res.json(204, {code: "204", message: "Stream not in cache."});
  }
  next();
};


/**
 * Signals the server that the stream is being used.
 */
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
      res.json(401, { code: "401", message: "Wrong password."});
    }
  } else {

    console.log("[Beat] error:not-in-cache " + id);
    res.json(204, { code: "204", message: "Stream not in cache."});
  }
  next();
};


/**
 * Gets all stream infos directly from cine.io
 */
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
        res.json(204, { code: "204", message: "Could not find stream " + id });
      }

    } else {

      console.log("[Get] error:cine-io " + id);
      console.log(err);

      res.json(503, { code: "503", message: "Error connecting to cine.io (" + id + ")" });
    }

    next();
  });
};
