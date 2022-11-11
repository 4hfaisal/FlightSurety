import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

let config = Config['localhost'];
//let web3 = new Web3(new Web3.providers.HttpProvider(config.url));
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.wsUrl));
let accounts = await web3.eth.getAccounts();
web3.eth.defaultAccount = accounts[0];
let status;

let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
flightSuretyApp.options.gas = 10 ** 6;
flightSuretyData.options.gas = 10 ** 6;
flightSuretyApp.defaultAccount = accounts[0];
flightSuretyData.defaultAccount = accounts[0];

let TEST_ORACLES_COUNT = 22;
let oracleIndexes = [];
const statusCodes = [0,10,20,30,40,50];



//Point app to data and authroize caller
status = await flightSuretyData.methods.authorizeCaller(config.appAddress).send({from: accounts[0]});
status = await flightSuretyApp.methods.setDataContract(config.dataAddress).send({from: accounts[0]});


//console.log(status);

//Register the initial four airlines and pay funds
try{    
  await config.flightSuretyApp.registerAirline(accounts[1], {from: accounts[0]});
  await config.flightSuretyApp.registerAirline(accounts[2], {from: accounts[0]});
  await config.flightSuretyApp.registerAirline(accounts[3], {from: accounts[0]});
  await flightSuretyApp.methods.fund(accounts[0]).send({from: accounts[0],value: 10e18});
  await flightSuretyApp.methods.fund(accounts[1]).send({from: accounts[1],value: 10e18});
  await flightSuretyApp.methods.fund(accounts[2]).send({from: accounts[2],value: 10e18});
  await flightSuretyApp.methods.fund(accounts[3]).send({from: accounts[3],value: 10e18});
} catch {}

//Register flights
try{
  await flightSuretyApp.methods.registerFlight(accounts[1], "ND1300").send({from: accounts[1]});
  await flightSuretyApp.methods.registerFlight(accounts[2], "ND1301").send({from: accounts[2]});
  await flightSuretyApp.methods.registerFlight(accounts[1], "ND1302").send({from: accounts[1]});
  await flightSuretyApp.methods.registerFlight(accounts[3], "ND1303").send({from: accounts[3]});
} catch (e){}

//Register Oracles
try{
  let fee = await flightSuretyApp.methods.REGISTRATION_FEE().call({from: accounts[0]});
  //ACT
  try{
    for(let a=1; a<TEST_ORACLES_COUNT; a++) {
      await flightSuretyApp.methods.registerOracle().send({ from: accounts[a], value: fee, gas: 10 ** 6  });
      //let result = await flightSuretyApp.methods.getMyIndexes().call({from: accounts[a]}); 
      let result = await flightSuretyApp.methods.getMyIndexes().call({from: accounts[a], gas: 10 ** 6 });
      oracleIndexes[a] = result;
    }  
  } catch (e){a--;}
} catch (e){}


let options = {
  filter: {
      value: [],
  },
  fromBlock: 0
};


flightSuretyApp.events.OracleRequest(options)
  .on('data', async (event) => {
    let statusCodeToSend = statusCodes[(Math.round(Math.random()*100)%statusCodes.length)];
    for(let a=1; a<TEST_ORACLES_COUNT; a++) { 
      try{
        for(let idx=0;idx<3;idx++) {
          try {
            // Submit a response...it will only be accepted if there is an Index match
            await flightSuretyApp.methods.submitOracleResponse(oracleIndexes[a][idx], event.returnValues[1], event.returnValues[2], event.returnValues[3], statusCodeToSend).send({from: accounts[a], gas:  10 ** 6});
            //console.log('Accepted: ', idx, oracleIndexes[idx].toNumber(), flight, timestamp);
            //console.log(status);
          }
          catch(e) {}
          console.log("Oracle# ",a , " StatusCode: ", statusCodeToSend," Aireline Addr", event.returnValues[1], "FlightNumber: ",event.returnValues[2], "Timestamp: ", event.returnValues[3]);
        } 
      }catch (e){a--;}
  }
  })
  .on('changed', changed => console.log("Changed", changed))
  .on('error', err => console.log("Error: ", err))
  .on('connected', str => console.log("Connected: ", str))

  console.log("All seems to have initiatized successfully")

const app = express();
app.get('/', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


