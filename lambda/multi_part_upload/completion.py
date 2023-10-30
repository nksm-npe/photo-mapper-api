import os
import json
import boto3

REGION_NAME = os.getenv("AWS_DEFAULT_REGION")
S3_BUCKET_NAME = os.environ["BUCKET_NAME"]
S3_OBJECT_NAME = "fileupload/"


def handler(event, context):
    body_json = json.loads(event["body"])
    parts = body_json["Parts"]
    upload_id = body_json["UploadId"]
    file_name = body_json["FileName"]

    client = boto3.client("s3")
    response = client.complete_multipart_upload(
        Bucket=S3_BUCKET_NAME,
        Key=S3_OBJECT_NAME + file_name,
        MultipartUpload={"Parts": parts},
        UploadId=upload_id,
    )

    response = client.get_object(Bucket=S3_BUCKET_NAME, Key=S3_OBJECT_NAME + file_name)

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Headers": "Host,Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT",
        },
        "body": json.dumps("OK"),
    }
