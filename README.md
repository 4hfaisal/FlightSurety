## Install

The project utilized the **latest** software version from almost all dependencies. Following are the version numbers for the main packages and the rest can be found in the package.json file.

Truffle v5.6.3
Ganache v7.4.4
Solidity - 0.8.1 (solc-js)
Node v16.18.0
Web3.js v1.7.4
webpack 5.74.0

Server (oracles) app is using webpack with nodemon plugin instead of the original server-starter-plugin which is seems not to be available for the new webpack version.

Ganache was used for this project (running on standrd port 7545, Network ID 5777) and should be configured to run **with at least 23 accounts** otherwise the test scripts and dapp/server will fail.

To install and run, as per original instructions

`npm install`
`truffle compile`
`truffle migrate --reset`
`truffle test`

To run the oracles server
`npm run server`

To build and run the dapp:
`npm run dapp:prod`
