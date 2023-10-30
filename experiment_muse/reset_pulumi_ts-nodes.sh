#/usr/bin/bash

kill -9 $(ps -aux | pgrep -f ts-node)
