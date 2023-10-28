import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import { RemovalPolicy } from "aws-cdk-lib";
import { HttpMethods } from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";

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

    const s3bucket = new s3.Bucket(this, `MapAppBucket`, {
      bucketName: `map-app-bucket-${cdk.Stack.of(this).account}-${
        cdk.Stack.of(this).region
      }`,
      removalPolicy: RemovalPolicy.DESTROY,
      cors: [
        {
          allowedHeaders: ["*"],
          allowedMethods: [HttpMethods.HEAD, HttpMethods.PUT, HttpMethods.GET],
          allowedOrigins: ["*"],
          exposedHeaders: ["ETag", "x-amz-meta-custom-header"],
        },
      ],
    });

    // Lambda関数の作成
    const lambdaFunction = new lambda.Function(this, "MapAppFunction", {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: "app.handler",
      code: lambda.Code.fromAsset("lambda"),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    // DynamoDBテーブルへのアクセスポリシーをLambda関数に追加
    table.grantReadData(lambdaFunction);

    const policy = new iam.Policy(this, "lambda-s3-multiupload", {
      policyName: "lambda-s3-multiupload",
      statements: [
        new iam.PolicyStatement({
          resources: [s3bucket.bucketArn, `${s3bucket.bucketArn}/*`],
          actions: ["kms:GenerateDataKey", "kms:Decrypt", "s3:PutObject"],
          effect: iam.Effect.ALLOW,
        }),
      ],
    });
    const executionLambdaRole = new iam.Role(
      this,
      "SampleLambdaExecutionRole",
      {
        roleName: "sample-lambda-execution-role",
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
        ],
        inlinePolicies: { s3MultiUpload: policy.document },
      }
    );

    const lambdaGetUploadId = new lambda.Function(this, "GetUploadIdFunction", {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: "get_upload_id.handler",
      code: lambda.Code.fromAsset("lambda/multi_part_upload"),
      environment: {
        BUCKET_NAME: s3bucket.bucketName,
      },
      role: executionLambdaRole,
    });

    const lambdaGetPresignedUrl = new lambda.Function(
      this,
      "GetPresignedUrlFunction",
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: "get_presigned_url.handler",
        code: lambda.Code.fromAsset("lambda/multi_part_upload"),
        environment: {
          BUCKET_NAME: s3bucket.bucketName,
        },
      }
    );

    const lambdaUploadCompletion = new lambda.Function(
      this,
      "UploadCompletionFunction",
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: "completion.handler",
        code: lambda.Code.fromAsset("lambda/multi_part_upload"),
        environment: {
          BUCKET_NAME: s3bucket.bucketName,
        },
      }
    );

    // API Gatewayの作成
    const api = new apigateway.RestApi(this, "MapAppApi", {
      restApiName: "Map AppAPI",
    });

    // API Gatewayのリソースと統合を作成
    const integration = new apigateway.LambdaIntegration(lambdaFunction);
    api.root.addMethod("GET", integration);
    const resourceMultipartUpload = api.root.addResource("multipart-upload");

    resourceMultipartUpload
      .addResource("upload-id")
      .addMethod("GET", new apigateway.LambdaIntegration(lambdaGetUploadId));

    resourceMultipartUpload
      .addResource("presigned-url")
      .addMethod(
        "GET",
        new apigateway.LambdaIntegration(lambdaGetPresignedUrl)
      );

    resourceMultipartUpload
      .addResource("completion")
      .addMethod(
        "POST",
        new apigateway.LambdaIntegration(lambdaUploadCompletion)
      );
  }
}
