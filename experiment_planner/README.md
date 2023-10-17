# Ballet planner README

## Introduction
Welcome to the experiments of the planner for Ballet. This README provides instructions on how to set up and use the prototype on your machine. Please follow the steps below to ensure a smooth installation and usage experience.
You can also note the presence of scripts for running experiments on Grid'5000. These files are presents for illustrating how we conducted our experiments on top of Grid'5000.

## Prerequisites
Before using the prototype, make sure you have the following software installed on your machine:

### Manual installation

1. **MiniZinc 2.7.6**: Install MiniZinc on your Linux machine using the snap package manager. You can run the following command to install MiniZinc:
   ```shell
   sudo snap install minizinc
   ```
    Verify the installation by running minizinc --version in your terminal.

You can then install Python dependencies using : ```pip install -r requirements.txt```, or do it manually as follows.

2. **minizinc library for Python (version 0.9.0)**: Install the minizinc Python library using pip. Run the following command:
   ```shell
   pip install minizinc==0.9.0
   ```

3. **grpc libraries for Python (version 1.47.0)**: Install the required gRPC libraries using pip. Run the following commands:
   ```shell
   pip install grpcio==1.47.0
   pip install grpcio-tools==1.47.0
   ``` 

4. **enoslib library for Python (version 8.1.4)**: Install the required EnosLib library using pip. This install is completely optional, and is only needed to run expriments on the experimental platform Grid'5000. 
Run the following commands:
   ```shell
   pip install enoslib=8.1.4
   ``` 

### Virtual environment

You can instead run a virtual environment for Python with dependencies specified in requirements.txt

1. **Create the virtual environment**
```shell
python -m venv myenv
```

2. **Activate the virtual environment:**

On Windows:
```shell
myenv\Scripts\activate
```

On Linux:
```shell
source myenv/bin/activate
```

3. **Install the dependencies from the requirements.txt file**
```shell
pip install -r requirements.txt
```

### Planner sources

To run the scripts/experiments for the Ballet's planner, you must first download planner sources on https://anonymous.4open.science/r/ballet-planner/README.md
Please, copy the planner/ directory within the root of this repository. 

## Running tests

To test the installation and verify that everything is working correctly, you can run a script that simulates a use case. Follow the steps below:

1. Make sure you are in the project directory.

2. Open a terminal or command prompt.

3. Run the following command to execute the script with a specific number of workers (replace `1` with the desired number):
   ```shell
   ./local_openstack.sh 1 deploy
   ```

4. Check the output in the `openstack/ directory. All MiniZinc files for local planning are generated and stored in plan_mzn/

5. Run you own local tests using
   ```shell
   ./local_<assembly>.sh <n> <scenario>
   ```
   with \<assembly\> the type of assembly you want to reconfigure (i.e, openstack or cps), \<n\> the number of sites, and \<scenario\> which scenario you want to run (i.e, deploy or update) 