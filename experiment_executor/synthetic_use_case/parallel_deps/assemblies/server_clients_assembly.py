from ballet.assembly.concertod.assembly import Assembly
from experiment_executor.synthetic_use_case.parallel_deps.assemblies.dep import Dep
from experiment_executor.synthetic_use_case.parallel_deps.assemblies.server import Server


class ServerClientsAssembly(Assembly):
    def __init__(self, reconf_config_dict, waiting_rate, version_concerto_d, reconfiguration_name, nb_concerto_nodes, uptimes_nodes_file_path, execution_start_time):
        remote_assemblies = {}

        # Add components types to instanciate for the add instruction
        components_types = {
            "Server": Server,
            "Dep": Dep
        }
        Assembly.__init__(
            self,
            "server_clients_assembly",
            components_types,
            remote_assemblies,
            reconf_config_dict["transitions_times"],
            waiting_rate,
            version_concerto_d,
            nb_concerto_nodes,
            reconfiguration_name,
            uptimes_nodes_file_path
        )
