
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;
    let statusCodes = {
        0: 'STATUS_CODE_UNKNOWN',
        10: 'STATUS_CODE_ON_TIME',
        20: 'STATUS_CODE_LATE_AIRLINE',
        30: 'STATUS_CODE_LATE_WEATHER',
        40: 'STATUS_CODE_LATE_TECHNICAL',
        50: 'STATUS_CODE_LATE_OTHER'
    }

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { 
                label: 'Operational Status', 
                error: error, 
                value: result
            } ]);
        });
    
        contract.getFlightList((error, result) => {
            let mainForm = DOM.elid("main-form");

            let select = DOM.makeElement('select', 
                {name: "flightinfo", id: "flight-info"});
            result.forEach(element => {
                let option = DOM.makeElement('option',{value: element[3]+" "+element[4]},"Airline: " + element[3] + " Flight: "+ element[4]);
                select.append(option); 
            });
            mainForm.prepend(select);

            let formTitle = DOM.makeElement('label',{className: "form"}, 'Flight');
            mainForm.prepend(formTitle);
        });


        DOM.elid('purchase-insurance').addEventListener('click', () => {
            let flightInfo = DOM.elid('flight-info').value.trim().split(/\s+/);
            // Write transaction
            contract.buyFlightInsurance(flightInfo[0], flightInfo[1], (error, result) => {
                userDisplay('Insurance', 'Insurance Purchased', [ { 
                    label: 'Purchasing Insurance', 
                    error: error, 
                    value: "Insurnace for Fligh: " + result.flight + " purchased",
                    status: ''
                } ]);
            });
        })

        DOM.elid('info-refresh').addEventListener('click', () => {
            // Write transaction
            contract.getCustomerFlightList((error, result) => {
                userDisplay('Status', 'Purchased Insurance and Flight Status',
                result.map((element) => {
                        return {label: 'Flight/Status', 
                        error: error, 
                        value: element[4] + " " + statusCodes[element[1]],
                        status: ''}
                        })
                    );
    
            });
        })

        DOM.elid('check-claim').addEventListener('click', () => {
            // Write transaction
            contract.checkInsuranceClaim((error, result) => {
                let returnMessage = result.returnValues[0];
                if (result.returnValues[0]){
                    returnMessage += " ** Available amount to claim (ether): " + contract.web3.utils.fromWei(result.returnValues[1], "ether");
                    DOM.elid('withdraw-claim').classList.remove('disabled');
                }
                
                userDisplay('Check Claim', '', [ { 
                    label: 'Claimable Amount Available', 
                    error: error, 
                    value: returnMessage,
                    status: ''
                } ]);
            });
        })

        DOM.elid('withdraw-claim').addEventListener('click', () => {
            // Write transaction
            contract.claimAvaileblePayout((error, result) => {
                userDisplay('Withdraw Check Claim', 'Claim Withdrawn ', [ { 
                    label: 'Claim Withdrawn', 
                    error: error, 
                    value: result.returnValues[0],
                    status: ''
                } ]);
                DOM.elid('withdraw-claim').classList.add('disabled');
            });
        })

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flightInfo = DOM.elid('flight-info').value.trim().split(/\s+/);;
            let airline = flightInfo[0];
            let flight = flightInfo[1];
            // Write transaction
            contract.fetchFlightStatus(airline, flight, (error, result) => {
                userDisplay('Oracles', 'Trigger oracles', [ { 
                    label: 'Fetch Flight Status', 
                    error: error, 
                    value: result.flight + ' ' + result.timestamp,
                    status: ''
                } ]);
            });
        })
    });   
})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        if (result.value == null) result.value = '';
        if (result.status == null) result.status = '';
        row.appendChild(DOM.div({className: 'col-sm-4 field', id: String(result.value)}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? '' : String(result.status)));
        section.appendChild(row);
    })
    displayDiv.append(section);
}

function userDisplay(title, description, results) {
    let displayDiv = DOM.elid("user-info");
    let section = DOM.section();
    //section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        if (result.value == null) result.value = '';
        if (result.status == null) result.status = '';
        row.appendChild(DOM.div({className: 'col-sm-4 field', id: String(result.value)}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value', id: String(result.value).replace(/ /g,'')}, String(result.status).trim()));
        section.appendChild(row);
    })
    displayDiv.removeChild(displayDiv.firstChild);
    displayDiv.append(section);

}







