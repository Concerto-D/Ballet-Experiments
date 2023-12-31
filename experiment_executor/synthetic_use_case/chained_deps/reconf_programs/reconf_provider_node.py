import time

from ballet.executor import global_variables
from ballet.executor.logger.time_logger import create_timestamp_metric, TimestampType
from experiment_executor.synthetic_use_case.chained_deps.assemblies.provider_node_assembly import ProviderNodeAssembly


@create_timestamp_metric(TimestampType.TimestampEvent.DEPLOY)
def deploy(sc):
    # Passer de l'état "undeployed" à l'état "running" et "installed"
    print("deploying")
    time.sleep(5)
    print("done")
    return


@create_timestamp_metric(TimestampType.TimestampEvent.UPDATE)
def update(sc):
    # Passer de l'état "running" à "configured", puis de "configured" à "running"
    print("updating")
    time.sleep(3)
    print("done")
    return


@create_timestamp_metric(TimestampType.TimestampEvent.UPTIME)
def execute_reconf(config_dict, duration, waiting_rate, version_concerto_d, reconfiguration_name, nb_concerto_nodes):
    sc = ProviderNodeAssembly(config_dict, waiting_rate, version_concerto_d, reconfiguration_name, nb_concerto_nodes)
    sc.set_verbosity(2)
    sc.time_manager.start(duration)
    if reconfiguration_name == "deploy":
        deploy(sc)
    else:
        update(sc)
    return sc


@create_timestamp_metric(TimestampType.TimestampEvent.UPTIME_WAIT_ALL)
def execute_global_sync(sc):
    sc.exit_code_sleep = 5
    sc.wait_all()


if __name__ == '__main__':
    config_dict, duration, waiting_rate, version_concerto_d, reconfiguration_name, nb_concerto_nodes, _, _, _ = reconf_programs.initialize_reconfiguration()
    sc = execute_reconf(config_dict, duration, waiting_rate, version_concerto_d, reconfiguration_name, nb_concerto_nodes)
    if not global_variables.is_concerto_d_asynchronous():
        execute_global_sync(sc)
    sc.finish_reconfiguration()
