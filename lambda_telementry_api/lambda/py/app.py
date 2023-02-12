import ast
import json
import logging
import os
import boto3

from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.core import patch_all

patch_all()

# import requests


def lambda_handler(event, context):
    """Sample pure Lambda function

    Parameters
    ----------
    event: dict, required
        API Gateway Lambda Proxy Input Format

        Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format

    context: object, required
        Lambda Context runtime methods and attributes

        Context doc: https://docs.aws.amazon.com/lambda/latest/dg/python-context-object.html

    Returns
    ------
    API Gateway Lambda Proxy Output Format: dict

        Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
    """

    logger = logging.getLogger(__name__)

    logger.info(f'Boto3 Version: {boto3.__version__}')

    environment = getEnvironment()

    logger.info(f'Environment: {environment}')

    message = ast.literal_eval(event['Records'][0]['Sns']['Message'])

    for record in message['Records']:
        itemKey = record['s3']['object']['key']
        response = putDynamoItem(environment['Table'], itemKey)
        print(response)

    return True


def getEnvironment():
    return {
        'Table': os.getenv('TableName', 'unknown')
    }


def putDynamoItem(tableName, itemKey):
    dynamoClient = boto3.client('dynamodb')

    response = dynamoClient.put_item(
        TableName=tableName,
        Item={
            'itemID': {
                'S': itemKey
            }
        },
        ReturnConsumedCapacity='TOTAL'
    )

    return response
