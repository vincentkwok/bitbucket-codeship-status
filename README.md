![App Logo](https://raw.githubusercontent.com/chesleybrown/bitbucket-codeship-status/master/media/logo-small.png) bitbucket-codeship-status-using-oauth
=========================
[![Build Status](https://travis-ci.org/chesleybrown/bitbucket-codeship-status.svg?branch=master)](https://travis-ci.org/chesleybrown/bitbucket-codeship-status)
[![Dependency Status](https://david-dm.org/chesleybrown/bitbucket-codeship-status.svg)](https://david-dm.org/chesleybrown/bitbucket-codeship-status)
[![devDependency Status](https://david-dm.org/chesleybrown/bitbucket-codeship-status/dev-status.svg)](https://david-dm.org/chesleybrown/bitbucket-codeship-status#info=devDependencies)

Small app fork from [bitbucket-codeship-status](https://github.com/chesleybrown/bitbucket-codeship-status).

General purpose is the same, that will automatically update newly created pull requests in Bitbucket with the branch's Codeship build status by using OAUTH instead of bitbucket authentication.

![What it looks like](https://raw.githubusercontent.com/chesleybrown/bitbucket-codeship-status/master/media/screenshot.png)

# Running on Heroku

First just deploy a free instance of the app on heroku using the button then just follow the steps below. 

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

1. Create OAUTH consumers in bitbucket.
1. Set `BITBUCKET_USERNAME`, `OAUTH_KEY`, `OAUTH_SECRET` and `CODESHIP_API_KEY` ENV variables.
1. Add a `Pull Request POST` hook in Bitbucket for `Create / Edit / Merge / Decline` that points to your instance of this app. The URL should look something like this:
	- `https://<BITBUCKET_USERNAME>:<OAUTH_KEY>@<YOUR_APP_NAME_ON_HEROKU>.herokuapp.com/pull-request/<CODESHIP_PROJECT_UUID>/<CODESHIP_PROJECT_ID>`
	- Which would look something like this: `https://username:oauth_key@bitbucket-codeship-status-example.herokuapp.com/pull-request/ee1399cc-b740-43da-812f-d17901f9efa7/52132`
1. Now whenever a pull request is created, it should (almost instantly) get updated to have the [Codeship Status Badge](https://www.codeship.io/documentation/faq/codeship-badge/) in the description.