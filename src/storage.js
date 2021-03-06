var _storage = {};
var exports = module.exports;

exports.sync = function (streams) {

  console.log("[Storage] sync:start");

  streams.forEach(function (s) {

    if (!_storage.hasOwnProperty(s.id)) {

      exports.add(s, s.password);

    } else {
      // Stream is already cached
    }
  });

  console.log("[Storage] sync:done");
};

exports.add = function (stream, password, next) {

  var last_beat = Date.now();

  _storage[stream.id] = {};
  _storage[stream.id].stream = stream;
  _storage[stream.id].password = password;
  _storage[stream.id].last_beat = last_beat;

  console.log("[Storage] add:done " + stream.id + "?p=" + password);

  if (typeof(next) == 'function') {
    next(last_beat);
  }
};

exports.get = function (id) {

  if (!_storage.hasOwnProperty(id)) {

    console.log("[Storage] get:absent " + id);
  }
  return _storage[id].stream;
};

exports.destroy = function (id) {
  delete _storage[id];
  console.log("[Storage] destroy:done " + id);
};

exports.beat = function (id, timestamp) {

  var last_beat = _storage[id].last_beat;
  _storage[id].last_beat = timestamp;

  return last_beat;
};

exports.has = function (id) {
  return _storage.hasOwnProperty(id);
};

exports.get_all = function () {
  var output = [], temp;

  for (var item in _storage) {
    temp = {};
    temp.id = _storage[item].stream.id;
    temp.last_beat = _storage[item].last_beat;
    output.push(temp);
  }

  console.log("[Storage] getall:done " + output);
  return output;
};

/*
 * Gets all streams older than X seconds.
 */
exports.get_old = function (seconds) {

  var ttl = seconds * 1000; // 15 seconds
  var now = Date.now();
  var valid_time = new Date(now - ttl);
  var output = [];

  for (var id in _storage) {

    var beat = _storage[id].last_beat;
    if (beat < valid_time) {
      output.push({ id: id, last_beat: beat });
    }
  }

  return output;
};

exports.size = function () {
  return Object.keys(_storage).length;
};
