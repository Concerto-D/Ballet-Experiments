import sys

from experiment_executor.experiment import globals_variables, execution_experiment, experiment_controller, log_experiment

if __name__ == "__main__":
    # Get the sweeper state according to the expe_name present in the expe_config_file
    configuration_expe_file_path = sys.argv[1]
    global_params, reservation_params, email_params, sweeper_params = execution_experiment.extract_parameters(configuration_expe_file_path)
    (
        expe_name,
        _,
        _,
        _,
        all_expes_dir,
        _,
        _,
        _,
        _
    ) = global_params.values()
    log_experiment.initialize_logging(expe_name, stdout_only=True)
    globals_variables.all_expes_dir = all_expes_dir
    sweeper = experiment_controller.create_param_sweeper(expe_name, sweeper_params)
    print(sweeper)
