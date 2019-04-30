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
let fs = require('fs');
let path = require('path');

let itemTable = null;
const svc = require('./Z2B_Services');
const financeCoID = 'easymoney@easymoneyinc.com';

// Bring Fabric SDK network class
const { FileSystemWallet, Gateway } = require('fabric-network');

// A wallet stores a collection of identities for use
let walletDir = path.join(path.dirname(require.main.filename),'controller/restapi/features/fabric/_idwallet');
const wallet = new FileSystemWallet(walletDir);

const ccpPath = path.resolve(__dirname, 'connection.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);


/**
 * get patentIDs for buyer with ID =  _id
 * @param {express.req} req - the inbound request object from the client
 *  req.body.id - the id of the buyer making the request
 *  req.body.userID - the user id of the buyer in the identity table making this request
 *  req.body.secret - the pw of this user.
 * @param {express.res} res - the outbound response object for communicating back to client
 * @param {express.next} next - an express service to enable post processing prior to responding to the client
 * @returns {Array} an array of assets
 * @function
 */
exports.getMyPatents = async function (req, res, next) {
    // connect to the network
    let method = 'getMyPatents';
    console.log(method+' req.body.userID is: '+req.body.id );
    let allPatents = new Array();

    // Main try/catch block
    try {

        // A gateway defines the peers used to access Fabric networks
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'User1@org1.example.com', discovery: { enabled: false } });

        // Get addressability to network
        const network = await gateway.getNetwork('mychannel');

        // Get addressability to contract
        const contract = await network.getContract('smartContract');

        // Get member state
        const responseMember = await contract.evaluateTransaction('GetState', req.body.id);
        console.log('responseMember: ');
        console.log(JSON.parse(responseMember.toString()));
        let member = JSON.parse(JSON.parse(responseMember.toString()))

        // Get the patentIDs for the member including their state
        var splitted = member.patentIDs.split(",");
        for (let patentID of splitted) { 
            const response = await contract.evaluateTransaction('GetState', patentID);
            console.log('response: ');
            console.log(JSON.parse(response.toString()));
            var _jsn = JSON.parse(JSON.parse(response.toString()));
            //var _jsnItems = JSON.parse(_jsn.items);
            //_jsn.items = _jsnItems;
            allPatents.push(_jsn);            
        }

        // Disconnect from the gateway
        console.log('Disconnect from Fabric gateway.');
        console.log('getMyPatents Complete');
        await gateway.disconnect();
        res.send({'result': 'success', 'patentIDs': allPatents});
        
    } catch (error) {
        console.log(`Error processing transaction. ${error}`);
        console.log(error.stack);
        res.send({'error': error.stack});
    } 
};


/**
 * return a json object built from the item table created by the autoload function
 * @param {express.req} req - the inbound request object from the client
 * @param {express.res} res - the outbound response object for communicating back to client
 * @param {express.next} next - an express service to enable post processing prior to responding to the client
 * return {Array} an array of assets
 * @function
 */
// exports.getItemTable = function (req, res, next)
// {
    
//     if (itemTable === null)
//     {
//         let newFile = path.join(path.dirname(require.main.filename),'startup','itemList.txt');
//         itemTable = JSON.parse(fs.readFileSync(newFile));
//     }
//     res.send(itemTable);
// };

/**
 * patentAction - act on an patent for a buyer
 * @param {express.req} req - the inbound request object from the client
 * req.body.action - string with buyer requested action
 * buyer available actions are:
 * Pay  - approve payment for an patent
 * Dispute - dispute an existing patent. requires a reason
 * Purchase - submit created patent to seller for execution
 * Cancel - cancel an existing patent
 * req.body.participant - string with buyer id
 * req.body.patentID - string with patentID to be acted upon
 * req.body.reason - reason for dispute, required for dispute processing to proceed
 * @param {express.res} res - the outbound response object for communicating back to client
 * @param {express.next} next - an express service to enable post processing prior to responding to the client
 * @returns {Array} an array of assets
 * @function
 */
exports.patentAction = async function (req, res, next) {
    let method = 'patentAction';
    // console.log(method+' req.body.participant is: '+req.body.participant );
    
    // if ((req.body.action === 'Dispute') && (typeof(req.body.reason) !== 'undefined') && (req.body.reason.length > 0) )
    // {/*let reason = req.body.reason;*/}
    // else {
    //     if ((req.body.action === 'Dispute') && ((typeof(req.body.reason) === 'undefined') || (req.body.reason.length <1) ))
    //         {res.send({'result': 'failed', 'error': 'no reason provided for dispute'});}
    // }
    // if (svc.m_connection === null) {svc.createMessageSocket();}

    // Main try/catch block
    try {

        // A gateway defines the peers used to access Fabric networks
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'User1@org1.example.com', discovery: { enabled: false } });

        // Get addressability to network
        const network = await gateway.getNetwork('mychannel');

        // Get addressability to  contract
        const contract = await network.getContract('smartContract');


        // Get state of patent
        const responsePatent = await contract.evaluateTransaction('GetState', req.body.id);
        console.log('responsePatent: ');
        console.log(JSON.parse(responsePatent.toString()));
        let patent = JSON.parse(JSON.parse(responsePatent.toString()));
        
        // Perform action on the patent
    switch (req.body.action)
        {
        case 'verifyPatent':
            const verifyResponse = await contract.submitTransaction('verifyPatent', patent.id, patent.ownerIDs, patent.verifierID);
            console.log('verifyResponse: ');
            console.log(JSON.parse(verifyResponse.toString()));
            break;
        case 'rejectPatent':
            const rejectResponse = await contract.submitTransaction('rejectPatent', patent.id, patent.ownerIDs, patent.verifierID);
            console.log('rejectResponse: ');
            console.log(JSON.parse(rejectResponse.toString()));            
            break;
        case 'publishPatent':
            const publishResponse = await contract.submitTransaction('publishPatent', patent.id, patent.ownerIDs, patent.publisherID);
            console.log('publishResponse: ');
            console.log(JSON.parse(publishResponse.toString()));             
            break;
        // case 'returnPatent':
        //     const returnResponse = await contract.submitTransaction('returnPatent', patent.patentNumber, patent.ownerId, patent.publisherId, req.body.returnMessage);
        //     console.log('returnResponse: ');
        //     console.log(JSON.parse(returnResponse.toString()));             
        //    break;
        default :
            console.log('default entered for action: '+req.body.action);
            res.send({'result': 'failed', 'error':' patent '+req.body.id+' unrecognized request: '+req.body.action});
        }
        
        // Disconnect from the gateway
        console.log('Disconnect from Fabric gateway.');
        console.log('patentAction Complete');
        await gateway.disconnect();
        res.send({'result': ' patent '+req.body.id+' successfully updated to '+req.body.action});
            
    } catch (error) {
        console.log(`Error processing transaction. ${error}`);
        console.log(error.stack);
        res.send({'error': error.stack});
    } 

};

/**
 * adds an patent to the blockchain
 * @param {express.req} req - the inbound request object from the client
 * req.body.seller - string with seller id
 * req.body.buyer - string with buyer id
 * req.body.items - array with items for patent
 * @param {express.res} res - the outbound response object for communicating back to client
 * @param {express.next} next - an express service to enable post processing prior to responding to the client
 * @returns {Array} an array of assets
 * @function
 */
exports.addPatent = async function (req, res, next) {
    let method = 'addPatent';
    // console.log(method+' req.body.owner is: '+req.body.ownerIDs );    
    // let patentID = '00' + Math.floor(Math.random() * 10000);
    // let patent = {};
    // patent = svc.createOrderTemplate(patent);
    // if (svc.m_connection === null) {svc.createMessageSocket();}

    // Main try/catch block
    try {
        // A gateway defines the peers used to access Fabric networks
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'User1@org1.example.com', discovery: { enabled: false } });
        // Get addressability to network
        const network = await gateway.getNetwork('mychannel');
        // Get addressability to  contract
        const contract = await network.getContract('smartContract');
        //sync CreatePatent(ctx, ownerIDs, verifierID, patentID , name ,industry , art , status , details)
        const createPatentResponse = await contract.submitTransaction('CreatePatent', req.body.ownerIDs, req.body.verifierID, req.body.patentID, req.body.name , req.body.industry, req.body.priorArt,req.body.status,req.body.details);
        console.log('createPatentResponse: ');
        console.log(JSON.parse(createPatentResponse.toString()));

        // Disconnect from the gateway
        console.log('Disconnect from Fabric gateway.');
        console.log('add Patent Complete');
        await gateway.disconnect();
        res.send({'result': ' patent '+req.body.patentID+' successfully added'});

    }    catch (error) {
        console.log(`Error processing transaction. ${error}`);
        console.log(error.stack);
        res.send({'error': error.stack});
    } 
    
};



