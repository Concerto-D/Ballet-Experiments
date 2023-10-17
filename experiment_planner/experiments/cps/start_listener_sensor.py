from ballet.assembly.simplified.assembly_d import DecentralizedComponentInstance
from ballet.assembly.simplified.type.cps import listener_type, sensor_type
from ballet.planner import resolve
from ballet.planner.communication.constraint_message import MailboxMessaging, HybridMessaging
from ballet.planner.communication.grpc.grpc_planner import ClientGrpcPlanner
from ballet.planner.goal import StateReconfigurationGoal, BehaviorReconfigurationGoal
from ballet.utils.planner_utils import savePlan, saveMetrics


def setup(todo, myid, state_active, state_final):
    i = myid
    listener = DecentralizedComponentInstance(f"listener_{i}", listener_type())
    listener.connect_provide_port(listener_type().get_port("rcv"),f"sensor_{i}","rcv_service")
    listener.connect_provide_port(listener_type().get_port("config"),f"sensor_{i}","config_service")
    listener.connect_use_port(listener_type().get_port("sys_service"),"system","service")

    sensor = DecentralizedComponentInstance(f"sensor_{i}", sensor_type())
    sensor.connect_use_port(sensor_type().get_port("rcv_service"),f"listener_{i}","rcv")
    sensor.connect_use_port(sensor_type().get_port("config_service"),f"listener_{i}","config")

    components = {listener, sensor}
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


def run(todo, nlistener, id, addresses, port, dir, latency=1, name="", state_active="running", state_final="running"):

    components, active, goal_states, goal = setup(todo=todo, myid=id, state_active=state_active, state_final=state_final)

    messaging = HybridMessaging(local_messaging=MailboxMessaging(components),
                                remote_messaging=ClientGrpcPlanner(addresses, port, verbose=True),
                                local_comps=components)

    plans, setup_time, get_message_time, bhv_inference_time, constraint_inference_time, infer_message_time, \
    num_out_local_messages, num_in_local_messages, num_out_remote_messages, num_in_remote_messages, \
    sending_time, planning_time, solving_time, inferred_constraints, generated_instructions, tlatency = \
        resolve.timed_resolve(components, active, goal, goal_states, messaging, latency=latency, verbose=True)
    total_time = setup_time + get_message_time + bhv_inference_time + constraint_inference_time + infer_message_time + sending_time + planning_time + tlatency

    print(f"[DONE] node sensor")
    for comp in plans:
        savePlan(plans[comp], f"{dir}/cps_{nlistener}_listener/sensor")
        print(plans[comp])
    metrics = f"""sensor_{id},{name},{nlistener},{num_out_local_messages},{num_in_local_messages},{num_out_remote_messages},{num_in_remote_messages},{inferred_constraints},{generated_instructions},{setup_time},{get_message_time},{sending_time},{bhv_inference_time},{constraint_inference_time},{infer_message_time},{planning_time},{tlatency},{solving_time},{total_time}"""
    print(metrics)
    saveMetrics(metrics, f"{dir}")

