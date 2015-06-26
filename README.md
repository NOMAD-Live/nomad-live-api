# `nomad-live-api` <img src="http://online.swagger.io/validator?url=https://rawgit.com/NOMAD-Live/nomad-live-api/master/swagger/swagger.yaml"> [![Circle CI](https://circleci.com/gh/NOMAD-Live/nomad-live-api.svg?style=svg)](https://circleci.com/gh/NOMAD-Live/nomad-live-api)

This repository is setup with Circle CI. If all the tests pass, it pushes to the api server.
To then run the actual code, you have to do a git pull on the repo:

```bash
ssh -i ~/.ssh/NOMAD-dev.pem ubuntu@api.nomadlive.tv
cd nomad-live-api/
git pull
```