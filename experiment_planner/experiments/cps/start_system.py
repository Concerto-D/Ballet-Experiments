from ballet.assembly.simplified.assembly_d import DecentralizedComponentInstance
from ballet.assembly.simplified.type.cps import system_type
from ballet.planner import resolve
from ballet.planner.communication.constraint_message import MailboxMessaging, HybridMessaging
from ballet.planner.communication.grpc.grpc_planner import ClientGrpcPlanner
from ballet.planner.goal import StateReconfigurationGoal, BehaviorReconfigurationGoal
from ballet.utils.planner_utils import savePlan, saveMetrics


def setup(todo, nlistener, state_active, state_final):
    system = DecentralizedComponentInstance(f"system", system_type())
    system.connect_use_port(system_type().get_port("db_service"), "database", "service")
    for i in range(nlistener):
        system.connect_provide_port(system_type().get_port("service"), f"listener_{i}", "sys_service")

    components = {system}
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


def run(todo, nlistener, addresses, port, dir, latency=1, name="", state_active="deployed", state_final="deployed"):
    components, active, goal_states, goal = setup(todo=todo, nlistener=nlistener, state_active=state_active, state_final=state_final)

    messaging = HybridMessaging(local_messaging=MailboxMessaging(components),
                                remote_messaging=ClientGrpcPlanner(addresses, port, verbose=True),
                                local_comps=components)

    plans, setup_time, get_message_time, bhv_inference_time, constraint_inference_time, infer_message_time, \
    num_out_local_messages, num_in_local_messages, num_out_remote_messages, num_in_remote_messages, \
    sending_time, planning_time, solving_time, inferred_constraints, generated_instructions, tlatency = \
        resolve.timed_resolve(components, active, goal, goal_states, messaging, latency=latency, verbose=True)
    total_time = setup_time + get_message_time + bhv_inference_time + constraint_inference_time + infer_message_time + sending_time + planning_time + tlatency

    print(f"[DONE] node system")
    for comp in plans:
        savePlan(plans[comp], f"{dir}/cps_{nlistener}_listener/system")
        print(plans[comp])
    metrics = f"""system,{name},{nlistener},{num_out_local_messages},{num_in_local_messages},{num_out_remote_messages},{num_in_remote_messages},{inferred_constraints},{generated_instructions},{setup_time},{get_message_time},{sending_time},{bhv_inference_time},{constraint_inference_time},{infer_message_time},{planning_time},{tlatency},{solving_time},{total_time}"""
    print(metrics)
    saveMetrics(metrics, f"{dir}")

