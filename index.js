const request = require('request');
const crypto = require('crypto');
const util = require('util');
function PushToAzureLogs(content, {id, key, rfc1123date, LogType}, callback) {
//     console.log(id);
    try {
        //Checking if the data can be parsed as JSON
        if ( JSON.parse(JSON.stringify(content)) ) {
            var length = Buffer.byteLength(JSON.stringify(content),'utf8');
            var binaryKey = Buffer.from(key,'base64');
            var stringToSign = 'POST\n' + length + '\napplication/json\nx-ms-date:' + rfc1123date + '\n/api/logs';
            //console.log(stringToSign)
     
            var hash = crypto.createHmac('sha256',binaryKey)
            .update(stringToSign,'utf8')
            .digest('base64');
            var authorization = "SharedKey " + id + ":" + hash;
            var options = {
                json:true,
                headers:{
                    "content-type": "application/json", 
                    "authorization": authorization,
                    "Log-Type": LogType,
                    "x-ms-date": rfc1123date,
                    "time-generated-field": "DateValue"
                },
                body:content    
            };
            var uri = "https://"+ id + ".ods.opinsights.azure.com/api/logs?api-version=2016-04-01";
     
            request.post(uri, options, (err, Response) => {
                //return if error inside try catch block 
                if (err) {
                    return callback(("Data could NOT be sent to Azure: " + err));
                }
               return callback(("Data successfully sent to Azure " + util.inspect(content) + "with status code " + Response.statusCode));
     
            });
     
        }
    //Catch error if data cannot be parsed as JSON
    } catch (err) {
        return callback(("Error sending data to Azure: " + err));
    }
            
}

/**
 * Triggered from a message on a Cloud Pub/Sub topic.
 *
 * @param {!Object} event Event payload.
 * @param {!Object} context Metadata for the event.
 */
exports.helloPubSub = (event, context) => {
    const message = event.data
        ? Buffer.from(event.data, 'base64').toString()
        : 'Hello, World';
    console.log(message);
};

/**
 * Triggered from a message on a Cloud Pub/Sub topic.
 *
 * @param {!Object} event Event payload.
 * @param {!Object} context Metadata for the event.
 *
 * This demo uses ENV variables from process.env
 * When deployed as a Cloud Function, values must be set to match YOUR creds in Azure
 * @env string CUSTID The unique identifier for the Log Analytics workspace.
 * @env string SHAREDKEY The Primary or Secondary key for the workspace.
 * @env string LOGTYPE The predefined custom log type schema name in Azure.
 */
exports.sendMsgToAzure = (event, context) => {
    const message = event.data
        ? Buffer.from(event.data, 'base64').toString()
        : 'No Content';
    PushToAzureLogs(message, process.env.CUSTID, process.env.SHAREDKEY, event.data.date, process.env.LOGTYPE, (result) => {
    	console.log(result);
    });
};