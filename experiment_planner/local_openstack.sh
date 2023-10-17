#!/bin/bash

# Function to get the port based on the run and worker ID
get_port_default() {
    run=$1
    id_worker=$2
    res=$(python3 - <<END
def get_port_default(run, id_worker):
    res = "00000"
    id_3_digit = digits3(id_worker)
    match run:
        case "master":
            res = "50000"
        case "worker":
            res = f"5{id_3_digit}1"
        case "nova":
            res = f"5{id_3_digit}2"
        case "neutron":
            res = f"5{id_3_digit}3"
    print(res)

def digits3(num):
    return f"{num:03d}"

get_port_default("$run", $id_worker)
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

echo "facts_master,localhost:$(get_port_default master 0)" >> addresses.txt
echo "common_master,localhost:$(get_port_default master 0)" >> addresses.txt
echo "haproxy_master,localhost:$(get_port_default master 0)" >> addresses.txt
echo "memcached_master,localhost:$(get_port_default master 0)" >> addresses.txt
echo "ovswitch_master,localhost:$(get_port_default master 0)" >> addresses.txt
echo "rabbitmq_master,localhost:$(get_port_default master 0)" >> addresses.txt
echo "mariadb_master,localhost:$(get_port_default master 0)" >> addresses.txt
for ((i=0; i<n; i++)); do
    echo "facts_$i,localhost:$(get_port_default worker $i)" >> addresses.txt
    echo "common_$i,localhost:$(get_port_default worker $i)" >> addresses.txt
    echo "haproxy_$i,localhost:$(get_port_default worker $i)" >> addresses.txt
    echo "memcached_$i,localhost:$(get_port_default worker $i)" >> addresses.txt
    echo "ovswitch_$i,localhost:$(get_port_default worker $i)" >> addresses.txt
    echo "rabbitmq_$i,localhost:$(get_port_default worker $i)" >> addresses.txt
    echo "mariadb_worker_$i,localhost:$(get_port_default worker $i)" >> addresses.txt
    echo "glance_$i,localhost:$(get_port_default worker $i)" >> addresses.txt
    echo "keystone_$i,localhost:$(get_port_default worker $i)" >> addresses.txt
    echo "nova_$i,localhost:$(get_port_default nova $i)" >> addresses.txt
    echo "neutron_$i,localhost:$(get_port_default neutron $i)" >> addresses.txt
done

worker_pids=()
python3.10 experiments_openstack.py -r master -n $n -p $(get_port_default master 0) -s $sc & master_pid=$!
for ((i=0; i<n; i++)); do
   python3.10 experiments_openstack.py -s update -r worker -l 1 -n $n -i $i -s $sc -p $(get_port_default worker $i) & worker_pids+=($!)
   python3.10 experiments_openstack.py -s update -r nova -l 1 -n $n -i $i -s $sc -p $(get_port_default nova $i) & worker_pids+=($!)
   python3.10 experiments_openstack.py -s update -r neutron -l 1 -n $n -i $i -s $sc -p $(get_port_default neutron $i) & worker_pids+=($!)
done

# Wait for all background processes to finish
for pid in "${worker_pids[@]}"; do
    wait "$pid"
done
wait "$master_pid"

read -p "Press Enter to continue..."
rm addresses.txt
