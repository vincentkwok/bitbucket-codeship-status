module.exports = function () {
	var express = require('express');
	var bodyParser = require('body-parser');
	var Request = require('request');
	var basicAuth = require('basic-auth-connect');
	var q = require('q');
	var app = express();
	
	app.use('/media', express.static(__dirname + '/media'));
	app.use(bodyParser.json());
	app.set('view engine', 'ejs');
	app.enable('trust proxy');

	function oauth () {
		return {
			consumer_key: process.env.OAUTH_KEY,
			consumer_secret: process.env.OAUTH_SECRET
		};
	}

	function getBuildCommitSha (pullRequest) {
		if ( !((pullRequest.source) && (pullRequest.source.commit) && (pullRequest.source.commit.hash)) ) {
			return null;
		}
		return pullRequest.source.commit.hash;
	}

	function getCodeshipBuildId (responseBody, buildCommitSha) {
		var codeshipBuildId = null;

		responseBody.builds.forEach(function (build, index) {
			if (buildCommitSha.indexOf(build.commit_id) === 0) {
				codeshipBuildId = build.id;
			}
		});
		return codeshipBuildId;
	}

	function getWidgetUrlPromise (pullRequest, codeshipProjectId) {
		var deferred = q.defer();
		var buildCommitSha = getBuildCommitSha(pullRequest);
		var baseWidgetUrl = 'https://codeship.io/projects/' + codeshipProjectId;

		if (!buildCommitSha) {
			deferred.resolve(baseWidgetUrl);
		} else {
			var get_codeship_project_url = 'https://codeship.com/api/v1/projects/' + codeshipProjectId + '.json?api_key=' + process.env.CODESHIP_API_KEY;
			Request({
				url: get_codeship_project_url,
				method: 'GET'
			}, function (err, response, body) {
				if (err) {
					deferred.reject(new Error(err));
				} else {
					var body = JSON.parse(response.body);
					var codeshipBuildId = getCodeshipBuildId(body, buildCommitSha);

					deferred.resolve(baseWidgetUrl + '/builds/' + codeshipBuildId);
				}
			});
		}
		return deferred.promise;
	}

	app.get('/', function (req, res) {
		Request({
			url: 'https://api.bitbucket.org/2.0/users/' + process.env.BITBUCKET_USERNAME,
			method: 'GET',
			oauth: oauth()
		}, function (err, response, body) {
			res.render('index', {
				BITBUCKET_USERNAME: process.env.BITBUCKET_USERNAME,
				OAUTH_KEY: process.env.OAUTH_KEY,
				OAUTH_SECRET: process.env.OAUTH_SECRET,
				ssl: (req.protocol === 'https') ? true : false,
				host: req.get('host'),
				authenticated: (err || response.statusCode !== 200) ? false : true
			});
		});
	});
	
	app.post('/pull-request/:codeshipProjectUuid/:codeshipProjectId', basicAuth(function (username, password) {
		return (username === process.env.BITBUCKET_USERNAME && password === process.env.OAUTH_KEY);
	}), function (req, res) {
		if (Object.keys(req.body).length === 0) {
			res.status(400).end();
			return;
		}
		
		// verify we have the information we need
		if (!req.body.pullrequest_created) {
			res.status(400).end();
			return;
		}
		var pullRequest = req.body.pullrequest_created;
		
		if (!pullRequest.id || typeof(pullRequest.description) !== 'string' || !(pullRequest.source && pullRequest.source.branch && pullRequest.source.branch.name) || !(pullRequest.source && pullRequest.source.repository && pullRequest.source.repository.full_name)) {
			res.status(400).end();
			return;
		}

		// if it doesn't already have Codeship status at the start of the description, let's add it
		if (pullRequest.description.indexOf('[ ![Codeship Status') !== 0) {
			var widgetUrlPromise = getWidgetUrlPromise(pullRequest, req.param('codeshipProjectId'));
			widgetUrlPromise.then(function (widgetUrl) {
				var widget = '[ ![Codeship Status for ' + pullRequest.source.repository.full_name + '](https://codeship.io/projects/' + req.param('codeshipProjectUuid') +'/status?branch=' + pullRequest.source.branch.name + ')](' + widgetUrl + ')';

				pullRequest.description = widget + '\r\n\r\n' + pullRequest.description;
				
				Request({
					url: 'https://api.bitbucket.org/2.0/repositories/' + pullRequest.source.repository.full_name + '/pullrequests/' + pullRequest.id,
					method: 'PUT',
					oauth: oauth(),
					json: pullRequest
				}, function (err, response, body) {
					if (err) {
						res.status(500).end();
						return;
					}
					
					if (response.body && response.body.error) {
						console.log('response.body', response.body);
						console.log('response.body.error', response.body.error);
						res.status(500).end();
						return;
					}
					res.status(204).end();
				});
			});
		}
		else {
			res.status(204).end();
		}
	});
	
	return app;
};