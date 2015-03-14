var Fiber = require('fibers');

var internals = {};

internals.Fiber = function(fn, args) {
  var nArgs = Array.prototype.slice.call(arguments, 1);
  var r = null;

  var fiber = Fiber.current;
  if (!fiber) {
    throw new Error('F.run can only be called inside a fiber');
  }

  var resumeCallback = function(err, data) {
    fiber.called = true;
    try {
      // console.log('resume fiber')
      fiber.run({
        err: err,
        data: data
      });
    } catch (e) {
      if (e.message === 'This Fiber is already running') {
        null;
      } else {
        throw e;
      }
    }
  };

  nArgs.push(resumeCallback);

  fiber.called = false;

  fn.apply(null, nArgs);

  if (!fiber.called) {
    r = Fiber.yield();
  }

  return r;
};

internals.Sleep = function(ms) {
  var fiber = Fiber.current;
  setTimeout(function() {
    fiber.run();
  }, ms);
  Fiber.yield();
};

internals.Fire = function(fn) {
  Fiber(function() {
    fn();
  }).run();
};

exports.Fire = internals.Fire;
exports.Sleep = internals.Sleep;
exports.Fiber = internals.Fiber;
