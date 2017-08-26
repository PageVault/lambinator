# Who
![alt text](https://s3.amazonaws.com/resources.page-vault.com/lambinator.png "Lambinator Logo")

# What

lamb·i·nat·or

_n._

1. A set of command line tools for managing AWS Lambda functions
2. _future_ registry of pre-built functions for deploying to AWS Lambda

# Why

There are several projects emerging in this space, but none quite met our needs:

- Ability to test locally with external binaries available in your PATH, but deploy to AWS Lambda with Linux-compiled binaries
- Ability to manage several functions in a single repository
- Ability to write in current JavaScript syntax and transpile to Node6.10 for deployment
- Desire to create a growing registry of canned functions that you can install, modify and deploy for your own use

Lambinator currently handles the first three scenarios, and will eventually handle all 4.

# How

## Installation

`npm install lambinator -g`

## Basic Usage
* `lamb new my-function-name` -- create a new function directory with lambinator assets (.env, lambinator.json, my-function-name.js)
* `lamb run my-function-name` -- run a function locally
* `lamb deploy my-function-name --env development` -- deploy a function to AWS Lambda
* _future_ `lamb list` -- list functions in lambinator registry
* _future_ `lamb install registered-function-name` -- download a function from the lambinator registry for editing

## Example
### Install Lambinator, create a new function, and run it
``` 
npm install -g lambinator
mkdir lamb-test && cd lamb-test
lamb new hello-world
lamb run hello-world
```

## Detailed Usage
### AWS Credentials
In order to deploy Lambda functions you will need IAM credentials with adequate privileges. Lambinator uses the AWS SDK for Javascript, whose [permission model is described here](http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html). Our recommended approach is to _not_ specify credentials in any .env files