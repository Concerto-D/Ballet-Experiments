from ballet.assembly.simplified.assembly_d import DecentralizedComponentInstance
from ballet.assembly.simplified.type.openstack import facts_type, common_type, haproxy_type, memcached_type, \
    ovswitch_type, rabbitmq_type, mariadb_master_type
from ballet.planner import resolve
from ballet.planner.communication.constraint_message import MailboxMessaging, HybridMessaging
from ballet.planner.communication.grpc.grpc_planner import ClientGrpcPlanner
from ballet.planner.goal import StateReconfigurationGoal, BehaviorReconfigurationGoal
from ballet.utils.planner_utils import savePlan, saveMetrics

def setup(todo, state_active, state_final, nworker=0):
    facts = DecentralizedComponentInstance("facts_master", facts_type())
    common = DecentralizedComponentInstance("common_master", common_type())
    haproxy = DecentralizedComponentInstance("haproxy_master", haproxy_type())
    memcached = DecentralizedComponentInstance("memcached_master", memcached_type())
    ovswitch = DecentralizedComponentInstance("ovswitch_master", ovswitch_type())
    rabbitmq = DecentralizedComponentInstance("rabbitmq_master", rabbitmq_type())

    facts.connect_provide_port(facts_type().get_port("service"), "haproxy_master", "facts_service")
    haproxy.connect_use_port(haproxy_type().get_port("facts_service"), "facts_master", "service")
    facts.connect_provide_port(facts_type().get_port("service"), "common_master", "facts_service")
    common.connect_use_port(common_type().get_port("facts_service"), "facts_master", "service")
    facts.connect_provide_port(facts_type().get_port("service"), "rabbitmq_master", "facts_service")
    rabbitmq.connect_use_port(rabbitmq_type().get_port("facts_service"), "facts_master", "service")
    facts.connect_provide_port(facts_type().get_port("service"), "memcached_master", "facts_service")
    memcached.connect_use_port(memcached_type().get_port("facts_service"), "facts_master", "service")
    facts.connect_provide_port(facts_type().get_port("service"), "ovswitch_master", "facts_service")
    ovswitch.connect_use_port(ovswitch_type().get_port("facts_service"), "facts_master", "service")

    mariadb = DecentralizedComponentInstance("mariadb_master", mariadb_master_type())

    common.connect_provide_port(common_type().get_port("service"), "mariadb_master", "common_service")
    mariadb.connect_use_port(mariadb_master_type().get_port("common_service"), "common_master", "service")
    haproxy.connect_provide_port(haproxy_type().get_port("service"), "mariadb_master", "haproxy_service")
    mariadb.connect_use_port(mariadb_master_type().get_port("haproxy_service"), "haproxy_master", "service")

    for i in range(nworker):
        mariadb.connect_provide_port(mariadb_master_type().get_port("service"), f"mariadb_worker_{i}", "master_service")

    components = {facts, common, haproxy, memcached, ovswitch, rabbitmq, mariadb}
    active = {comp: comp.type().get_place(state_active) for comp in components}

    goal_states = {comp: set() for comp in components}
    for comp in components:
        goal_states[comp].add(StateReconfigurationGoal(state_final, final=True))
    goal = {}
    for c in todo.keys():
        if c not in goal.keys():
            goal[c] = set()
        goal[c].add(BehaviorReconfigurationGoal(todo[c]))

    return components, active, goal_states, goal

def run(todo, nworker, addresses, port, dir, latency=1, state_active="deployed", state_final="deployed", name=""):

    components, active, goal_states, goal = setup(todo, state_active, state_final, nworker=nworker)

    messaging = HybridMessaging(local_messaging=MailboxMessaging(components),
                                remote_messaging=ClientGrpcPlanner(addresses, port, verbose=True),
                                local_comps=components)

    plans, setup_time, get_message_time, bhv_inference_time, constraint_inference_time, infer_message_time, \
    num_out_local_messages, num_in_local_messages, num_out_remote_messages, num_in_remote_messages, \
    sending_time, planning_time, solving_time, inferred_constraints, generated_instructions, tlatency = \
        resolve.timed_resolve(components, active, goal, goal_states, messaging, latency=latency, verbose=True)
    total_time = setup_time + get_message_time + bhv_inference_time + constraint_inference_time + infer_message_time + sending_time + planning_time + tlatency

    print(f"[DONE] node master")
    for comp in plans:
        savePlan(plans[comp], f"{dir}/openstack_{nworker}_worker/master")
        print(plans[comp])
# emitted messages locally,received messages locally,emitted messages remotely,received messages remotely,inferred constraint,generated instructions,setup,getting messages,sending messages,inferring bhvs, inferring constraints, inferring output messages, final planning, latency time, solving time (bhv inference + planning)"""
    metrics = f"""master,{name},{nworker},{num_out_local_messages},{num_in_local_messages},{num_out_remote_messages},{num_in_remote_messages},{inferred_constraints},{generated_instructions},{setup_time},{get_message_time},{sending_time},{bhv_inference_time},{constraint_inference_time},{infer_message_time},{planning_time},{tlatency},{solving_time},{total_time}"""
    print(metrics)
    saveMetrics(metrics, f"{dir}")

