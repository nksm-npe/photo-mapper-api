import os
import boto3
import json
from botocore.client import Config

REGION_NAME = os.getenv("AWS_DEFAULT_REGION")
S3_BUCKET_NAME = os.environ["BUCKET_NAME"]
S3_OBJECT_NAME = "fileupload/"


def handler(event, context):
    file_name = event["queryStringParameters"]["fileName"]

    s3 = boto3.client(
        service_name="s3",
        region_name=REGION_NAME,
        config=Config(signature_version="s3v4"),
    )

    # マルチアップロード用IDを生成
    response = s3.create_multipart_upload(
        Bucket=S3_BUCKET_NAME,
        Key=S3_OBJECT_NAME + file_name,
        ContentType="multipart/form-data",
    )

    upload_id = response["UploadId"]

    resonse_body = {
        "upload_id": upload_id,
    }

    return {
        "statusCode": 200,
        "isBase64Encoded": False,
        "headers": {
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT",
        },
        "body": json.dumps(resonse_body),
    }
