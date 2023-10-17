import argparse

from experiments.cps import start_listener_sensor, start_system, start_database
from experiments.cps.cps_util import infer_addresses, parse_addresses, get_port_default

if __name__ == "__main__":
    # Setup arguments
    parser = argparse.ArgumentParser(prog='CPS',
                                     description='Host a node for a CPS cluster',
                                     epilog='')
    parser.add_argument('-n', '--nlistener', type=int, default=1)
    parser.add_argument('-i', '--idlistener', type=int, default=1)
    parser.add_argument('-l', '--latency', type=float, default=0.1)
    parser.add_argument('-o', '--out', default="./cps/")
    parser.add_argument('-r', '--run', default="system")
    parser.add_argument('-ips', '-a', '--addresses', default="_")
    parser.add_argument('-p', '--port', default="_")
    parser.add_argument('-s', '--scenario', default="deploy")

    args = parser.parse_args()

    # Get arguments
    dir = args.out
    nlistener = args.nlistener
    ips = args.addresses
    id_listener = args.idlistener
    run = args.run
    p = args.port
    latency = args.latency
    scenario = args.scenario

    # Get addresses (either default addresses or from file) and local port (either default, or user defined)
    addresses = infer_addresses(nlistener) if ips == "_" else parse_addresses(ips)
    port = get_port_default(run, id_listener) if p == "_" else p

    print(f"{run} is run on port {port}, scenario={scenario}")

    if scenario == "deploy":
        # Right call
        if run == "listener" or run == "sensor" or run == "listener_sensor":
            start_listener_sensor.run(todo = dict(), id=id_listener, nlistener=nlistener, addresses=addresses, port=port, dir=dir, latency=latency, name=scenario, state_active="off", state_final="running")
        if run == "database":
            start_database.run(todo = dict(), nlistener=nlistener, addresses=addresses, port=port, dir=dir, latency=latency,name=scenario, state_active="initiated", state_final="deployed")
        if run == "system":
            start_system.run(todo = dict(), nlistener=nlistener, addresses=addresses, port=port, dir=dir, latency=latency,name=scenario, state_active="initiated", state_final="deployed")

    if scenario == "update":
        # Right call
        if run == "listener" or run == "sensor" or run == "listener_sensor":
            start_listener_sensor.run(todo = {"database":"update"}, id=id_listener, nlistener=nlistener, addresses=addresses, port=port, dir=dir, latency=latency,name=scenario)
        if run == "database":
            start_database.run(todo = {"database":"update"}, nlistener=nlistener, addresses=addresses, port=port, dir=dir, latency=latency,name=scenario)
        if run == "system":
            start_system.run(todo = {"database":"update"}, nlistener=nlistener, addresses=addresses, port=port, dir=dir, latency=latency,name=scenario)

