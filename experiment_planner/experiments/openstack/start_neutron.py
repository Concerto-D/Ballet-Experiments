from ballet.assembly.simplified.assembly_d import DecentralizedComponentInstance
from ballet.assembly.simplified.type.openstack import neutron_type
from ballet.planner import resolve
from ballet.planner.communication.constraint_message import MailboxMessaging, HybridMessaging
from ballet.planner.communication.grpc.grpc_planner import ClientGrpcPlanner
from ballet.planner.goal import StateReconfigurationGoal, BehaviorReconfigurationGoal
from ballet.utils.planner_utils import savePlan, saveMetrics

def setup(todo, myid, state_active, state_final):
    i = myid
    neutron = DecentralizedComponentInstance(f"neutron_{i}", neutron_type())
    neutron.connect_use_port(neutron_type().get_port("mariadb_service"), f"mariadb_worker_{i}", "service")
    neutron.connect_use_port(neutron_type().get_port("keystone_service"), f"keystone_{i}", "service")

    components = {neutron}
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

    components, active, goal_states, goal = setup(todo, id, state_active, state_final)

    messaging = HybridMessaging(local_messaging=MailboxMessaging(components),
                                remote_messaging=ClientGrpcPlanner(addresses, port, verbose=True),
                                local_comps=components)

    plans, setup_time, get_message_time, bhv_inference_time, constraint_inference_time, infer_message_time, \
    num_out_local_messages, num_in_local_messages, num_out_remote_messages, num_in_remote_messages, \
    sending_time, planning_time, solving_time, inferred_constraints, generated_instructions, tlatency = \
        resolve.timed_resolve(components, active, goal, goal_states, messaging, latency=latency, verbose=True)
    total_time = setup_time + get_message_time + bhv_inference_time + constraint_inference_time + infer_message_time + sending_time + planning_time + tlatency

    print(f"[DONE] node neutron_{id}")
    for comp in plans:
        savePlan(plans[comp], f"{dir}/openstack_{nworker}_worker/neutron_{id}")

    # emitted messages locally,received messages locally,emitted messages remotely,received messages remotely,inferred constraint,generated instructions,setup,getting messages,sending messages,inferring bhvs, inferring constraints, inferring output messages, final planning, latency time, solving time (bhv inference + planning)"""
    metrics = f"""neutron_{id},{name},{nworker},{num_out_local_messages},{num_in_local_messages},{num_out_remote_messages},{num_in_remote_messages},{inferred_constraints},{generated_instructions},{setup_time},{get_message_time},{sending_time},{bhv_inference_time},{constraint_inference_time},{infer_message_time},{planning_time},{tlatency},{solving_time},{total_time}"""
    saveMetrics(metrics, f"{dir}")





