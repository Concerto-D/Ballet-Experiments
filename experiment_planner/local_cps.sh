#!/bin/bash

# Function to get the port based on the run and worker ID
get_port_default() {
    run=$1
    id_listener=$2
    res=$(python3 - <<END
def get_port_default(run, id_listener):
    res = "00000"
    id_3_digit = digits3(id_listener)
    if run == "system":
        res = "50000"
    if run == "database":
        res = f"50001"
    if run == "listener" or run == "sensor" or run == "listener_sensor":
        res = f"5{id_3_digit}2"
    print(res)

def digits3(num):
    return f"{num:03d}"

get_port_default("$run", $id_listener)
END
)
    echo "$res"
}


# Main script

if [[ $# -ne 2 ]]; then
    echo "Usage: $0 <n> <sc> with n the number of workers, and sc the scenario to run (deploy | update)"
    exit 1
fi

n=$1
sc=$2

touch addresses.txt

worker_pids=()
python3.10 experiments_cps.py -s update -r database -n $n -p $(get_port_default database 0) -l 0 -s $sc & worker_pids+=($!)
python3.10 experiments_cps.py -s update -r system -n $n -p $(get_port_default system 0) -l 0 -s $sc & worker_pids+=($!)
for ((i=0; i<n; i++)); do
   python3.10 experiments_cps.py -s update -r sensor -n $n -i $i -p $(get_port_default sensor $i) -l 0 -s $sc & worker_pids+=($!)
done


# Wait for all background processes to finish
for pid in "${worker_pids[@]}"; do
    wait "$pid"
done

read -p "Press Enter to continue..."
rm addresses.txt
