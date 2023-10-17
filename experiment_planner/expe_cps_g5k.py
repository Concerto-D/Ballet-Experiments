from enoslib import *
from enoslib.infra.enos_g5k.g5k_api_utils import get_api_username
from random import randrange
import shutil
import os
import time
import argparse

"""Runs the experiments for CPS case on n sites.

Usage: python3 expe_cps_g5k.py -n nworker -l latency -o outfile -c cluster -s site -sc senario
By default:
nlistener=1 
latency=1.0
outfile=your_home/tmp/planner_results.csv
cluster=gros
site=rennes
scenario=both (ie deploy and update)
I recommend to only make varying `-n worker`

For running it, you might want to change some things:
- project_dir value (line 26)
- minizinc (line 27)
"""
username = get_api_username()
project_dir = f"/home/{username}/Project/cp-scheduling"
minizinc = f"/home/{username}/Software/MiniZincIDE-2.7.6-bundle-linux-x86_64/bin"

rdm = randrange(999999)

_DEFAULT_TIME = "02:00:00"
_DEFAULT_START = "now"

_ROLE_CPS = "cps"
_ROLE_DB = "database"
_ROLE_SENSOR = "sensor"
_ROLE_SYS = "system"
_PORT = 40001

def delete_directory_with_contents(directory_path):
    try:
        shutil.rmtree(directory_path)
        print(f"Directory '{directory_path}' and its contents removed successfully.")
    except OSError as e:
        print(f"Error while deleting directory: {str(e)}")
        
    
def clean(nodenames):
    for name in nodenames:
        delete_directory_with_contents(f"/home/{username}/{name}")
    os.system("rm -rf ~/oar*; rm -rf ~/OAR*;")


def merge_results(fileout, address_ids, result_dir):
    files = []
    for nodename in address_ids.keys():
        files.append(f"/home/{username}/{nodename}{result_dir}/metrics.csv")
    merge_files(fileout, files)


def parseArgs():
    timestamp = str(time.time())
    parser = argparse.ArgumentParser(prog='Galera',
                                     description='Host a node for a MariaDB Galera cluster',
                                     epilog='')
    parser.add_argument('-n', '--nsensor', type=int, default=1)
    parser.add_argument('-l', '--latency', type=float, default=1.0)
    parser.add_argument('-o', '--out', default=f"/home/{username}/tmp/{timestamp}/planner_results.csv")
    parser.add_argument('-c', '--cluster', default="gros")
    parser.add_argument('-t', '--timestamp', default=timestamp)
    parser.add_argument('-s', '--site', default="rennes")
    parser.add_argument('-sc', '--scenario', default="both")
    args = parser.parse_args()
    fileout = args.out
    nsensor = args.nsensor
    latency = args.latency
    cluster = args.cluster
    site = args.site
    scenario = args.scenario
    timestamp = args.timestamp
    return fileout, nsensor, latency, cluster, site, timestamp, scenario


def merge_files(output_file, input_files):
    try:
        directory_path = os.path.dirname(output_file)
        os.makedirs(directory_path, exist_ok=True)
        os.system(f"touch {output_file}")
        with open(output_file, 'a') as merged_file:
            for file_name in input_files:
                with open(file_name, 'r') as input_file:
                    merged_file.write(input_file.read())
        print("Files merged successfully!")
    except Exception as e:
        print(f"An error occurred: {str(e)}")


def book(site, cluster, nsensor, time=_DEFAULT_TIME, start=_DEFAULT_START):
    my_network = G5kNetworkConf(id="my_cps_network", type="prod", roles=["my_network"], site=site)
    if start != "now":
        g5k = G5kConf.from_settings(job_type="allow_classic_ssh", job_name=f"{rdm}_plan_inference_concertoD_cps_{nsensor}",
                                    walltime=time, reservation=start)
    else:
        g5k = G5kConf.from_settings(job_type="allow_classic_ssh", job_name=f"{rdm}_plan_inference_concertoD_cps_{nsensor}",
                                    walltime=time)
    g5k.add_network_conf(my_network)\
        .add_machine(roles=[_ROLE_CPS, _ROLE_DB], cluster=cluster, nodes=1, primary_network=my_network)
    g5k.add_machine(roles=[_ROLE_CPS, _ROLE_SYS], cluster=cluster, nodes=1, primary_network=my_network)
    for i in range(nsensor):
        g5k.add_machine(roles=[_ROLE_CPS, _ROLE_SENSOR+str(i)], cluster=cluster, nodes=1, primary_network=my_network)
    conf = (g5k.finalize())
    provider = G5k(conf)
    roles, networks = provider.init()
    return roles, networks

def make_addresses_content(roles, nsensor):
    content = []
    address_ids = {}
    node_sys = roles[_ROLE_SYS][0]
    node_db = roles[_ROLE_DB][0]
    content.append(f"system,{node_sys.address}:{_PORT}")
    address_ids[node_sys.address] = ("system", 0)
    content.append(f"database,{node_db.address}:{_PORT}")
    address_ids[node_db.address] = ("database", 0)
    for i in range(nsensor):
        node_sensor = roles[_ROLE_SENSOR+str(i)][0]
        content.append(f"listener_{i},{node_sensor.address}:{_PORT}")
        content.append(f"sensor_{i},{node_sensor.address}:{_PORT}")
        address_ids[node_sensor.address] = ("sensor", i)
    return content, address_ids


def init_address_file(roles, content, inv_file):
    split = inv_file.split("/")
    dir_name = "/".join(split[:-1])
    with play_on(pattern_hosts=_ROLE_CPS, roles=roles, run_as=username) as p:
        p.shell(f"mkdir {dir_name}")
        p.shell("echo \"" + str('\n'.join(content)) + "\" >> " + inv_file )


def run(nsensor, latency, roles, inventory, result_dir, scenario):
    for i in range(nsensor):
        with play_on(pattern_hosts=_ROLE_SENSOR+str(i), roles=roles, run_as=username) as p:
            p.shell(f"{minizinc_path()}; python3 {project_dir}/python/experimental_cps.py "
                    f"-r sensor -n {nsensor} -i {i} -o {result_dir} -p {_PORT} -l {latency} -a {inventory} -s {scenario} 2>> {result_dir}/error.err", background=True)
    with play_on(pattern_hosts=_ROLE_DB, roles=roles, run_as=username) as p:
        p.shell(f"{minizinc_path()}; python3 {project_dir}/python/experimental_cps.py "
                f"-r database -n {nsensor} -i 0 -o {result_dir} -p {_PORT} -l {latency} -a {inventory} -s {scenario} "
                f"2>> {result_dir}/error.err >> {result_dir}/out.log ", background=True)
    with play_on(pattern_hosts=_ROLE_SYS, roles=roles, run_as=username) as p:
        p.shell(f"{minizinc_path()}; python3 {project_dir}/python/experimental_cps.py "
                f"-r system -n {nsensor} -i 0 -o {result_dir} -p {_PORT} -l {latency} -a {inventory} -s {scenario} "
                f"2>> {result_dir}/error.err >> {result_dir}/out.log ")


def get_results(roles, result_dir):
    with play_on(pattern_hosts=_ROLE_CPS, roles=roles, run_as=username) as p:
        p.fetch(src=f"{result_dir}/metrics.csv", dest="~")
        
        
def minizinc_path():
    return f"export PATH={minizinc}:$PATH"  

def get_errors(roles, result_dir):
    with play_on(pattern_hosts=_ROLE_CPS, roles=roles, run_as=username) as p:
        p.fetch(src=f"{result_dir}/error.err", dest="~")
        p.fetch(src=f"{result_dir}/out.log", dest="~")


if __name__ == "__main__":
    fileout, nsensor, latency, cluster, site, timestamp, scenario = parseArgs()

    result_dir = f"/tmp/{timestamp}/"
    inventory = f"/tmp/{timestamp}/addresses.txt"

    roles, networks = book(site=site, cluster=cluster, nsensor=nsensor)
    content, address_ids = make_addresses_content(roles, nsensor)
    init_address_file(roles, content, inventory)
    if scenario == "deploy" or scenario == "both":
        try:
            for n in range(10):
                run(nsensor, latency, roles, inventory, result_dir, scenario="deploy")
            get_results(roles, result_dir)
            merge_results(fileout, address_ids, result_dir)
        except Exception as e:
            print(e)
            get_errors(roles, result_dir)
    if scenario == "update" or scenario == "both":
        try:
            for n in range(10):
                run(nsensor, latency, roles, inventory, result_dir, scenario="update")
            get_results(roles, result_dir)
            merge_results(fileout, address_ids, result_dir)
        except Exception as e:
            print(e)
            get_errors(roles, result_dir)
    get_errors(roles, result_dir)
    clean(list(address_ids.keys()))
