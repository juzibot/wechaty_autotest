set -x

mkdir -p tmp
mkdir -p ../result
mkdir -p receive_qrcodeImage
mkdir -p send_qrcodeImage

sleep 2

WECHATY_LOG=verbose pm2 start --name receive --no-autorestart ts-node -- --type-check -r tsconfig-paths/register receive-message.ts 2>&1 
