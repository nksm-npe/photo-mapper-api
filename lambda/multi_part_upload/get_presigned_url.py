import os
import boto3
import json
import logging
from botocore.client import Config

REGION_NAME = os.getenv("AWS_DEFAULT_REGION")
S3_BUCKET_NAME = os.environ["BUCKET_NAME"]
S3_OBJECT_NAME = "fileupload/"
DURATION_SECONDS = 60 * 60 * 24


def handler(event, context):
    # 署名付きURLに含めるファイル名、パートNo、アップロードIDを取得
    file_name = event["queryStringParameters"]["fileName"]
    part_number = int(event["queryStringParameters"]["partNumber"])
    upload_id = event["queryStringParameters"]["uploadId"]
    upload_user = event["queryStringParameters"]["uploadUser"]

    s3 = boto3.client(
        service_name="s3",
        region_name=REGION_NAME,
        config=Config(signature_version="s3v4"),
    )

    # 署名付きURLを生成
    preSignedUrl = s3.generate_presigned_url(
        ClientMethod="upload_part",
        Params={
            "Bucket": S3_BUCKET_NAME,
            "Key": S3_OBJECT_NAME + file_name,
            "UploadId": upload_id,
            "PartNumber": part_number,
        },
        ExpiresIn=DURATION_SECONDS,
        HttpMethod="PUT",
    )

    response = {
        "presigned_url": preSignedUrl,
    }

    return {
        "statusCode": 200,
        "isBase64Encoded": False,
        "headers": {
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,GET",
        },
        "body": json.dumps(response),
    }
