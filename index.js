var MODULE_REQUIRE
	/* built-in */
	, stream = require('stream')
	, util = require('util')

	/* NPM */

	/* in-package */
	;

function extend(foo, bar) {
	var expanded = {};
	Array.from(arguments).forEach(function(arg) {
		for (var name in arg) {
			expanded[name] = arg[name];
		}
	});
	return expanded;
}

/**
 * processor = function(data, callback) {}
 * callback = function(err, data, ...) {}
 */
function Octopus(processor, options) {
	if (!(this instanceof Octopus)) {
		return new Octopus(processor, options);
	}

	var options = extend({
		fifo: false
	}, options);

	var self = this;
	var cursor = 0;

	var pushingChunks = [];
	var pushingCursor = 0;

	var closed = false;
	var onProcessing = 0;

	var pushColl = function(coll) {
		for (var i = 0; i < coll.length; i++) {
			self.push(coll[i]);
		}
	};

	var onDone = function(err, coll, index) {
		if (err) {
			return self.emit('error', err);
		}

		// 代表流的终止。
		if (coll === null) {
			// 如果当前没有数据在处理中，则直接终止流。
			if (onProcessing == 0) {
				self.push(null);
			}

			// 否则，将状态标记为关闭，此后不允许新的数据进入。
			else {
				closed = true;
			}

			return;
		}

		onProcessing--;

		// 如果要求先进先出，则需要依次输出已处理数据。
		if (options.fifo) {
			// 将已处理数据保存到待输出队列。
			pushingChunks[index] = coll;

			while(pushingChunks.hasOwnProperty(pushingCursor)) {
				// 输出数据。
				pushColl(pushingChunks[pushingCursor]);

				// 将输出游标前移一格。
				pushingCursor++;
			}
		}

		// 否则，直接输出数据。
		else {
			pushColl(coll);
		}

		if (closed && onProcessing == 0) {
			self.push(null);
		}
	};

	stream.Duplex.call(this, {
		readableObjectMode: true,
		writableObjectMode: true,

		read: function() {
		},

		write: function(data, encoding, callback) {
			// ---------------------------
			// 并发执行数据处理任务。
			var onProcessed;

			// 如果要求先进先出，则需要保留当前数据游标。
			if (options.fifo) {
				onProcessed = (function(index) {
					return function(err, data /*, ... */) {
						var args = Array.from(arguments);
						onDone(err, args.slice(1), index);
					};
				})(cursor);
			}
			else {
				onProcessed = function(err, data /*, ... */) {
					var args = Array.from(arguments);
					onDone(err, args.slice(1));
				}
			}
			onProcessing++;
			cursor++;
			processor(data, onProcessed);

			// 清空管道以使后续数据可以进入。
			callback();
		}
	});

	self.on('finish', function() {
		onDone(null, null, cursor);
	});
}

util.inherits(Octopus, stream.Duplex);

Octopus.Queue = function(processor, options) {
	options = extend({ fifo: true }, options);
	return Octopus(processor, options);
};

module.exports = Octopus;
