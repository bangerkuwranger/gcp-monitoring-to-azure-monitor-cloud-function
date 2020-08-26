/**
 * Cloud Function Globals
 * Executed ONCE upon deployment
 */

const request = require('request');
const crypto = require('crypto');
const util = require('util');
const PROC_NAME = 'Cloud Function Monitoring to Azure';

/**
 * The environment variable ISDEBUG will turn on debugging behavior if defined
 * @env * ISDEBUG enables debug logging if defined (true is the most declarative value)
 */
var isDebug = false;
if ('undefined' !== typeof process.env.ISDEBUG) {
	isDebug = true;
}

/* END Cloud Function Globals
 **/

/**
 * Local Functions
 * Callable ONLY within this module
 */

function PushToAzureLogs(content, {id, key, rfc1123date, LogType}, callback) {
	
	if (isDebug) {
		console.log(PROC_NAME + ' - Azure Workspace ID: ' + id);
	}
    try {
        //Checking if the data can be parsed as JSON
        if ( JSON.parse(JSON.stringify(content)) ) {
            var length = Buffer.byteLength(JSON.stringify(content),'utf8');
            var binaryKey = Buffer.from(key,'base64');
            var stringToSign = 'POST\n' + length + '\napplication/json\nx-ms-date:' + rfc1123date + '\n/api/logs';
            
            if (isDebug) {
				console.log(PROC_NAME + ' - Azure Unhashed Auth: ' + stringToSign);
			}
     
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
                    return callback({
						msg: "Error sending data to Azure",
						res: Response,
						err
					});
                }
                else if (Response && Response.statusCode === 200) {
               		return callback({
               			msg: "Data successfully sent to Azure " + util.inspect(content) + "with status code " + Response.statusCode,
               			res: Response,
               			err: null
               		});
     			}
     			else {
     			
     			}
            });
     
        }
    //Catch error if data cannot be parsed as JSON
    } catch (err) {
        return callback({
        	msg: "Error parsing JSON data",
        	res: null,
        	err
        });
    }
            
}

/* END Local Functions
 **/

/**
 * Exported Functions
 * Callable as entry point for Cloud Function
 * Executed on EACH invocation, not on deployment
 */

/**
 * Testing function, logs the message data to console @ debug level.
 * Triggered by a message on a Cloud Pub/Sub topic.
 * Defaults to Hello World string if no parsable data in message.
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
 * Sends message data to an Azure Log Analytics Workspace
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
    PushToAzureLogs(message, {'id': process.env.CUSTID, 'key': process.env.SHAREDKEY, 'rfc1123date': event.data.date, 'LogType': process.env.LOGTYPE}, (result) => {
    	console.log(PROC_NAME + ' - ' + result.msg);
    	if (isDebug && 'undefined' !== typeof result.err && null !== result.err) {
    		if ('object' === typeof result.res && null !== result.res) {
    			result.err.response = result.res;
    		}
    		console.error(util.inspect(result.err, {showHidden: false, depth: null}));
    	}
    });
};

/* END Exported Functions
 **/