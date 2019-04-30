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


/**
 * retrieve array of member registries
 * @param {express.req} req - the inbound request object from the client
 * @param {express.res} res - the outbound response object for communicating back to client
 * @param {express.next} next - an express service to enable post processing prior to responding to the client
 * @returns {Object} array of registries
 * @function
 */
// exports.getRegistries = function(req, res, next)
// {
//     var allRegistries = [ 
//         [ 'Buyer' ],
//         [ 'FinanceCo' ],
//         [ 'Provider' ],
//         [ 'Seller' ],
//         [ 'Shipper' ] 
//     ];
//     res.send({'result': 'success', 'registries': allRegistries});
   
// };


/**
 * retrieve array of participants from specified registry type
 * @param {express.req} req - the inbound request object from the client
 *  req.body.registry: _string - type of registry to search; e.g. 'Buyer', 'Seller', etc.
 * @param {express.res} res - the outbound response object for communicating back to client
 * @param {express.next} next - an express service to enable post processing prior to responding to the client
 * @returns {Object} an array of participants
 * @function
 */
exports.getMembers = async function(req, res, next) {

    console.log('getMembers');
    let allParticipants = new Array();
    let participants;

    // Main try/catch block
    try {

        // A gateway defines the peers used to access Fabric networks
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'User1@org1.example.com', discovery: { enabled: false } });

        // Get addressability to network
        const network = await gateway.getNetwork('mychannel');

        // Get addressability to  contract
        const contract = await network.getContract('smartContract');
                
        switch (req.body.registry)
        {
            case 'Owner':
                const responseOwner = await contract.evaluateTransaction('GetState', "owners");
                console.log('responseOwner: ');
                console.log(JSON.parse(responseOwner.toString()));
                participants = JSON.parse(JSON.parse(responseOwner.toString()));
                break;            
            case 'Verifier':
                const responseVerifier = await contract.evaluateTransaction('GetState', "verifiers");
                console.log('responseVerifier: ');
                console.log(JSON.parse(responseVerifier.toString()));
                participants = JSON.parse(JSON.parse(responseVerifier.toString()));
                break;
            case 'Publisher':
                const responsePublisher = await contract.evaluateTransaction('GetState', "publishers");
                console.log('responsePublisher: ');
                console.log(JSON.parse(responsePublisher.toString()));
                participants = JSON.parse(JSON.parse(responsePublisher.toString()));
                break; 
            case 'Auditor':
                const responseAuditor = await contract.evaluateTransaction('GetState', "auditors");
                console.log('responseAuditor: ');
                console.log(JSON.parse(responseAuditor.toString()));
                participants = JSON.parse(JSON.parse(responseAuditor.toString()));                
                break; 
            default:
                res.send({'error': 'body registry not found'});
        }
        
        // Get state of the participants
        for (const member of participants) { 
            const response = await contract.evaluateTransaction('GetState', member);
            console.log('response: ');
            console.log(JSON.parse(response.toString()));
            var _jsn = JSON.parse(JSON.parse(response.toString()));                       
            allParticipants.push(_jsn); 
        }

        // Disconnect from the gateway
        console.log('Disconnect from Fabric gateway.');
        console.log('getParticipants Complete');
        await gateway.disconnect();
        res.send({'result': 'success', 'participants': allParticipants});
                
    } catch (error) {
        console.log(`Error processing transaction. ${error}`);
        console.log(error.stack);
        res.send({'error': error.stack});
    } 
         
};



/**
 * gets the assets from the order registry
 * @param {express.req} req - the inbound request object from the client
 *  req.body.type - the type of individual making the request (admin, buyer, seller, etc)
 *  req.body.id - the id of the individual making the request
 * @param {express.res} res - the outbound response object for communicating back to client
 * @param {express.next} next - an express service to enable post processing prior to responding to the client
 * @returns {Array} - an array of assets
 * @function
 */
exports.getAssets = async function(req, res, next) {

    console.log('getAssets');
    let allPatents = new Array();

    // Main try/catch block
    try {

        // A gateway defines the peers used to access Fabric networks
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'User1@org1.example.com', discovery: { enabled: false } });

        // Get addressability to network
        const network = await gateway.getNetwork('mychannel');

        // Get addressability to  contract
        const contract = await network.getContract('smartContract');
        
        const responseOwner = await contract.evaluateTransaction('GetState', "owners");
        console.log('responseOwner: ');
        console.log(JSON.parse(responseOwner.toString()));
        var owners = JSON.parse(JSON.parse(responseOwner.toString()));

        for (let owner of owners) { 
            const ownerResponse = await contract.evaluateTransaction('GetState', owner);
            console.log('response: ');
            console.log(JSON.parse(ownerResponse.toString()));
            var _ownerjsn = JSON.parse(JSON.parse(ownerResponse.toString()));       
            var splitted = _ownerjsn.patentIDs.split(",");
            for (let patentID of splitted) { 
                const response = await contract.evaluateTransaction('GetState', patentID);
                console.log('response: ');
                console.log(JSON.parse(response.toString()));
                var _jsn = JSON.parse(JSON.parse(response.toString()));
                //var _jsnItems = JSON.parse(_jsn.items);
                //_jsn.items = _jsnItems;
                allPatents.push(_jsn);            
            }                           
        }
        
        // Disconnect from the gateway
        console.log('Disconnect from Fabric gateway.');
        console.log('getAssets Complete');
        await gateway.disconnect();
        res.send({'result': 'success', 'patentIDs': allPatents});
        
    } catch (error) {
        console.log(`Error processing transaction. ${error}`);
        console.log(error.stack);
        res.send({'error': error.stack});
    } 
};


/**
 * Adds a new member to the specified registry
 * @param {express.req} req - the inbound request object from the client
 *  req.body.companyName: _string - member company name
 *  req.body.type: _string - member type (registry type); e.g. 'Buyer', 'Seller', etc.
 *  req.body.id: _string - id of member to add (email address)
 * @param {express.res} res - the outbound response object for communicating back to client
 * @param {express.next} next - an express service to enable post processing prior to responding to the client
 * @returns {JSON} object with success or error results
 * @function
 */
exports.addMember = async function(req, res, next) {

    console.log('addMember');
    let participants;

    // Main try/catch block
    try {

        // A gateway defines the peers used to access Fabric networks
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'User1@org1.example.com', discovery: { enabled: false } });

        // Get addressability to network
        const network = await gateway.getNetwork('mychannel');

        // Get addressability to  contract
        const contract = await network.getContract('smartContract');        

        switch (req.body.type)
        {
            case 'Owner':
                const responseBuyer = await contract.evaluateTransaction('GetState', "owners");
                participants = JSON.parse(JSON.parse(responseBuyer.toString()));
                break;            
            case 'Verifier':
                const responseSeller = await contract.evaluateTransaction('GetState', "verifiers");
                participants = JSON.parse(JSON.parse(responseSeller.toString()));
                break;
            case 'Publisher':
                const responseProvider = await contract.evaluateTransaction('GetState', "publishers");
                participants = JSON.parse(JSON.parse(responseProvider.toString()));
                break; 
            case 'Auditor':
                const responseShipper = await contract.evaluateTransaction('GetState', "auditors");
                participants = JSON.parse(JSON.parse(responseShipper.toString()));
                break;  
            default:
                res.send({'error': 'body type not found'});
        }

        for (let member of participants) { 
            if (member == req.body.id) {
                res.send({'error': 'member id already exists'});
            }
        }
        
        console.log('\nreq.body.id: ' + req.body.id);
        console.log('member.type: ' + req.body.type);
        console.log('member.name: ' + req.body.name);

        var transaction = 'Register' + req.body.type;
        console.log('transaction: ' + transaction);
                    
        //register
        const response = await contract.submitTransaction(transaction, req.body.id, req.body.name);
        console.log('transaction response: ')
        console.log(JSON.parse(response.toString()));  

        // Disconnect from the gateway
        console.log('Disconnect from Fabric gateway.');
        console.log('AutoLoad Complete');
        await gateway.disconnect();
        res.send(req.body.companyName+' successfully added');
   
    } catch (error) {
        console.log(`Error processing transaction. ${error}`);
        console.log(error.stack);
        res.send({'error': error.stack});
    } 
    
};

