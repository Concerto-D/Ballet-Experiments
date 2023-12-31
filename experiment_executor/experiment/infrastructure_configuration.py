from typing import Dict
from enoslib import Host

from experiment_executor.experiment import log_experiment, concerto_d_g5k, globals_variables


def configure_infrastructure(version_concerto_d: str, roles_concerto_d: Dict[str, Host], environment: str, use_case_name: str):
    log = log_experiment.log

    # Initialisation experiment repositories
    if environment in ["remote", "raspberry"]:
        log.debug("Initialise repositories")
        concerto_d_g5k.initialize_expe_repositories(version_concerto_d, roles_concerto_d["concerto_d"])
        if version_concerto_d in ["mjuz", "mjuz-2-comps"]:
            concerto_d_g5k.initialize_deps_mjuz(roles_concerto_d["concerto_d"], environment)

    if version_concerto_d in ["synchronous", "mjuz", "mjuz-2-comps"]:
        log.debug("Synchronous version: creating inventory")
        _create_inventory_from_roles(roles_concerto_d, use_case_name)


def _create_inventory_from_roles(roles, use_case_name):
    # TODO: refacto assembly_name
    single_node_name = "server" if use_case_name == "parallel_deps" else "provider_node"
    linked_node_name = "dep" if use_case_name == "parallel_deps" else "chained_node"
    with open(globals_variables.inventory_name, "w") as f:
        host = roles[single_node_name][0].address
        f.write(f'{single_node_name}_assembly: "{host}:5000"')
        f.write("\n")
        f.write(f'{single_node_name}: "{host}:5000"')
        f.write("\n")
        for k, v in roles.items():
            if k not in ["server", "provider_node", "concerto_d", "zenoh_routers", "server-clients"]:
                # TODO: refacto assembly_name
                dep_num = int(k.replace(linked_node_name, ""))
                port = 5001 + dep_num
                name_assembly = k.replace(linked_node_name, f"{linked_node_name}_assembly_")
                f.write(f'{name_assembly}: "{v[0].address}:{port}"')
                f.write("\n")
                f.write(f'{k}: "{v[0].address}:{port}"')
                f.write("\n")
