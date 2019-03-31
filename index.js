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

function once(fn, errmsg) {
	var hasRun = false;
	return function() {
		if (hasRun) {
			if (errmsg) throw new Error(errmsg);
		}
		else {
			hasRun = true;
			fn.apply(null, arguments);
		}
	};
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
		// 是否保持流的顺序。
		fifo: false,

		// 设定并发上限，0 表示没有上限。
		concurrent: 0

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

	var tryEndStream = function() {
		// 如果已标记为关闭，且当前没有数据在处理中，则终止流。
		if (closed && onProcessing == 0) {
			self.push(null);
			self.emit('end');
			self.emit('close');
		}
	};

	var onDone = function(err, coll, index) {
		if (err) {
			return self.emit('error', err);
		}

		// 代表流的终止。
		if (coll === null) {
			// 将状态标记为关闭，此后不允许新的数据进入。
			closed = true;
			tryEndStream();
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

		tryEndStream();
	};

	stream.Duplex.call(this, {
		readableObjectMode: true,
		writableObjectMode: true,

		read: function() {
		},

		write: function(data, encoding, callback) {
			// ---------------------------
			// 并发执行数据处理任务。

			// onProcessed() 在当前对象处理完成时触发。
			var onProcessed;

			var callbackOnce = once(callback);

			// 如果要求先进先出，则需要保留当前数据游标。
			if (options.fifo) {
				onProcessed = (function(index) {
					return function(err, data /*, ... */) {
						var args = Array.from(arguments);
						onDone(err, args.slice(1), index);
						callbackOnce();
					};
				})(cursor);
			}
			else {
				onProcessed = function(err, data /*, ... */) {
					var args = Array.from(arguments);
					onDone(err, args.slice(1));
					callbackOnce();
				}
			}
			onProcessing++;
			cursor++;

			var fnNext = once(onProcessed,
				options.ignoreDuplicateCallback ? null : 'The callback must not be invoked twice or more.');
			processor(data, fnNext);

			// 清空管道以使后续数据可以进入。
			if (!options.concurrent || onProcessing < options.concurrent) {
				callbackOnce();
			}
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
