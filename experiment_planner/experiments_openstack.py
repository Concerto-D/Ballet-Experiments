import argparse

from experiments.openstack import start_master, start_worker, start_nova, start_neutron
from experiments.openstack.openstack_util import infer_addresses, parse_addresses, get_port_default

if __name__ == "__main__":
    # Setup arguments
    parser = argparse.ArgumentParser(prog='OpenStack',
                                     description='Host a node for a MariaDB Galera cluster',
                                     epilog='')
    parser.add_argument('-n', '--nworker', type=int, default=1)
    parser.add_argument('-i', '--idworker', type=int, default=1)
    parser.add_argument('-l', '--latency', type=float, default=0.1)
    parser.add_argument('-o', '--out', default="./openstack/")
    parser.add_argument('-r', '--run', default="master")
    parser.add_argument('-ips', '-a', '--addresses', default="_")
    parser.add_argument('-p', '--port', default="_")
    parser.add_argument('-s', '--scenario', default="deploy")

    args = parser.parse_args()

    # Get arguments
    dir = args.out
    nworker = args.nworker
    ips = args.addresses
    id_worker = args.idworker
    run = args.run
    p = args.port
    latency = args.latency
    scenario = args.scenario

    # Get addresses (either default addresses or from file) and local port (either default, or user defined)
    addresses = infer_addresses(nworker) if ips == "_" else parse_addresses(ips)
    port = get_port_default(run, id_worker) if p == "_" else p

    print(f"{run} is run on port {port}, scenario={scenario}")
    if scenario == "deploy":
        # Right call
        if run == "master":
            start_master.run(todo=dict(), nworker=nworker, addresses=addresses, port=port, dir=dir, latency=latency,
                             state_active="initiated", state_final="deployed", name="deploy")
        if run == "worker":
            start_worker.run(todo=dict(), nworker=nworker, id=id_worker, addresses=addresses, port=port, dir=dir,
                             latency=latency, state_active="initiated", state_final="deployed", name="deploy")
        if run == "nova":
            start_nova.run(todo=dict(), nworker=nworker, id=id_worker, addresses=addresses, port=port, dir=dir,
                           latency=latency, state_active="initiated", state_final="deployed", name="deploy")
        if run == "neutron":
            start_neutron.run(todo=dict(), nworker=nworker, id=id_worker, addresses=addresses, port=port, dir=dir,
                              latency=latency, state_active="initiated", state_final="deployed", name="deploy")

    if scenario == "update":
        # Right call
        if run == "master":
            start_master.run(todo = {"mariadb_master": "update"}, nworker=nworker, addresses=addresses, port=port, dir=dir, latency=latency, name="update")
        if run == "worker":
            start_worker.run(todo = {"mariadb_master": "update"}, nworker=nworker, id=id_worker, addresses=addresses, port=port, dir=dir,  latency=latency, name="update")
        if run == "nova":
            start_nova.run(todo = {"mariadb_master": "update"}, nworker=nworker, id=id_worker, addresses=addresses, port=port, dir=dir, latency=latency, name="update")
        if run == "neutron":
            start_neutron.run(todo = {"mariadb_master": "update"}, nworker=nworker, id=id_worker, addresses=addresses, port=port, dir=dir,  latency=latency, name="update")
