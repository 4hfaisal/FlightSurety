pragma solidity ^0.8.1;
//SPDX-License-Identifier: MIT

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/utils/math/SafeMath.sol";
import "./FlightSuretyData.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address private contractOwner;          // Account used to deploy contract
    address payable private dataContractAddress;          // Account used to point to data contract
    FlightSuretyData private flightSuretyData;

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
        string flightNumber;
    }

    Flight[] private flightsList;
    mapping(bytes32 => Flight) private flights;     //flight information
    mapping(address => bytes32[]) private insurance;  //customer to insurance tracking


    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
         // Modify to call data contract's status
        require(true, "Contract is currently not operational");  
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireFlightRegistered(bytes32 _flightKey){
        require(flights[_flightKey].isRegistered, "Flight not registered for insurance");
        _;
    }


    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor() 
    {
        contractOwner = msg.sender;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;  // Modify to call data contract's status
    }

    function setDataContract(address payable addr) 
                            public
                            requireContractOwner
                            returns(bool) 
    {
        dataContractAddress = addr;
        flightSuretyData = FlightSuretyData(addr);
        return true;  // Modify to call data contract's status
    }


    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

  
   /**
    * @dev Add an airline to the registration queue
    *
    */   
    function registerAirline(address _addr)
                            external
                            payable
                            returns(bool success, uint8 votes)
    {
        return (flightSuretyData.registerAirline(_addr));
    }

    function fund
                                (address _addr   
                                )
                                public
                                payable
         {
            flightSuretyData.fund{value: msg.value}(_addr);
         }

   /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight(
                                address _airline,
                                string memory _flightNumber)
                                external                  
                                returns(bytes32 flightKey)
    {
        bytes32 _flightKey = getFlightKey(_airline,_flightNumber,0);

        Flight memory flight = Flight(true , STATUS_CODE_UNKNOWN, 0, _airline, _flightNumber);

        if (flights[_flightKey].airline == address(0) && flights[_flightKey].isRegistered == false){
            flightsList.push(flight);
        }
        flights[_flightKey] = flight;
        return _flightKey;
    }

    function getFlightList()
                                external
                                view
                                returns(Flight[] memory flightsArray)
    {
        return flightsList;
    }

    function getCustomerFlightList(address _addr)
                                external
                                view
                                returns(Flight[] memory flightsArray)
    {
        Flight[] memory userFlights = new Flight[](insurance[_addr].length);

        for (uint j = 0; j < insurance[_addr].length; j++){
            userFlights[j] = flights[insurance[_addr][j]];
        }
        return userFlights;
    }

    function buyFlightInsurance(address _airline,
                                string memory _flightNumber)

                                //requireFlightRegistered(_flightKey)
                                
                                payable
                                external                    
    {
        bytes32 _flightKey = getFlightKey(_airline,_flightNumber,0);
        bool alreadyPurchased = false;
        for (uint j = 0; j < insurance[msg.sender].length; j++) { 
            if(insurance[msg.sender][j] == _flightKey) alreadyPurchased = true;
        }

        if(alreadyPurchased == false){
            flightSuretyData.buy{value: msg.value}(_flightKey, msg.sender);
            insurance[msg.sender].push(_flightKey);
        }
    }

    event claimAvailableEvent(bool claimAvaileble, uint256 availableClaim);

    function checkInsuranceClaim() external returns (bool claimAvailable, uint256 availableAmount)          
    {
        for (uint j = 0; j < insurance[msg.sender].length; j++) {
            if (flights[insurance[msg.sender][j]].statusCode == STATUS_CODE_LATE_AIRLINE){
                flightSuretyData.creditInsurees(msg.sender,insurance[msg.sender][j]);
                insurance[msg.sender][j] = insurance[msg.sender][insurance[msg.sender].length - 1];
                insurance[msg.sender].pop();
            }
        }

        (bool x, uint256 y) = flightSuretyData.checkIfClaimAvailble(msg.sender);
        emit claimAvailableEvent(x,y);

        return (x,y);
    }


    event claimAvaileblePayoutEvent(bool paidOut);
    
    function claimAvaileblePayout() external returns (bool)
    {
        bool paidOut = flightSuretyData.payOutAvailableForClaim(msg.sender);
        if (paidOut) { emit claimAvaileblePayoutEvent(true); }
        return paidOut;
    }

    
   /**
    * @dev Called after oracle has updated flight status
    *
    */  
    function processFlightStatus
                                (
                                    address _airline,
                                    string memory _flightNumber,
                                    uint8 _statusCode
                                )
                                internal
    {
        flights[getFlightKey(_airline,_flightNumber,0)].statusCode = _statusCode;
    }

    // External function restricted to contract owener to change flight status -- used for testing
    function processFlightStatusUpdateByOwner
                                (
                                    address _airline,
                                    string memory _flightNumber,
                                    uint8 _statusCode
                                )
                                requireContractOwner
                                external
    {
        processFlightStatus(_airline,_flightNumber, _statusCode);
    }



    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp                            
                        )
                        external
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));

        // ResponseInfo memory x = ResponseInfo({
        //                     requester: msg.sender,
        //                     isOpen: true
        //                 });
        ResponseInfo storage responseInfo = oracleResponses[key];
        responseInfo.requester = msg.sender;
        responseInfo.isOpen = true;

        emit OracleRequest(index, airline, flight, timestamp);
    } 


// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);

    // Register an oracle with the contract
    function registerOracle
                            (
                            )
                            external
                            payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
                                        isRegistered: true,
                                        indexes: indexes
                                    });
    }

    function getMyIndexes
                            (
                            )
                            view
                            external
                            returns(uint8[3] memory)
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }




    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
                        (
                            uint8 index,
                            address airline,
                            string memory flight,
                            uint256 timestamp,
                            uint8 statusCode
                        )
                        external
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);
            oracleResponses[key].isOpen = false;
            // Handle flight status as appropriate
            processFlightStatus(airline, flight, statusCode);
        }
    }


    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
                            (                       
                                address account         
                            )
                            internal
                            returns(uint8[3] memory)
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
                            (
                                address account
                            )
                            internal
                            returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

// endregion

}   
