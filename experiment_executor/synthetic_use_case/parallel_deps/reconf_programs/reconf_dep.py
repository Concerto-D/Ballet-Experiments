from ballet.executor import global_variables
from ballet.executor.logger.time_logger import create_timestamp_metric, TimestampType
from experiment_executor.synthetic_use_case import reconf_programs
from experiment_executor.synthetic_use_case.parallel_deps.assemblies.dep_assembly import DepAssembly


@create_timestamp_metric(TimestampType.TimestampEvent.DEPLOY)
def deploy(sc, dep_num):
    sc.add_component(f"dep{dep_num}", "Dep")
    sc.connect(f"dep{dep_num}", "ip", "server", f"serviceu_ip{dep_num}")
    sc.connect(f"dep{dep_num}", "service", "server", f"serviceu{dep_num}")
    sc.push_b(f"dep{dep_num}", "deploy")
    sc.wait(f"dep{dep_num}")


@create_timestamp_metric(TimestampType.TimestampEvent.UPDATE)
def update(sc, dep_num):
    sc.push_b(f"dep{dep_num}", "update")
    sc.push_b(f"dep{dep_num}", "deploy")
    sc.wait(f"dep{dep_num}")


@create_timestamp_metric(TimestampType.TimestampEvent.UPTIME)
def execute_reconf(dep_num, config_dict, duration, waiting_rate, version_concerto_d, reconfiguration_name, nb_concerto_nodes):
    sc = DepAssembly(dep_num, config_dict, waiting_rate, version_concerto_d, reconfiguration_name, nb_concerto_nodes)
    sc.set_verbosity(2)
    sc.time_manager.start(duration)
    if reconfiguration_name == "deploy":
        deploy(sc, dep_num)
    else:
        update(sc, dep_num)

    return sc


@create_timestamp_metric(TimestampType.TimestampEvent.UPTIME_WAIT_ALL)
def execute_global_sync(sc):
    sc.exit_code_sleep = 5
    sc.wait_all()


if __name__ == '__main__':
    config_dict, duration, waiting_rate, version_concerto_d, reconfiguration_name, nb_concerto_nodes, dep_num, _, _ = reconf_programs.initialize_reconfiguration()
    sc = execute_reconf(dep_num, config_dict, duration, waiting_rate, version_concerto_d, reconfiguration_name, nb_concerto_nodes)
    if not global_variables.is_concerto_d_asynchronous():
        execute_global_sync(sc)
    sc.finish_reconfiguration()
