import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3_notifications from 'aws-cdk-lib/aws-s3-notifications';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sns from 'aws-cdk-lib/aws-sns';
import { join } from 'path';

export class LambdaTelementryApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const account=this.account    
    const region=this.region    
    
    const extensionName = "grafana-loki-extension"
    const layerVersion="1"
    const loki_ip="3.67.195.192"
    const distpatch_min_batch_size = "10"
    
    const lambdatelematryApiLayerArn = "arn:aws:lambda:"+region+":"+account+":layer:"+extensionName+":"+layerVersion
    const ltaLayer = lambda.LayerVersion.fromLayerVersionArn(this, "ltalayer", lambdatelematryApiLayerArn)

    let functions= [];

    // GO **********
    const fnGO = new lambda.Function(this, 'telemetry-api-starter-go', {
      runtime: lambda.Runtime.GO_1_X,
      code: lambda.Code.fromAsset(join(__dirname, '../lambda/go/dist/main.zip')),
      handler: 'main',
      functionName: "telemetry-api-starter-go",
      description: 'telemetry-api-starter-go',
      memorySize: 1024,
      timeout: Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_MONTH,
      layers: [
        ltaLayer
      ]
    });
    new CfnOutput(this, 'LambdaNameGo', {
      value: fnGO.functionName,
      exportName: 'telemetry-api-starter-GO-name',
    });
    functions.push(fnGO)
    // TS **********
    const fnTS = new lambda.Function(this, "telemetry-api-starter-ts", {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset(join(__dirname, '../lambda/ts/dist/index.zip')),
      handler: 'index.lambdaHandler',
      functionName: "telemetry-api-starter-ts",
      memorySize: 1024,
      timeout: Duration.seconds(3),
      description: "telemetry-api-starter-ts",
      logRetention: logs.RetentionDays.ONE_MONTH,
      layers: [
        ltaLayer
      ],
      architecture: lambda.Architecture.X86_64,
    })
    functions.push(fnTS)
    new CfnOutput(this, 'LambdaNameTS', {
      value: fnTS.functionName,
      exportName: 'telemetry-api-starter-TS-name',
    });
    // Py **********
    const fnPy = new lambda.Function(this, "telemetry-api-starter-py", {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset(join(__dirname, '../lambda/py/dist/app.zip')),
      handler: 'app.lambda_handler',
      functionName: "telemetry-api-starter-py",
      memorySize: 1024,
      timeout: Duration.seconds(3),
      description: "telemetry-api-starter-py",
      logRetention: logs.RetentionDays.ONE_MONTH,
      layers: [
        ltaLayer
      ],
      architecture: lambda.Architecture.X86_64,
    })
    functions.push(fnPy)



    // Bucket start ****************
    // *
    const bucky = new s3.Bucket(this, 'incoming', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });
    new CfnOutput(this, 'Bucket', {
      value: bucky.bucketName,
    });
    // Event start *******************
    const topic = new sns.Topic(this, 's3eventTopic');
    bucky.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3_notifications.SnsDestination(topic)
    )

    //** Dynamodb start */
    const table = new dynamodb.Table(this, 'items', {
      partitionKey: {
        name: 'itemID',
        type: dynamodb.AttributeType.STRING,
      },
      tableName: 'items',
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });
    new CfnOutput(this, 'TableName', {
      value: table.tableName,
    });

    for (var i in functions) {
      functions[i].addEnvironment("Bucket", bucky.bucketName)
      functions[i].addEnvironment("TableName", table.tableName)
      functions[i].addEnvironment("DISPATCH_MIN_BATCH_SIZE", distpatch_min_batch_size)
      functions[i].addEnvironment("LOKI_IP", loki_ip)
      bucky.grantRead(functions[i])
      table.grantReadWriteData(functions[i]);
      topic.addSubscription(new subscriptions.LambdaSubscription(functions[i]));

    }

  }
}
