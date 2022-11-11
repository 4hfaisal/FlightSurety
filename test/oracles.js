
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Oracles', async (accounts) => {

  const TEST_ORACLES_COUNT = 22;
  var config;
  // Watch contract events
  const STATUS_CODE_UNKNOWN = 0;
  const STATUS_CODE_ON_TIME = 10;
  const STATUS_CODE_LATE_AIRLINE = 20;
  const STATUS_CODE_LATE_WEATHER = 30;
  const STATUS_CODE_LATE_TECHNICAL = 40;
  const STATUS_CODE_LATE_OTHER = 50;

  let oracleIndexes = [];
  const statusCodes = [0,10,20,30,40,50];

  before('setup contract', async () => {
    config = await Test.Config(accounts);

  });


  it('can register oracles', async () => {
    
    // ARRANGE
    let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();
    let status;

    // ACT
    for(let a=1; a<TEST_ORACLES_COUNT; a++) {   
      try{   
        status = await config.flightSuretyApp.registerOracle({ from: accounts[a], value: fee, gas: 10 ** 6})
        .on('receipt', async (receipt) => {
          let result = await config.flightSuretyApp.getMyIndexes.call({from: accounts[a], gas: 10 ** 6});
          console.log(`Oracle Registered #${a}: ${result[0]}, ${result[1]}, ${result[2]}`);  
        });
      } catch (e) {a--;}
    }
  });

  it('can request flight status and Oracles can respond with random codes', async () => {

    let statusCodeToSend = statusCodes[(Math.round(Math.random()*100)%statusCodes.length)];
    
    // ARRANGE
    let flight = 'ND1309'; // Course number
    let timestamp = Math.floor(Date.now() / 1000);

    let oracleReponsesAccepted = 0;
    let oracleReponsesRejected = 0;

    // Submit a request for oracles to get status information for a flight
    await config.flightSuretyApp.fetchFlightStatus(config.firstAirline, flight, timestamp);
    // ACT

    // Since the Index assigned to each test account is opaque by design
    // loop through all the accounts and for each account, all its Indexes (indices?)
    // and submit a response. The contract will reject a submission if it was
    // not requested so while sub-optimal, it's a good test of that feature
    for(let a=1; a<TEST_ORACLES_COUNT; a++) {
      // Get oracle information
      let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a], gas: 10 ** 6});
      for(let idx=0;idx<3;idx++) {
        try {
          // Submit a response...it will only be accepted if there is an Index match
          await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], config.firstAirline, flight, timestamp, statusCodeToSend, { from: accounts[a], gas: 10 ** 6 });
          //console.log('Accepted: ', idx, oracleIndexes[idx], flight, timestamp);
          oracleReponsesAccepted++;
        }
        catch(e) {
          // Enable this when debugging
          //console.log('\nRejected: ', idx, oracleIndexes[idx], flight, timestamp);
           //console.log(e);
           oracleReponsesRejected++;
        }

      }
    }
    assert.equal((oracleReponsesAccepted>0),true,"Somthing wrong as all Oracles responses were rejected and none accepted.");
    assert.equal(oracleReponsesAccepted+oracleReponsesRejected,3 * (TEST_ORACLES_COUNT-1), "Total of rejected and accepted repsonses do not tally.");
  });
});
