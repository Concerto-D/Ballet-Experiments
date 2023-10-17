from ballet.assembly.simplified.assembly_d import DecentralizedComponentInstance
from ballet.assembly.simplified.type.openstack import facts_type, common_type, haproxy_type, memcached_type, \
    ovswitch_type, rabbitmq_type, mariadb_worker_type, keystone_type, glance_type
from ballet.planner import resolve
from ballet.planner.communication.constraint_message import MailboxMessaging, HybridMessaging
from ballet.planner.communication.grpc.grpc_planner import ClientGrpcPlanner
from ballet.planner.goal import StateReconfigurationGoal, BehaviorReconfigurationGoal
from ballet.utils.planner_utils import savePlan, saveMetrics

def setup(todo, myid, state_active, state_final):
    i = myid
    facts = DecentralizedComponentInstance(f"facts_{i}", facts_type())

    common = DecentralizedComponentInstance(f"common_{i}", common_type())
    facts.connect_provide_port(facts_type().get_port("service"), f"common_{i}", "facts_service")
    common.connect_use_port(common_type().get_port("facts_service"), f"facts_{i}", "service")

    haproxy = DecentralizedComponentInstance(f"haproxy_{i}", haproxy_type())
    facts.connect_provide_port(facts_type().get_port("service"), f"haproxy_{i}", "facts_service")
    haproxy.connect_use_port(haproxy_type().get_port("facts_service"), f"facts_{i}", "service")

    memcached = DecentralizedComponentInstance(f"memcached_{i}", memcached_type())
    facts.connect_provide_port(facts_type().get_port("service"), f"memcached_{i}", "facts_service")
    memcached.connect_use_port(memcached_type().get_port("facts_service"), f"facts_{i}", "service")

    ovswitch = DecentralizedComponentInstance(f"ovswitch_{i}", ovswitch_type())
    facts.connect_provide_port(facts_type().get_port("service"), f"ovswitch_{i}", "facts_service")
    ovswitch.connect_use_port(ovswitch_type().get_port("facts_service"), f"facts_{i}", "service")

    rabbitmq = DecentralizedComponentInstance(f"rabbitmq_{i}", rabbitmq_type())
    facts.connect_provide_port(facts_type().get_port("service"), f"rabbitmq_{i}", "facts_service")
    rabbitmq.connect_use_port(rabbitmq_type().get_port("facts_service"), f"facts_{i}", "service")

    mariadb = DecentralizedComponentInstance(f"mariadb_worker_{i}", mariadb_worker_type())
    common.connect_provide_port(common_type().get_port("service"), f"mariadb_worker_{i}", "common_service")
    mariadb.connect_use_port(mariadb_worker_type().get_port("common_service"), f"common_{i}", "service")
    haproxy.connect_provide_port(haproxy_type().get_port("service"), f"mariadb_worker_{i}", "haproxy_service")
    mariadb.connect_use_port(mariadb_worker_type().get_port("haproxy_service"), f"haproxy_{i}", "service")
    mariadb.connect_provide_port(mariadb_worker_type().get_port("service"), f"nova_{i}", "mariadb_service")
    mariadb.connect_provide_port(mariadb_worker_type().get_port("service"), f"neutron_{i}", "mariadb_service")
    mariadb.connect_use_port(mariadb_worker_type().get_port("master_service"), "mariadb_master", "service")

    keystone = DecentralizedComponentInstance(f"keystone_{i}", keystone_type())
    keystone.connect_use_port(keystone_type().get_port("mariadb_service"), f"mariadb_worker_{i}", "service")
    mariadb.connect_provide_port(mariadb_worker_type().get_port("service"), f"keystone_{i}", "mariadb_service")
    keystone.connect_provide_port(keystone_type().get_port("service"), f"nova_{i}", "keystone_service")
    keystone.connect_provide_port(keystone_type().get_port("service"), f"neutron_{i}", "keystone_service")

    glance = DecentralizedComponentInstance(f"glance_{i}", glance_type())
    glance.connect_use_port(glance_type().get_port("mariadb_service"), f"mariadb_worker_{i}", "service")
    mariadb.connect_provide_port(mariadb_worker_type().get_port("service"), f"glance_{i}", "mariadb_service")
    glance.connect_use_port(glance_type().get_port("keystone_service"), f"keystone_{i}", "service")
    keystone.connect_provide_port(keystone_type().get_port("service"), f"glance_{i}", "keystone_service")

    components = {facts, common, haproxy, memcached, ovswitch, rabbitmq, mariadb, keystone, glance}

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


def run(todo, nworker, id, addresses, port, dir, latency=1, state_active="deployed", state_final="deployed", name=""):

    components, active, goal_states, goal = setup(todo=todo, myid=id, state_active=state_active, state_final=state_final)

    messaging = HybridMessaging(local_messaging=MailboxMessaging(components),
                                remote_messaging=ClientGrpcPlanner(addresses, port, verbose=True),
                                local_comps=components)

    plans, setup_time, get_message_time, bhv_inference_time, constraint_inference_time, infer_message_time, \
    num_out_local_messages, num_in_local_messages, num_out_remote_messages, num_in_remote_messages, \
    sending_time, planning_time, solving_time, inferred_constraints, generated_instructions, tlatency = \
        resolve.timed_resolve(components, active, goal, goal_states, messaging, latency=latency, verbose=True)
    total_time = setup_time + get_message_time + bhv_inference_time + constraint_inference_time + infer_message_time + sending_time + planning_time + tlatency
    print(f"[DONE] node worker_{id}")
    for comp in plans:
        savePlan(plans[comp], f"{dir}/openstack_{nworker}_worker/worker_{id}")

    # emitted messages locally,received messages locally,emitted messages remotely,received messages remotely,inferred constraint,generated instructions,setup,getting messages,sending messages,inferring bhvs, inferring constraints, inferring output messages, final planning, latency time, solving time (bhv inference + planning)"""
    metrics = f"""worker_{id},{name},{nworker},{num_out_local_messages},{num_in_local_messages},{num_out_remote_messages},{num_in_remote_messages},{inferred_constraints},{generated_instructions},{setup_time},{get_message_time},{sending_time},{bhv_inference_time},{constraint_inference_time},{infer_message_time},{planning_time},{tlatency},{solving_time},{total_time}"""
    saveMetrics(metrics, f"{dir}")




