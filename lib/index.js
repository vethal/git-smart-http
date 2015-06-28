module.exports = function (config) {
	var spawn = require("child_process").spawn;
	var path = require("path");
	var on = [];
	var self = function (req, res, next) {
		if (req.method == "GET" &&
			req.path == "/info/refs") {
			action(req, res, req.query.service, handleGet);
		} else if (req.method == "POST" &&
			(req.path == "/git-receive-pack" || req.path == "/git-upload-pack")) {
			action(req, res, req.path.slice(1), handlePost);
		} else {
			next();
		}
	}

	self.init = function (callback) {
		var copy = spawn("robocopy", [path.resolve(__dirname , "../script/hooks"),
			path.resolve(config.repo, "hooks"), "/XC", "/XN", "/XO"]);

		copy.stderr.on("data", function (data) {
			callback && callback(data);
		});
		copy.on("close", function (code) {
			callback && callback();
		});
	}

	self.getBranches = function (callback) {
		branch(["branch"], callback);
	}

	self.getRemoteBranches = function (callback) {
		branch(["branch", "--remotes"], callback);
	}

	self.getBranchesContains = function (object, callback) {
		branch(["branch", "--contains", object], callback);
	}

	self.getCommits = function (object, callback) {
		object = object || "--all";
		commit(["rev-list", object], callback);
	}

	self.getTags = function (callback) {
		tag(["tag"], callback);
	}

	self.getTagsContains = function (object, callback) {
		tag(["tag", "--contains", object], callback);
	}

	self.getTagsPointsAt = function (object, callback) {
		tag(["tag", "--points-at", object], callback);
	}

	self.getDetails = function (object, callback) {
		command(["show", "--quiet",
			'--format={' +
			'	"author":{%n' +
			'		"name":"%an",' +
			'		"mail":"%ae",' +
			'		"date":"%aD"' +
			'	},' +
			'	"committer":{%n' +
			'		"name":"%cn",' +
			'		"mail":"%ce",' +
			'		"date":"%cD"' +
			'	},' +
			'	"message":"%s",' +
			'	"sha":"%H"' +
			'}',
			object
		],
		function (error, data) {
			var json = JSON.parse(data);
			json.author.date = new Date(json.author.date);
			json.committer.date = new Date(json.committer.date);
			callback && callback(error, json);
		});
	}

	self.receive = function (callback) {
		on["git-receive-pack"] = callback;
	}

	self.upload = function (callback) {
		on["git-upload-pack"] = callback;
	}
	
	self.applypatchMsg = function (callback) {
		config.app.post("/git-smart-http/applypatch-msg", function (req, res, next) {
			notify(req.body, res, callback)
		});
	}

	self.preApplypatch = function (callback) {
		config.app.post("/git-smart-http/pre-applypatch", function (req, res, next) {
			notify(req.body, res, callback)
		});
	}

	self.postApplypatch = function (callback) {
		config.app.post("/git-smart-http/post-applypatch", function (req, res, next) {
			notify(req.body, res, callback)
		});
	}

	self.preCommit = function (callback) {
		config.app.post("/git-smart-http/pre-commit", function (req, res, next) {
			notify(req.body, res, callback)
		});
	}

	self.prepareCommitMsg = function (callback) {
		config.app.post("/git-smart-http/prepare-commit-msg", function (req, res, next) {
			notify(req.body, res, callback)
		});
	}

	self.commitMsg = function (callback) {
		config.app.post("/git-smart-http/commit-msg", function (req, res, next) {
			notify(req.body, res, callback)
		});
	}

	self.postCommit = function (callback) {
		config.app.post("/git-smart-http/post-commit", function (req, res, next) {
			notify(req.body, res, callback)
		});
	}

	self.preRebase = function (callback) {
		config.app.post("/git-smart-http/pre-rebase", function (req, res, next) {
			notify(req.body, res, callback)
		});
	}

	self.postCheckout = function (callback) {
		config.app.post("/git-smart-http/post-checkout", function (req, res, next) {
			notify(req.body, res, callback)
		});
	}

	self.postMerge = function (callback) {
		config.app.post("/git-smart-http/post-merge", function (req, res, next) {
			notify(req.body, res, callback)
		});
	}

	self.prePush = function (callback) {
		config.app.post("/git-smart-http/pre-push", function (req, res, next) {
			notify(req.body, res, callback)
		});
	}

	self.preReceive = function (callback) {
		config.app.post("/git-smart-http/pre-receive", function (req, res, next) {
			var body = req.body;

			for (var iIndex in body) {
				var branch = body[iIndex];

				for (var jIndex in branch.commits) {
					var commit = branch.commits[jIndex];

					commit.author.date = new Date(commit.author.date);
					commit.committer.date = new Date(commit.committer.date);
				}
			}
			
			notify(body, res, callback)
		});
	}

	self.update = function (callback) {
		config.app.post("/git-smart-http/update", function (req, res, next) {
			var body = req.body;

			for (var index in body.commits) {
				var commit = body.commits[index];

				commit.author.date = new Date(commit.author.date);
				commit.committer.date = new Date(commit.committer.date);
			}
			
			notify(body, res, callback)
		});
	}

	self.postReceive = function (callback) {
		config.app.post("/git-smart-http/post-receive", function (req, res, next) {
			var body = req.body;

			for (var iIndex in body) {
				var branch = body[iIndex];

				for (var jIndex in branch.commits) {
					var commit = branch.commits[jIndex];

					commit.author.date = new Date(commit.author.date);
					commit.committer.date = new Date(commit.committer.date);
				}
			}
			
			notify(body, res, callback)
		});
	}

	self.postUpdate = function (callback) {
		config.app.post("/git-smart-http/post-update", function (req, res, next) {
			notify(req.body, res, callback)
		});
	}

	self.pushToCheckout = function (callback) {
		config.app.post("/git-smart-http/push-to-checkout", function (req, res, next) {
			notify(req.body, res, callback)
		});
	}

	self.preAutoGC = function (callback) {
		config.app.post("/git-smart-http/pre-auto-gc", function (req, res, next) {
			notify(req.body, res, callback)
		});
	}

	self.postRewrite = function (callback) {
		config.app.post("/git-smart-http/post-rewrite", function (req, res, next) {
			notify(req.body, res, callback)
		});
	}

	self.rebase = function (callback) {
		config.app.post("/git-smart-http/rebase", function (req, res, next) {
			notify(req.body, res, callback)
		});
	}

	return self;

	/* Private methods */

	function action (req, res, service, callback) {
		var pending = true;

		on[service] && on[service](req, res, {
			"accept": function () {
				pending = false;
				callback(req, res);
			},
			"reject": function (error, message) {
				pending = false;
				res.status(error).send(message);
			}
		});

		pending && callback(req, res);
	}


	function handleGet (req, res) {
		var service = req.query.service;

		res.setHeader("Expires", "Fri, 01 Jan 1980 00:00:00 GMT");
		res.setHeader("Pragma", "no-cache");
		res.setHeader("Cache-Control", "no-cache, max-age=0, must-revalidate");
		res.setHeader("Content-Type", "application/x-" + service + "-advertisement");

		var packet = "# service=" + service + "\n";
		var length = packet.length + 4;
		var hex = "0123456789abcdef";
		var prefix = hex.charAt((length >> 12) & 0xf);
		prefix += hex.charAt((length >> 8) & 0xf);
		prefix += hex.charAt((length >> 4) & 0xf);
		prefix += hex.charAt(length & 0xf);
		res.write("" + prefix + packet + "0000");

		var git = spawn(__dirname + "/../script/" + service + ".cmd", ["--stateless-rpc", "--advertise-refs", config.repo]);
		git.stdout.pipe(res);
		git.stderr.on("data", function (data) {
			console.error(data);
		});
		git.on("exit", function () {
			res.end();
		});
	}

	function handlePost (req, res) {
		var service = req.path.slice(1);

		res.setHeader("Expires", "Fri, 01 Jan 1980 00:00:00 GMT");
		res.setHeader("Pragma", "no-cache");
		res.setHeader("Cache-Control", "no-cache, max-age=0, must-revalidate");
		res.setHeader("Content-Type", "application/x-" + service + "-result");

		var git = spawn(__dirname + "/../script/" + service + ".cmd", ["--stateless-rpc", config.repo]);
		req.pipe(git.stdin);
		git.stdout.pipe(res);
		git.stderr.on("data", function (data) {
			console.error(data);
		});
		git.on("exit", function () {
			res.end();
		});
	}

	function notify (body, res, callback) {
		var pending = true;

		callback(body, {
			"accept": function () {
				pending = false;
				res.end();
			},
			"reject": function (error, message) {
				pending = false;
				res.status(error).send(message);
			}
		});

		pending && res.end();
	}

	function branch (options, callback) {
		command(options, function(error, data) {
			var result = data.split("\n");

			for (var index = 0; index < result.length; index++) {
				result[index] = result[index].replace(/[ *]/g, '');
				!result[index].length && result.splice(index--, 1);
			}

			callback && callback(error, result);
		});
	}

	function commit (options, callback) {
		command(options, function(error, data) {
			var result = data.split("\n");

			for (var index = 0; index < result.length; index++) {
				!result[index].length && result.splice(index--, 1);
			}

			callback && callback(error, result);
		});
	}

	function tag (options, callback) {
		command(options, function(error, data) {
			var result = data.split("\n");

			for (var index = 0; index < result.length; index++) {
				!result[index].length && result.splice(index--, 1);
			}

			callback && callback(error, result);
		});
	}

	function command (options, callback) {
		var branch = spawn("git", options, {"cwd": path.resolve(config.repo)});
		var result = "";

		branch.stdout.on("data", function (data) {
			result += data.toString();
		});
		branch.stderr.on("data", function (data) {
			callback && callback(data, "");
		});
		branch.on("close", function (code) {
			callback && callback(null, result);
		});
	}
}
