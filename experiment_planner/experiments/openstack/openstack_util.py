def digits3(i):
    id_3_digit = str(i)
    while len(id_3_digit) < 3:
        id_3_digit = "0" + id_3_digit
    return id_3_digit


def infer_addresses(nworker):
    port_master = get_port_default("master", 1)
    res = {"facts_master":f"localhost:{port_master}","common_master":f"localhost:{port_master}",
           "haproxy_master":f"localhost:{port_master}","memcached_master":f"localhost:{port_master}",
           "ovswitch_master":f"localhost:{port_master}","rabbitmq_master":f"localhost:{port_master}",
           "mariadb_master":f"localhost:{port_master}"}
    for i in range(nworker):
        port_db = get_port_default("worker", i)
        port_nova =  get_port_default("nova", i)
        port_neutron =  get_port_default("neutron", i)
        res[f"facts_{i}"] = f"localhost:{port_db}"
        res[f"common_{i}"] = f"localhost:{port_db}"
        res[f"haproxy_{i}"] = f"localhost:{port_db}"
        res[f"memcached_{i}"] = f"localhost:{port_db}"
        res[f"ovswitch_{i}"] = f"localhost:{port_db}"
        res[f"rabbitmq_{i}"] = f"localhost:{port_db}"
        res[f"mariadb_worker_{i}"] = f"localhost:{port_db}"
        res[f"glance_{i}"] = f"localhost:{port_db}"
        res[f"keystone_{i}"] = f"localhost:{port_db}"
        res[f"nova_{i}"] = f"localhost:{port_nova}"
        res[f"neutron_{i}"] = f"localhost:{port_neutron}"
    return res


def get_port_default(run, id_worker):
    res = "00000"
    id_3_digit = digits3(id_worker)
    if run == "master":
        res = "50000"
    if run == "worker":
        res = f"5{id_3_digit}1"
    if run == "nova":
        res = f"5{id_3_digit}2"
    if run == "neutron":
        res = f"5{id_3_digit}3"
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
