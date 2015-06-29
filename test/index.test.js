/* eslint-env mocha */

'use strict';
var assert = require('chai').assert;
var beacon = require('../index');

describe('beacon-middleware', function () {
    describe('throws proper exceptions', function () {
        it('throws exceptions when no name provided', function () {
            assert.throws(
                beacon.bind(null, {name: ''}),
                TypeError,
                /No updater function provided for beacon middleware/,
                'correctly throws when updater is missing'
            );
        });

        it('throws exceptions when no updater provided', function () {
            assert.throws(
                beacon.bind(null, {updater: console.log}),
                TypeError,
                /No name property provided for beacon middleware/,
                'correctly throws when updater is missing'
            );
        });
    });

    describe('two forms of call', function () {
        it('returns a function when no second argument is provided', function () {
            var config = {
                interval: 50,
                updater: function (cb) {
                    cb(null, 'some value');
                },
                name: 'someKey'
            };

            var mw = beacon(config);
            assert.isFunction(mw, 'returned function');
        });

        it('returns nothing if second argument is provided and instead calls back', function (done) {
            var config = {
                interval: 50,
                updater: function (cb) {
                    cb(null, 'some value');
                },
                name: 'someKey'
            };
            beacon(config, function (mw) {
                assert.isFunction(mw, 'passed middleware to callback');
                done();
            });
        });
    });

    it('resulting middleware injects value by given name to res.locals and calls next', function (done) {
        var config = {
            interval: 50,
            updater: function (cb) {
                cb(null, 'some value');
            },
            name: 'someKey'
        };
        var mw = beacon(config);

        var res = {
            locals: {}
        };

        mw(null, res, function () {
            assert.ok('called next');
            assert.equal(res.locals.someKey, 'some value', 'injected ok');

            done();
        });
    });

    it('periodically calls updater and transformer', function (done) {
        var updaterCounter = 0;
        var transformCounter = true;
        var config = {
            interval: 50,
            transform: function (err, result) {
                if (err) {
                    console.error(err);
                }
                transformCounter++;
                return result;
            },
            updater: function (cb) {
                updaterCounter++;
                if (updaterCounter === 2 && transformCounter === 2) {
                    assert.ok('updater and transform called');
                    done();
                }
                cb(null, 'some value');
            },
            name: 'someKey'
        };
        beacon(config);
    });

    it('two middlewares do not mess each other\'s data', function (done) {
        var updater1Called = false;
        var updater2Called = false;
        var isDone = false;
        var res = {
            locals: {}
        };
        function onUpdater () {
            if (isDone) {
                return;
            }
            assert.equal(res.locals.mw1, 42);
            assert.equal(res.locals.mw2, 24);
            isDone = true;
            done();
        }

        var config1 = {
            interval: 50,
            name: 'mw1',
            updater: function (cb) {
                if (!updater1Called) {
                    updater1Called = true;
                } else {
                    if (updater2Called) {
                        onUpdater();
                    }
                }

                cb(null, 42);
            }
        };
        var config2 = {
            interval: 50,
            name: 'mw2',
            updater: function (cb) {
                if (!updater2Called) {
                    updater2Called = true;
                } else {
                    if (updater1Called) {
                        onUpdater();
                    }
                }

                cb(null, 24);
            }
        };


        var mw1 = beacon(config1);
        var mw2 = beacon(config2);

        mw1(null, res, function () {
            mw2(null, res, console.log.bind(console));
        });
    });

    describe('default `transform`', function () {
        var oldConsoleError = console.error;
        var errorArgs;

        before(function () {
            oldConsoleError = console.error;
            console.error = function () {
                errorArgs = arguments;
            };
        });
        after(function () {
            console.error = oldConsoleError;
        });

        it('by default console.error\'s errors, if any', function (done) {
            var error = {error: true};
            var conf = {
                interval: 50,
                name: 'mw',
                updater: function (cb) {
                    cb(error, 'any value');
                }
            };

            setTimeout(function () {
                assert.deepEqual(errorArgs[0], error);
                done();
            }, 100);

            beacon(conf);
        });

        it('passes value as is', function (done) {
            var value = {value: true};
            var conf = {
                interval: 50,
                name: 'mw',
                updater: function (cb) {
                    cb(null, value);
                }
            };

            var res = {
                locals: {}
            };

            var mw = beacon(conf);
            mw(null, res, function () {
                assert.ok(res.locals.mw === value);
                done();
            });
        });
    });
});