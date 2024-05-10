#!/bin/bash

# Function to kill all background processes when the script exits
cleanup() {
    echo "Killing all background processes..."
    nginx -s stop
    kill 0  # Kills all processes in the current process group
}

trap cleanup EXIT

# Start three servers on different ports, pointing to bash/nginx_load_balancer.conf
NODE_ID=alice PORT=8081 bash bash/jar.sh &
NODE_ID=bob PORT=8082 bash bash/jar.sh &
NODE_ID=charlie PORT=8083 bash bash/jar.sh &

nginx -c ~/dev/gatz/server/bash/nginx_load_balancer.conf

wait