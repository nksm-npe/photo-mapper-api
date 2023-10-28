import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import { RemovalPolicy } from "aws-cdk-lib";

export class MapAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDBテーブルの作成
    const table = new dynamodb.Table(this, "MapAppTable", {
      tableName: "map_app_table",
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
    });

    // Lambda関数の作成
    const lambdaFunction = new lambda.Function(this, "MapAppFunction", {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: "app.handler",
      code: lambda.Code.fromAsset("lambda"),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    // DynamoDBテーブルへのアクセスポリシーをLambda関数に追加
    table.grantReadData(lambdaFunction);

    // API Gatewayの作成
    const api = new apigateway.RestApi(this, "MapAppApi", {
      restApiName: "Map AppAPI",
    });

    // API Gatewayのリソースと統合を作成
    const integration = new apigateway.LambdaIntegration(lambdaFunction);
    api.root.addMethod("GET", integration);

    new s3.Bucket(this, `MapAppBucket`, {
      bucketName: `map-app-bucket-${cdk.Stack.of(this).account}-${
        cdk.Stack.of(this).region
      }`,
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }
}
