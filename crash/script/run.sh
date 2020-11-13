#!/bin/sh
open -a iTerm .
set -x

mkdir -p ../result
mkdir -p receive_qrcodeImage
mkdir -p send_qrcodeImage

read_var() {
    VAR=$(grep $1 $2 | xargs)
    IFS="=" read -ra VAR <<< "$VAR"
    echo ${VAR[1]}
}


DURATION_MM=$(read_var DURATION_MM ../../.env)
TEST_NAME=$(read_var TEST_NAME ../../.env)

file="../../utils/token-for-crash.txt"

n=1
while IFS= read -r token
do
  CD_CMD="WECHATY_LOG=verbose DURATION_MM=${DURATION_MM} TOKEN=${token} NO=${n} pm2 start --name crash --no-autorestart ts-node -- --type-check -r tsconfig-paths/register wxwork.ts 2>&1"
  echo "$CD_CMD"
  echo "$n"
  if test $n -eq 1;then
  osascript &>/dev/null <<EOF
	tell application "iTerm"
      tell current session of current tab of current window
          write text "$CD_CMD"
      end tell
      delay 5
	end tell
EOF
  else
  osascript &>/dev/null <<EOF
	tell application "iTerm"
      tell current session of current tab of current window
          split vertically with default profile command "$@"
      end tell
      delay "$(( ( RANDOM % 10 )  + 1 ))"
      tell second session of current tab of current window
          write text "$CD_CMD"
      end tell
	end tell
EOF
fi
n=$((n+1))
done < "$file"

echo $((n-1))"个任务完成！"

exit
