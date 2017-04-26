#   Change Log

Notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning 2.0.0](http://semver.org/).

##	[0.0.4] - 2017-04

###	Fixed, Forbidden Duplicate Invoking Of ``callback()``

Before, the ``callback()`` may be invoked twice or more times, e.g.

```javascript
var myTransform = new Octopus(function(chunk, callback) {
	setTimeout(function() {
		callback(null, Math.pow(chunk, 2));
		callback(null, Math.pow(chunk, 3));
	}, Math.ceil(Math.random() * 1000));
});
```

This may (not always) lead to some error like:  

```
Error: stream.push() after EOF
```

The bug has been fixed in this version, and duplicate invoking will throw an error (by default) or be ignored (if options slient is true).

##	[0.0.2] - 2017-04

###	Functions Added

*	__options.concurrent__ supported to limit the number of objects being processed parallelly.

---
This CHANGELOG.md follows [*Keep a CHANGELOG*](http://keepachangelog.com/).
