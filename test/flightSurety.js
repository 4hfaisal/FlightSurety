
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  var contractBalance = 0;
  let flight = 'ND1300';
  let timestamp = Math.floor(Date.now() / 1000);
  const STATUS_CODE_LATE_AIRLINE = 20;
  let flightKey;

  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
    await config.flightSuretyApp.setDataContract(config.flightSuretyData.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('Owner adds the first three airlines (in addition to the existing one) to the register queue', async () => {
    let status;

    //Owner pays funds to be fully registered
    await config.flightSuretyApp.fund(accounts[0],{from: accounts[0],value: 10e18});

    status = await config.flightSuretyData.isAirlineInRegistrationQueue.call(accounts[2]);
    assert.equal(status, false, "Airline is in registeration queue while not enetered yet!")
    status = await config.flightSuretyData.isAirlineInRegistrationQueue.call(accounts[3]);
    assert.equal(status, false, "Airline is in registeration queue while not enetered yet!")

    status = await config.flightSuretyApp.registerAirline(accounts[1], {from: accounts[0]});
    status = await config.flightSuretyApp.registerAirline(accounts[2], {from: accounts[0]});
    status = await config.flightSuretyApp.registerAirline(accounts[3], {from: accounts[0]});

    status = await config.flightSuretyData.isAirlineInRegistrationQueue.call(accounts[2]);
    assert.equal(status, true, "Airline is not in the registeration queue while already registered")
    status = await config.flightSuretyData.isAirlineInRegistrationQueue.call(accounts[3]);
    assert.equal(status, true, "Airline is not in the registeration queue while already registered")
  });

  it('Verify initial airlines provided funding, switched into registered status and contract balance is correct', async () => {
    let status;
    status = await config.flightSuretyApp.fund(accounts[1],{from: accounts[1],value: 10e18});
    status = await config.flightSuretyApp.fund(accounts[2],{from: accounts[2],value: 10e18});
    status = await config.flightSuretyApp.fund(accounts[3],{from: accounts[3],value: 10e18});
    // status = await config.flightSuretyData.fund({from: accounts[2],value: 10e18});
    // status = await config.flightSuretyData.fund({from: accounts[3],value: 10e18});

    status = await config.flightSuretyData.isAirlineRegistered.call(accounts[2]);
    assert.equal(status,true, "Airline not registered while already provided fund");
    status = await config.flightSuretyData.isAirlineRegistered.call(accounts[3]);
    assert.equal(status,true, "Airline not registered while already provided fund");

    let numStr = await web3.eth.getBalance(config.flightSuretyData.address);
    contractBalance = 4*10e18;
    assert.equal(parseInt(numStr),contractBalance, "Contract balance is not correct after the first three registrants")
  });

  it('Verify one more airline can be voted in by at least 2 others and provide funding correclty', async () => {
    let status;

    status = await config.flightSuretyData.isAirlineRegistered.call(accounts[4]);
    assert.equal(status,false, "Airline showed registered while not yet!");

    status = await config.flightSuretyApp.registerAirline(accounts[4], {from: accounts[1]});
    try {
      await config.flightSuretyApp.fund(accounts[4], {from: accounts[4],value: 10e18});
    } catch (e){ }
    status = await config.flightSuretyData.isAirlineRegistered.call(accounts[4]);
    assert.equal(status,false, "Airline showed registered and paid in fund while not yet recieving two votes!");

    status = await config.flightSuretyApp.registerAirline(accounts[4], {from: accounts[3]});

    await config.flightSuretyApp.fund(accounts[4], {from: accounts[4],value: 10e18});
    status = await config.flightSuretyData.isAirlineRegistered.call(accounts[4]);
    assert.equal(status,true, "Airline showing not registered while already registered and paid into fund!");

    let numStr = await web3.eth.getBalance(config.flightSuretyData.address);
    contractBalance += 10e18;
    assert.equal(parseInt(numStr),contractBalance, "Contract balance is not correct after the first three registrants")  

});

it('Confirm an already registered airline cannot be registered again', async () => {
  let status = await config.flightSuretyData.isAirlineRegistered.call(accounts[4]);
  assert.equal(status,true, "Airline showing not registered while already registered and paid into fund!");

  await config.flightSuretyApp.registerAirline(accounts[4], {from: accounts[1]})
  .then(() => {status = true;})
  .catch(() => {status = false;});
  assert.equal(status,false, "Airline already registered but a request for registeration was allowed!");
  });
it('Register flight and buy 2 insurnace policy and verify final contract value', async () => {
    let status;
    flight = 'ND1309';

    await config.flightSuretyApp.registerFlight(accounts[3], flight, {from: accounts[3]});

    status = await config.flightSuretyApp.buyFlightInsurance(accounts[3], flight, {from: accounts[5],value: 10e17});
    status = await config.flightSuretyApp.buyFlightInsurance(accounts[3], flight, {from: accounts[6],value: 10e17});

    let numStr = await web3.eth.getBalance(config.flightSuretyData.address);
    contractBalance = contractBalance + (2*10e17);
    assert.equal(parseInt(numStr),contractBalance, "Contract balance is not correct after a user paid for a policy")
    });
it('Register (Another) flight and buy 2 insurnace policy and verify final contract value', async () => {
  let status;
  flight = "ND1300"
  
  await config.flightSuretyApp.registerFlight(accounts[3], flight, {from: accounts[3]});

  status = await config.flightSuretyApp.buyFlightInsurance(accounts[3], flight, {from: accounts[6],value: 10e17});
  status = await config.flightSuretyApp.buyFlightInsurance(accounts[3], flight, {from: accounts[5],value: 10e17});

  let numStr = await web3.eth.getBalance(config.flightSuretyData.address);
  contractBalance = contractBalance + (2*10e17);
  assert.equal(parseInt(numStr),contractBalance, "Contract balance is not correct after a user paid for a policy")
  }); 
  
  it('Confirm customers have zero claim since flight status is still OK', async () => {
    let status = false;
    let tx;

    tx = await config.flightSuretyApp.checkInsuranceClaim({from: accounts[5]});
    if (tx.logs[0].event == "claimAvailableEvent") {status = tx.logs[0].args.claimAvaileble}
    tx = await config.flightSuretyApp.checkInsuranceClaim({from: accounts[6]});
    if (tx.logs[0].event == "claimAvailableEvent") {status = tx.logs[0].args.claimAvaileble}  

    assert.equal(status,false, "Available claims is > 0 while it should not");
    });
    it('Verify we can get all flights insurance for one customer', async () => {
      let status = false;
      let tx;
      flight = "ND1300";

       tx = await config.flightSuretyApp.getCustomerFlightList.call(accounts[5], {from: accounts[5]});
       assert.equal(tx.length, 2, "Did not get back 2 flights as expected")
      });
    it('Confirm customers have non-zero claim since after changing flight to delayed_airline', async () => {
      let status = false;
      let tx;
      flight = "ND1300";
  
      await config.flightSuretyApp.processFlightStatusUpdateByOwner(accounts[3], flight, STATUS_CODE_LATE_AIRLINE,{from: accounts[0]});
      tx = await config.flightSuretyApp.checkInsuranceClaim({from: accounts[5]});
      if (tx.logs[0].event == "claimAvailableEvent") {status = tx.logs[0].args.claimAvaileble}
      assert.equal(status,true, "Available claims is zero 0 while expected non-zero");

      let balanceBefore = await web3.eth.getBalance(accounts[5]);
      tx = await config.flightSuretyApp.claimAvaileblePayout({from: accounts[5]});
      let balanceAfter = await web3.eth.getBalance(accounts[5]);;
      
      finalBalance = Number(balanceAfter) - Number(balanceBefore);
      finalBalance = web3.utils.fromWei(finalBalance.toString(), "ether");
      assert.equal((Math.round(finalBalance * 10)/10), 1.5 , "Customer did not recieve 1.5 ether back");
      });
      it('Confirm customers cannot claim more payout after getting paid', async () => {
        let status = false;
        let tx;
        flight = "ND1300";
    
        await config.flightSuretyApp.processFlightStatusUpdateByOwner(accounts[3], flight, STATUS_CODE_LATE_AIRLINE,{from: accounts[0]});
        tx = await config.flightSuretyApp.checkInsuranceClaim({from: accounts[5]});  
        let balanceBefore = await web3.eth.getBalance(accounts[5]);
        tx = await config.flightSuretyApp.claimAvaileblePayout({from: accounts[5]});
        let balanceAfter = await web3.eth.getBalance(accounts[5]);;
        
        finalBalance = Number(balanceAfter) - Number(balanceBefore);
        finalBalance = web3.utils.fromWei(finalBalance.toString(), "ether");
        assert.equal((Math.round(finalBalance * 10)/10), 0 , "Customer did not recieve 1.5 ether back");
        let numStr = await web3.eth.getBalance(config.flightSuretyData.address);
        contractBalance = contractBalance - (1.5*1e18);
        assert.equal(parseInt(numStr),contractBalance, "Contract balance is not correct after a user paid for a policy")
        });
});
