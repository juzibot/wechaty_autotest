#!/bin/sh
MYROOT=$PWD

function running {
  pid=`pm2 pid $1`
  echo $pid $1
  while [ $pid -ne 0 ]
  do
    sleep 1
    pid=`pm2 pid $1`
    echo $pid $1
  done
}

# crash
cd $MYROOT/crash/script
# 1. start sync file - send
sh ./run-startSync.sh &
# 2. run
sh ./run.sh

# wait DURATION_MM - 30 min
sleep 1800
ps aux | grep -i startSync | awk {'print $2'} | xargs kill -9
pkill -f pm2


# flood-message
cd $MYROOT/flood-message/script
# 1. start sync file - send
sh ./run-startSync.sh &
# 2. run
sh ./run.sh
# 3. running
running flood-message
# 4. stop
pm2 del flood-message
# 5. kill start sync
ps aux | grep -i startSync | awk {'print $2'} | xargs kill -9


# group-chat
cd $MYROOT/group-chat/script
# 1. start sync file - receive
sh ./run-startSync.sh &
# 2. run group load
sh ./run-load.sh
# 3. running...
running groupLoad
# 4. stop
pm2 del groupLoad
# 5. run group operation
sh ./run-operation.sh
# 6. running
running groupOp
# 7. stop
pm2 del groupOp
# 8. kill start sync
ps aux | grep -i startSync | awk {'print $2'} | xargs kill -9

# loading
cd $MYROOT/loading/script
# 1. start sync file - receive
sh ./run-startSync.sh &
# 2. run
sh run.sh 
# 3. running
running loading
# 4. stop
pm2 del loading
# 5. kill start sync
ps aux | grep -i startSync | awk {'print $2'} | xargs kill -9

# loading-lost-tag
cd $MYROOT/loading-lost-tag/script
# 1. run send 
sh ./send.sh &
# 2. run receive
#   N times
N=1
for i in {1..$N}
do
  echo "loading lost tag round $i"
  sh ./receive.sh
  running receive
  pm2 del receive
done
# 3. stop send
pm2 del send


# receive-and-send-message 
cd $MYROOT/receive-and-send-message/script
# 1. run send and receive 
#    N times
N=1
for i in {1..$N}
do
  echo "loading receive & send round $i"
  sh ./run.sh 
  running receive
  running send
  pm2 del send
  pm2 del receive
done


# receive-small-image
cd $MYROOT/receive-small-image/script
# 1. run send and receive
#    N times
N=1
for i in {1..$N}
do
  echo "loading receive small image round $i"
  sh ./run.sh 
  running receive
  running send
  pm2 del send
  pm2 del receive
done
