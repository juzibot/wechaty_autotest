#!/bin/bash

set -x

mkdir -p tmp
mkdir -p ../result
mkdir -p receive_qrcodeImage
mkdir -p send_qrcodeImage

sleep 5

WECHATY_LOG=verbose pm2 start --name send --no-autorestart ts-node -- --type-check -r tsconfig-paths/register send-message.ts 2>&1
