# expressjs-beacon-middleware

Imagine you need to inject some data from your DB or filesystem into `res.locals` every request. This takes time even
with asynchronous requests on DDR4/SSD servers, and your app is getting slower. But if you can cache this data, you can
make this requests, say, once in a minute, or, maybe, even more. `expressjs-beacon-middleware` automates this for you.

## Usage

```js
var app = require('express')();
var beacon = require('expressjs-beacon-middleware');
app.use(
    '/',
    beacon({
        interval: 1000 * 30,
        default: 'counting...',
        name: 'usersOnline',
        updater: function (cb) {
            Users.count({active: true}, cb);
        }
    })
);
app.get('/', function (req, res) {
    res.render('index');
});
```

```jade
// index.jade
h1 My site. Population: #{usersOnline}
```

Sometimes you need to somehow process information before it's get injected into `res.locals`. There is `transform` field
 for such cases:

```js
var app = require('express')();
var beacon = require('expressjs-beacon-middleware');
app.use(
    '/',
    beacon({
        default: 'counting...',
        name: 'usersOnline',
        transform: function (err, usersCount) { // you can also handle errors here
            if (usersCount === 0) {
                return 'no one:(';
            } else if (usersCount < 10) {
                return 'couple of folks';
            } else if (usersCount < 100) {
                return 'the more the better';
            } else if (usersCount < 1000) {
                return 'hundreds!';
            } else {
                return 'gajillions!';
            }
        },
        updater: function (cb) {
            Users.count({active: true}, cb)
        }
    })
);
```

Sometimes this periodically updated information is too important and you can't do with some placeholder. By passing
callback as second argument you're telling beacon middleware that is should retrieve information first and then proceed.

```js
var app = require('express')();
var beacon = require('expressjs-beacon-middleware');
beacon(
    {
        // you can omit `default` field this time
        name: 'usersOnline',
        updater: function (cb) {
            Users.count({}, cb);
        }
    },
    function (beaconMw) { // callback receives middleware instance
        app.get('/', beaconMw, function (req, res) {
            res.render('index');
        });
    }
);
```

If you need to change default interval and transform function globally (through the app) you can do so by assigning new
values for corresponding fields in middleware factory:

```js
var beacon = require('expressjs-beacon-middleware');
var mailer = require('./lib/my-mailer');
beacon.interval = require('ms')('1h');
beacon.transform = function (err, result) {
    if (err) {
        mailer.mail(err);
    }

    return result.some.very.important.field;
}
```

## Todo

* Add ability to work with app.locals as well
* Tests for global defaults changing
* 100% coverage
