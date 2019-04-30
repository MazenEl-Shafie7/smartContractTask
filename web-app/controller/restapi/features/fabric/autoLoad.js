/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

 /**
 * This file is used to automatically populate the network with patent assets and participants
 * The opening section loads node modules required for this set of nodejs services
 * to work. This module also uses services created specifically for this tutorial, 
 * in the Z2B_Services.js.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Bring Fabric SDK network class
const { FileSystemWallet, Gateway } = require('fabric-network');

// A wallet stores a collection of identities for use
let walletDir = path.join(path.dirname(require.main.filename),'controller/restapi/features/fabric/_idwallet');
const wallet = new FileSystemWallet(walletDir);

const ccpPath = path.resolve(__dirname, 'connection.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);

//const financeCoID = 'easymoney@easymoneyinc.com';
const svc = require('./Z2B_Services');

/**
 * itemTable are used by the server to reduce load time requests
 * for participant secrets and item information
 */
let itemTable = new Array();

/**
 * autoLoad reads the participantList.json file from the Startup folder and adds participants,
 * executes the identity process, and then loads patents
 *
 * @param {express.req} req - the inbound request object from the client
 * @param {express.res} res - the outbound response object for communicating back to client
 * @param {express.next} next - an express service to enable post processing prior to responding to the client
 * saves a table of participants and a table of items
 * @function
 */
exports.autoLoad = async function autoLoad(req, res, next) {

    console.log('autoload');

    // get the autoload file
    let newFile = path.join(path.dirname(require.main.filename),'startup','memberList.json');
    let startupFile = JSON.parse(fs.readFileSync(newFile));        

    // Main try/catch block
    try {

        // A gateway defines the peers used to access Fabric networks
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'User1@org1.example.com', discovery: { enabled: false } });

        // Get addressability to network
        const network = await gateway.getNetwork('mychannel');

        // Get addressability to  contract
        const contract = await network.getContract('smartContract');

        //get list of owners, sellers, providers, shippers, financeCos
        const responseOwner = await contract.evaluateTransaction('GetState', "owners");
        let owners = JSON.parse(JSON.parse(responseOwner.toString()));
                
        const responseVerifier = await contract.evaluateTransaction('GetState', "verifiers");
        let verifiers = JSON.parse(JSON.parse(responseVerifier.toString()));
 
        const responseAuditor = await contract.evaluateTransaction('GetState', "auditors");
        let auditors = JSON.parse(JSON.parse(responseAuditor.toString()));

        const responsePublisher = await contract.evaluateTransaction('GetState', "publishers");
        let publishers = JSON.parse(JSON.parse(responsePublisher.toString()));
        
        // const responseFinanceCo = await contract.evaluateTransaction('GetState', "financeCos");
        // let financeCos = JSON.parse(JSON.parse(responseFinanceCo.toString()));

        //iterate through the list of participants in the participantList.json file        
        for (let participant of startupFile.participants) {

            console.log('\nparticipant.id: ' + participant.id);
            console.log('participant.type: ' + participant.type);
            console.log('participant.name: ' + participant.name);

            var transaction = 'Register' + participant.type;
            console.log('transaction: ' + transaction);            

            for (let owner of owners) { 
                if (owner == participant.id) {
                    res.send({'error': 'participant id already exists'});
                }
            }
            for (let verifier of verifiers) { 
                if (verifier == participant.id) {
                    res.send({'error': 'participant id already exists'});
                }
            }
            for (let auditor of auditors) { 
                if (auditor == participant.id) {
                    res.send({'error': 'participant id already exists'});
                }
            }
            for (let publisher of publishers) { 
                if (publisher == participant.id) {
                    res.send({'error': 'participant id already exists'});
                }
            }
            // for (let financeCo of financeCos) { 
            //     if (financeCo == participant.id) {
            //         res.send({'error': 'participant id already exists'});
            //     }
            // }
                        
            //register a owner, seller, provider, shipper, financeCo
            const response = await contract.submitTransaction(transaction, participant.id, participant.name);
            console.log('transaction response: ');
            console.log(JSON.parse(response.toString()));  
                                            
            console.log('Next');                

        } 
        
        // iterate through the patent objects in the memberList.json file.
        for (let each in startupFile.items){(function(_idx, _arr){itemTable.push(_arr[_idx]);})(each, startupFile.items);}
        svc.saveItemTable(itemTable);

        let allPatents = new Array();

        console.log('Get all patents'); 
        for (let owner of owners) { 
            const ownerResponse = await contract.evaluateTransaction('GetState', owner);
            var _ownerjsn = JSON.parse(JSON.parse(ownerResponse.toString()));       
            let splittedPatents = _ownerjsn.patentIDs.split(",");
            for (let patentID of splittedPatents) {                  
                allPatents.push(patentID);            
            }                           
        }

        console.log('Go through all patents'); 
        for (let patent of startupFile.assets) {

            // let _tmp = svc.addItems(patent, itemTable);
            // let items = JSON.stringify(_tmp.items);
            // let amount = _tmp.amount.toString();

            console.log('\npatent.id: ' + patent.id);
            console.log(patent.ownerIDs);
            console.log('patent.verifierID: ' + patent.verifierID);
            // console.log('items: ' + items);
            // console.log('amount: ' + amount);

            for (let patentNo of allPatents) { 
                if (patentNo == patent.id) {
                    res.send({'error': 'patent already exists'});
                }
            }           
            //async CreatePatent(ctx, ownerIDs, verifierID, patentID , patentName ,industry , art , status , details) {} 

            const createpatentResponse = await contract.submitTransaction('CreatePatent', patent.ownerIDs,patent.verifierID, patent.id, patent.name, patent.industry , patent.priorArt, patent.status , patent.details);
            console.log('createpatentResponse: ');
            console.log(JSON.parse(createpatentResponse.toString()));

            console.log('Next');
                      
        }
        
        // Disconnect from the gateway
        console.log('Disconnect from Fabric gateway.');
        console.log('AutoLoad Complete');
        await gateway.disconnect();
        res.send({'result': 'Success'});

    } catch (error) {
        console.log(`Error processing transaction. ${error}`);
        console.log(error.stack);
        res.send({'error': error.message});
    }

};
