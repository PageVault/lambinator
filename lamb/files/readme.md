# Deployment Config
In order to deploy your function to AWS Lambda, you'll need deployment credentials with the proper privileges set up.
There are two ways to provide these deployment credentials to Lambinator:

1. Shared Credentials file
2. .env file

## Shared Credentials File (~/.aws/credentials)
AWS credentials supplied to the Node.js SDK are described here: [Credentials from the Shared Credentials File (~/.aws/credentials)](http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html)
If you have the [AWS Command Line Interface](https://aws.amazon.com/cli/) installed, you probably already have this file.
When using this method, you need to supply a region value in lambinator.json. This defaults to "us-east-1", so make sure you change this value before deploying using `lamb deploy`.

## .env File (.env.ENVNAME)
Lambinator creates a .env.sample file in this directory which can be renamed to ".env.ENVNAME". e.g. ".env.staging" will be used for deploying a staging version of your function.

NOTE: We recommend using option 1 (Shared Credentials file), as it avoids the potential liability of pushing your credentials into source control, which is a security anti-pattern.

# Runtime Config (lambinator.json)
The runtime role that your function will assume is set in lambinator.json. All other config values are set here as well, including memory, timeout, and other dependencies.

# Dependencies
If you function requires external binaries or other files, you simply need to place them in the function directory alongside your main function file, and add the name of the file to the lambinator.json "dependencies" array. Lambinator will automatically package this file into the zip that is uploaded to AWS Lambda. This is useful for including binaries such as phantomjs or wkhtmltopdf for use by your function.

# Runtime Settings (settings-ENVNAME.json)
For non-sensitive information that can be checked into source control, use settings-staging.json and settings-production.json (or settings-yourEnvironmentName.json). Lambinator will automatically produce a file called "settings.json" based on the environment you deploy to. To use the settings in your Lambda function, include the following lines in your function:

```
var fs    = require('fs')
  , path  = require('path')
  ;

var settings = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'settings.json')));
```
