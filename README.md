# Who
![alt text](https://s3.amazonaws.com/resources.page-vault.com/lambinator.png "Lambinator Logo")

# What

lamb·i·nat·or

_n._

1. A set of command line tools for managing AWS Lambda functions

# Why

There are several projects in this space, but none quite met our needs:

- Simple to use, focused on AWS
- No need to integrate with API Gateway
- Ability to test locally with external binaries available in your PATH, but deploy to AWS Lambda with Linux-compiled binaries
- Ability to manage several functions in a single repository
- Ability to write in current JavaScript syntax and transpile to Node6.10 for deployment

# How

## Installation

`npm install lambinator -g`

## Basic Usage
* `lamb new my-function-name` -- create a new function directory with lambinator assets (.env, lambinator.json, my-function-name.js)
* `lamb run my-function-name` -- run a function locally
* `lamb deploy my-function-name --env development` -- deploy a function to AWS Lambda

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