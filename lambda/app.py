import os
import boto3


def handler(event, context):
    # DynamoDBテーブル名を環境変数から取得
    table_name = os.environ["TABLE_NAME"]
    print(f"event:{event}")
    # クエリパラメータからidを取得
    id = event["queryStringParameters"]["id"]

    # DynamoDBクライアントの初期化
    client = boto3.client("dynamodb")

    # DynamoDBテーブルの取得
    # table = dynamodb.Table(table_name)

    # # テーブルから指定されたidのデータを取得
    # response = table.get_item(Key={'id': string(id)})
    response = client.get_item(
        TableName=table_name,
        Key={
            "id": {
                "S": id,
            }
        },
    )
    # レスポンスデータの作成
    if "Item" in response:
        item = response["Item"]
        # user_name = item["userName"]
        response_data = {"statusCode": 200, "body": f"ID: {id}, : {item}"}
    else:
        response_data = {"statusCode": 404, "body": f"ID: {id} not found"}

    return response_data
