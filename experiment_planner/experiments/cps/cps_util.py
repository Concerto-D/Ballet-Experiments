def digits3(i):
    id_3_digit = str(i)
    while len(id_3_digit) < 3:
        id_3_digit = "0" + id_3_digit
    return id_3_digit


def infer_addresses(nlistener):
    port_system = get_port_default("system", 0)
    port_database = get_port_default("database", 0)
    res = {"system":f"localhost:{port_system}","database":f"localhost:{port_database}"}
    for i in range(nlistener):
        port_ls = get_port_default("listener", i)
        res[f"listener_{i}"] = f"localhost:{port_ls}"
        res[f"sensor_{i}"] = f"localhost:{port_ls}"
    return res


def get_port_default(run, id_listener):
    res = "00000"
    id_3_digit = digits3(id_listener)
    if run == "system":
        res = "50000"
    if run == "database":
        res = f"50001"
    if run == "listener" or run == "sensor" or run == "listener_sensor":
        res = f"5{id_3_digit}2"
    return res

def parse_addresses(filename):
    res = {}
    with open(filename, 'r') as f:
        lines = f.readlines()
        for line in lines:
            try:
                ca = line.split(",")
                comp = ca[0]
                address = ca[1]
                res[comp]=address
            except:
                print(f"`{line}` cannot be parsed")
    return res
