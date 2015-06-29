'use strict';

function defaultTransform (err, result) {
    if (err) {
        console.error(err);
    }
    return result;
}

/**
 *
 * @param {Object} config
 * @param {String} config.name key by which desired data will be put to res.locals
 * @param {*} config.default default value which will be provided until data will be received for the first time
 * @param {Number} [config.interval=60000] milliseconds, how often will be data updated
 * @param {Function} config.updater function which will be called periodically to update data, should accept CPS-style callback
 * @param {Function} [config.transform] function which accepts `(err, result)` and return prepared data. By default just returns `result` (and logs error, if `err`)
 * @param {Function} [onReady] if present, updater will be called first and only then onReady called with injector
 *
 * @return {Function|undefined} returned function is desired middleware. If `onReady` specified, then nothing is returned
 */
function beaconMiddleware (config, onReady) {
    if (!config.updater) {
        throw new TypeError('No updater function provided for beacon middleware');
    }

    if (!config.name) {
        throw new TypeError('No name property provided for beacon middleware');
    }

    var stored;

    if (config.default) {
        stored = config.default;
    }

    var injector = function (req, res, next) {
        res.locals[config.name] = stored;
        next();
    };
    var transform = (config.transform || beaconMiddleware.transform);

    function updater () {
        config.updater(onUpdate); // eslint-disable-line no-use-before-define
    }

    function onUpdate (err, result) {
        stored = transform(err, result);
        setTimeout(updater, config.interval || beaconMiddleware.interval);
    }

    if (onReady) {
        config.updater(function (err, result) {
            onUpdate(err, result);
            onReady(injector);
        });
    } else {
        updater();
        return injector;
    }
}

beaconMiddleware.interval = 60 * 1000;
beaconMiddleware.transform = defaultTransform;


module.exports = beaconMiddleware;