#!/bin/sh

mkdir -p ../result
mkdir -p receive_qrcodeImage
mkdir -p send_qrcodeImage

WECHATY_LOG=verbose pm2 start --name groupLoad --no-autorestart ts-node -- --type-check -r tsconfig-paths/register groupLoad.ts 2>&1 

