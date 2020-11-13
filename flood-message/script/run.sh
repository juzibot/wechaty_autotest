#!/bin/bash

set -x

mkdir -p ../result
mkdir -p receive_qrcodeImage
mkdir -p send_qrcodeImage

read_var() {
    VAR=$(grep $1 $2 | xargs)
    IFS="=" read -ra VAR <<< "$VAR"
    echo ${VAR[1]}
}


PUPPET_DOCKER_VERSION=$(read_var PUPPET_DOCKER_VERSION ../../.env)


WECHATY_LOG=verbose PUPPET_DOCKER_VERSION=${PUPPET_DOCKER_VERSION} pm2 start --name flood-message --no-autorestart ts-node -- --type-check -r tsconfig-paths/register flood-message.ts 2>&1
# WECHATY_LOG=verbose WXWORK_TOKEN=${SEND_WXWORK_TOKEN} FOLDER_NAME=${FOLDER_NAME} ts-node send-message.ts 2>&1 | tee ${FOLDER_NAME}/verbose-send-log.log | grep "^[0-9][0-9]:[0-9][0-9]:[0-9][0-9] VERB" -v | tee ${FOLDER_NAME}/send-log.log
