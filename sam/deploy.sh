#!/bin/bash

if [[ -z "$@" ]]; then
  echo >&2 "you must supply an argument"
  exit 1
elif [ "$1" != "mainnet" ] && [ "$1" != "testnet" ] && [ "$1" != "devnet" ]; then
  echo >&2 "$@ is not a valid deploy network"
  exit 1
fi

if [ "$1" == "mainnet" ]; then
  STACK_NAME=maiar-exchange
else
  STACK_NAME=$1-maiar-exchange
fi

REGION=eu-central-1
S3_BUCKET=eu-central-1-sam-bucket
TEMPLATE=template.yaml

rm build.yaml

sam validate --template $TEMPLATE

sam package \
  --template-file $TEMPLATE \
  --output-template-file build.yaml \
  --s3-bucket $S3_BUCKET

sam deploy \
  --region $REGION \
  --template-file build.yaml \
  --stack-name $STACK_NAME \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides Network=$1