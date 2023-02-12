import {inspect} from 'util';

import * as AWS from 'aws-sdk';
AWS.config.update({
  region: "eu-central-1", 
  apiVersions: {
    dynamodb: '2012-08-10',
  }
});

const table = process.env['TableName'] || 'undefined';
const bucket = process.env['BucketName'] || 'undefined';

const dynamodb = new AWS.DynamoDB();

const lambdaHandler = async (event: any, context: any) =>
{
  console.log("Reading options from event:\n", inspect(event, {depth: 5}));
  var message = event['Records'][0]['Sns']['Message']
  message.replace(/\"/g, '"')
  
  const s3Record = JSON.parse(message)
  
  // Object key may have spaces or unicode non-ASCII characters.
  const srcKey    = decodeURIComponent(s3Record.Records[0].s3.object.key.replace(/\+/g, " "));
  
  let msg= "Key:"+srcKey;
  console.log(msg)
  
  let now = new Date().getTime();
  let params: AWS.DynamoDB.PutItemInput = {
    Item:
    {
      "itemID": {"S": srcKey},
      "time" : {"N": now.toString()}
    }, 
    TableName: table,
  }
  
  await dynamodb.putItem(params).promise();
  
  
  return msg;
}
module.exports = { lambdaHandler }
