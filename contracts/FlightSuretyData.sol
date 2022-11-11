pragma solidity ^0.8.1;
//SPDX-License-Identifier: MIT

import "../node_modules/openzeppelin-solidity/contracts/utils/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => bool) private authorizedCallers;
    mapping(address => InsurancePolicy) private insurancePolicies;



    uint256 private constant MINIMUM_FUND_FOR_REGISTRATION = 10 ether;
    uint256 private constant POLICY_INSURANCE_PRICE = 1 ether;

    struct InsurancePolicy{
        uint256 availableToClaim;
        mapping (bytes32 => bool) flights;
    }

    struct Airline {
        bool isRegistered;
        uint8 votes;
        mapping(address => bool) voters;
    }

    mapping(address => Airline) private airlines;
    uint private airlinesCount;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                ) 
    {
        contractOwner = msg.sender;
        registerStartingAirlines(msg.sender);
    }

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
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    modifier isAuthorizedCaller(address addr) 
    {
        require(authorizedCallers[addr], "Caller is not authorized");
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

    modifier requireRegisteredAirline(address addr)
    {
        require(airlines[addr].isRegistered, "Requesting airline is not registered");
        _;
    }
    modifier requireAirlineInRegistrationQueue(address _addr){
        require(airlines[_addr].votes > 0, "Airline is not in registration queue");
        _;
    }

    
    modifier requireAirlineHasRequriedVotes(address _addr){
        uint requiredVotes = 1;
        if ( airlinesCount >= 4 ) requiredVotes = (airlinesCount / 2); 
        require(airlines[_addr].votes >= requiredVotes, "Airline does not have the minimum number of votes");
        _;
    }

    modifier requireSufficientFunding()
    {
        require(msg.value >= MINIMUM_FUND_FOR_REGISTRATION, "Not sufficient funding provided for registeration.");
        _;
    }

    modifier requireSufficientPayment()
    {
        require(msg.value >= POLICY_INSURANCE_PRICE, "Payment not sufficient to buy policy.");
        _;
    }

    modifier requireAirlineNotRegistered(address _addr){
        require(!airlines[_addr].isRegistered, "Airline already registered and paid in fund");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }

    function authorizeCaller(address addr) 
                            public
                            requireContractOwner
    {
        authorizedCallers[addr] = true;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    function isAirlineInRegistrationQueue
                            (
                                address addr
                            ) 
                            view
                            public
                            returns (bool)
    {
        return (airlines[addr].votes > 0);
    }

    function isAirlineRegistered
                            (
                                address addr
                            ) 
                            view
                            public
                            returns (bool)
    {
        return (airlines[addr].isRegistered);
    }

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */    
    function registerAirline(address _addr)
                            external
                            isAuthorizedCaller(msg.sender)
                            requireRegisteredAirline(tx.origin)
                            requireAirlineNotRegistered(_addr)
                            returns (bool success,uint8 votes)
    {
        if (!airlines[_addr].voters[tx.origin]){
            airlines[_addr].votes = airlines[_addr].votes + 1;
            airlines[_addr].voters[tx.origin] = true;
        }
        
        return (airlines[_addr].isRegistered, airlines[_addr].votes);
    }

    function registerStartingAirlines
                            (address addr
                            )
                            internal
                            requireContractOwner
                            returns (bool success)
    {
        airlines[addr].votes = 1;
        return true;
    }



   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy(bytes32 _flightKey, address _addr)
                            isAuthorizedCaller(msg.sender)
                            requireSufficientPayment
                            external
                            payable
    {
        insurancePolicies[_addr].flights[_flightKey] = true;
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (address _addr,
                                bytes32 _flightKey
                                )
                                external
                                returns (bool)
    {
        uint256 _numerator = 3;
        uint256 _denominator = 2;
        uint256 currBalance = insurancePolicies[_addr].availableToClaim;

        if(insurancePolicies[_addr].flights[_flightKey] == true){
            insurancePolicies[_addr].flights[_flightKey] = false;
            insurancePolicies[_addr].availableToClaim = currBalance.add(POLICY_INSURANCE_PRICE.mul(_numerator).div(_denominator));
            return true;
        }
        return false;
    }

    function checkIfClaimAvailble
                                (address _addr
                                )
                                view
                                external
                                returns (bool calimAvailable, uint256 availableAmount)
    {
        return (insurancePolicies[_addr].availableToClaim > 0, insurancePolicies[_addr].availableToClaim);
    }

    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function payOutAvailableForClaim (address _addr) 
                            external
                            returns (bool paidOut)
    {
        uint256 currBalance = insurancePolicies[_addr].availableToClaim;

        if(currBalance > 0){
            insurancePolicies[_addr].availableToClaim = 0;
            payable(_addr).transfer(currBalance);
            return true;
        }
        return false;
    }

    //    /**
    //     * @dev Initial funding for the insurance. Unless there are too many delayed flights
    //     *      resulting in insurance payouts, the contract should be self-sustaining
    //     *
    //     */   
    function fund
                                (address _addr   
                                )
                                public
                                payable
                                isAuthorizedCaller(msg.sender)
                                requireSufficientFunding
                                requireAirlineHasRequriedVotes(_addr)
         {
            airlines[_addr].isRegistered = true;
            airlinesCount += 1;
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


    receive() external payable {}

    fallback() external payable {}

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    // function() 
    //                         external 
    //                         payable 
    // {
    //     fund();
    // }


}

