#!/bin/bash
LOG=/home/z/my-project/dev.log
while true; do
  if ! pgrep -f "next-server" > /dev/null 2>&1; then
    echo "[$(date)] Starting next dev server..." >> $LOG
    npx next dev -p 3000 >> $LOG 2>&1 &
    NEXT_PID=$!
    disown $NEXT_PID
    # Wait for server to be ready
    for i in $(seq 1 30); do
      sleep 1
      if ss -tlnp | grep -q 3000; then
        echo "[$(date)] Server ready (PID: $NEXT_PID)" >> $LOG
        break
      fi
    done
  fi
  sleep 5
done
