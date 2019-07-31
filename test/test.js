const stream = require('stream');
const Octopus = require('../index');

// Create a readable stream.
var rs = new stream.Readable({
	objectMode: true,
	read: function() {}
});

// Create a writable stream.
var ws = new stream.Writable({
	objectMode: true,
	write: function(chunk, encoding, callback) {
		console.log('ws written:', chunk);
		callback();
	}
});

// Create a duplex stream with "oct".
var myTransform = new Octopus(function(chunk, callback) {
	// Simulate a process which takes no more than 1 second (1000 millseconds).
	setTimeout(function() {
		callback(null, Math.pow(chunk, 2));

		// When ignoreDuplicateCallback set true, cecondly invoking of callback() will be ignored.
		// Otherwise, an exception will be thrown.
		callback(null, Math.pow(chunk, 3));
	}, Math.ceil(Math.random() * 1000));
}, { concurrent: 3, ignoreDuplicateCallback: true });

// Create a duplex stream with "oct".
var myTransform_2 = new Octopus(function(chunk, callback) {
	console.log('myTransform_2 written:', chunk);
	callback(new Error('something wrong!'), chunk);
}, { ignoreError: true });

// Connect three streams with pipes.
rs.pipe(myTransform).pipe(myTransform_2).pipe(ws);

// Push data into the first stream.
console.time('pipe');
[0,1,2,3,null].forEach((n) => rs.push(n));

ws.on('finish', function() {
	console.timeEnd('pipe');
});
