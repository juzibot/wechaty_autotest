set -x

mkdir -p ../result
mkdir -p receive_qrcodeImage
mkdir -p send_qrcodeImage

WECHATY_LOG=verbose pm2 start --name groupOp --no-autorestart ts-node -- --type-check -r tsconfig-paths/register groupOp.ts 2>&1 
