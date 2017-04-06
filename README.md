#	oct, a stream octopus

__A wrapper of stream.Duplex in object mode to make things more flexible, or more efficient.__

Package *oct* takes its name from octopus, an animal with eight feet.

```javascript
var myStream = new Octopus(function(obj, callback) {
	// The objects piped in from upstreams will be received and processed immediately.
});
```

__ATTENTION: Only object mode is supported, so, the parameter "encoding" is useless and SHOULD NOT appear.__

##	A Simple Example

```javascript
const stream = require('stream');
const Octopus = require('oct');

// Create a readable stream.
var rs = new stream.Readable({
	objectMode: true,
	read: function() {}
});

// Create a writable stream.
var ws = new stream.Writable({
	objectMode: true,
	write: function(chunk, encoding, callback) {
		console.log(chunk);
		callback();
	}
});

// Create a duplex stream with "oct".
var myTransform = new Octopus(function(chunk, callback) {
	// Simulate an asynchronous process which takes no more than 1 second (1000 millseconds).
	setTimeout(function() {
		callback(null, chunk * 3);
	}, Math.ceil(Math.random() * 1000));
});

// Connect three streams with pipes.
rs.pipe(myTransform).pipe(ws);

// Push data into the first stream.
console.time('pipe');
rs.push(1);
rs.push(2);
rs.push(3);
rs.push(null);

// Print the total time consumed in millseconds.
ws.on('finish', function() {
	console.timeEnd('pipe');
})
```

Try it, and see what happened? Pay attention that, depand on the most time-consuming asynchronous process, all data will be piped out from the end of the whole pipe in no more than about 1000 millseconds.

Sometimes, the downstream wants chunks pushed in the order that they are piped out from the upstream, in a word [FIFO](https://en.wikipedia.org/wiki/FIFO). So, ``Octopus.Queue`` is helpful:

```javascript
// ...

// Create a duplex stream which will pipe out chunks in the order that they are piped in.
var myTransform = new Octopus.Queue(function(chunk, callback) {
	// Simulate an asynchronous process which takes no more than 1 second (1000 millseconds).
	setTimeout(function() {
		callback(null, chunk * 3);
	}, Math.ceil(Math.random() * 1000));
});

// ...
```

You will always get 3, 6, 9 in the same order. As a cost, it may take more time to print the first number. However, the total time will still no more than about 1000 millseconds.

##	Why *oct* ?

Before, [through2](https://www.npmjs.com/package/through2) has been well-known and widely used. It is excellent and easy to invoke, e.g.

```javascript
var myTransform = require('through2').obj(function(chunk, encoding, callback) {
	// Simulate a complex process which takes 1 second.
	setTimeout(function() {
		var data = [ chunk[2], chunk[5], chunk[8] ];
		callback(null, data);
	}, 1000);
});
```

However, by through2, the process flow is strongly restricted: a subsequent chunk will not be read / processed until the preceding one has been processed and the ``callback()`` has been called.

Another package [through2-concurrent](https://www.npmjs.com/package/through2-concurrent) is created to satisfy whom wanna do things in parallel:

```javascript
var myTransform = require('through2-concurrent').obj(function(chunk, encoding, callback) {
	// Simulate a complex process which takes no more than 1 second (1000 millseconds).
	setTimeout(function() {
		var data = [ chunk[2], chunk[5], chunk[8] ];
		callback(null, data);
	}, Math.ceil(Math.random() * 1000));
});
```

According to the previous example, the new chunks piped out by ``myTransform`` MAY BE NOT in the order that the raw chunks piped in. That is because the new chunk will be flushed ASAP it generated. Sometimes, such disorder is ok, sometimes not. That is why *oct* is created.
