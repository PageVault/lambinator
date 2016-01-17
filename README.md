#Who
![alt text](https://s3.amazonaws.com/resources.page-vault.com/lambinator.png "Lambinator Logo")

#What

lamb·i·nat·or

_n._

1. A set of command line tools for managing AWS Lambda functions
2. _future_ registry of pre-built functions for deploying to AWS Lambda

#Why

There are several projects emerging in this space, but none quite met our needs:

- Ability to test locally with external binaries available locally in your PATH, but deployed to AWS Lambda with Linux-compiled versions
- Ability to manage several functions in a single repository
- Desire to create a growing registry of canned functions that you can install, modify and deploy for your own use

Lambinator currently handles the first two scenarios, and will eventually handle all 3.

#How

##Installation

`npm install lambinator`

##Basic Usage
* `lamb new my-function-name` -- create a new function directory with lambinator assets (.env, lambinator.json, my-function-name.js)
* `lamb run my-function-name` -- run a function locally 
* `lamb deploy my-function-name --env development` -- deploy a function to AWS Lambda
* _future_ `lamb list` -- list functions in lambinator registry
* _future_ `lamb install registered-function-name` -- download a function from the lambinator registry for editing

##Detailed Usage
Details to come!