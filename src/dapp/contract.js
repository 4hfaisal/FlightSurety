import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    
    constructor(network, callback) {
        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }


    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    getFlightList(callback) {
        let self = this;
        self.flightSuretyApp.methods
             .getFlightList()
             .call({ from: self.owner}, callback);
     }

     getCustomerFlightList(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .getCustomerFlightList(self.owner)
            .call({from:self.owner}, callback);
    }

    fetchFlightStatus(airline, flight, callback) {
        let self = this;
        let payload = {
            airline: airline,
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner, gas: 10**6}, (error, result) => {
                callback(error, payload);
            });
    }

    buyFlightInsurance(airline,flight , callback) {
        let self = this;
        let payload = {
            airline: airline,
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .buyFlightInsurance(payload.airline, payload.flight)
            .send({from:self.owner, value: 1e18, gas:  10 ** 6}, (error, result) => {
                callback(error, payload);
            });
    }

    checkInsuranceClaim(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .checkInsuranceClaim()
            .send({from:self.owner, gas: 10**6})
            .on('receipt', (receipt) => callback('', receipt.events.claimAvailableEvent));
    }

    claimAvaileblePayout(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .claimAvaileblePayout()
            .send({from:self.owner, gas: 10**6})
            .on('receipt', (receipt) => callback('', receipt.events.claimAvaileblePayoutEvent))
            .on('error', (error) => {throw(error)});
    }
}