from cgi import print_arguments
from typing import Any
from datetime import datetime
from contextlib import asynccontextmanager

from influxdb_client.client.query_api_async import QueryApiAsync
from influxdb_client.client.influxdb_client_async import InfluxDBClientAsync

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketException, status
from fastapi.middleware.cors import CORSMiddleware

from pysnmp.hlapi.v3arch.asyncio import get_cmd, set_cmd, next_cmd, SnmpEngine, CommunityData, UdpTransportTarget, ContextData, ObjectType, ObjectIdentity
from pysnmp.proto.rfc1902 import Integer

import asyncio

# List of hosts
hosts: list[str] = [
    "172.20.10.5",
    "172.20.10.6",
]

# Interface status constants
UP_STATUS = "up"
DOWN_STATUS = "down"
TESTING_STATUS = "testing"

# HTTPResponse class is used to return a response in JSON format
class HTTPResponse(object):
    def __init__(self, message: str, data: Any) -> None:
        self.message = message
        self.data = data

    def json(self):
        return {
            "message": self.message,
            "data": self.data
        }

# Module class is used to get the SNMP MIBs
class Module(object):
    def get_snmp_v2__mib(self):
        return "SNMPv2-MIB"

    def get_if_mib(self):
        return "IF-MIB"

# SimpleNetworkManagementProtocol class is used to get the SNMP objects
class SimpleNetworkManagementProtocol(Module):
    def __init__(self, ip_address, community_name: str) -> None:
        self.snmp = SnmpEngine()
        self.ip_address = ip_address
        self.community_name = community_name

    async def get_object(self, module_name, object_name: str, index: int) -> Any:
        iterator = get_cmd(
            self.snmp,
            CommunityData(self.community_name, mpModel=0),
            await UdpTransportTarget.create((self.ip_address, 161)),
            ContextData(),
            ObjectType(ObjectIdentity(module_name, object_name, index)),
        )

        errorIndication, errorStatus, errorIndex, varBinds = await iterator

        if errorIndication:
            print(errorIndication)

        elif errorStatus:
            print(
            "{} at {}".format(
                str(errorStatus),
                errorIndex and varBinds[int(errorIndex) - 1][0] or "?",
            )
        )

        else:
            return varBinds[0]

    async def set_object(self, module_name, object_name: str, index: int, value: int) -> bool:
        error_indication, error_status, error_index, var_binds = await set_cmd(
            self.snmp,
            CommunityData(self.community_name, mpModel=1),
            await UdpTransportTarget.create((self.ip_address, 161)),
            ContextData(),
            ObjectType(ObjectIdentity(module_name, object_name, index), Integer(value)) # type: ignore
        )

        if error_indication:
            print(error_indication)
            return False

        elif error_status:
            print(
                "{} at {}".format(
                    str(error_status),
                    error_index and var_binds[int(error_index) - 1][0] or "?",
                )
            )
            return False

        return True

# api_v1 function is used to prefix the API path with /v1
def api_v1(path: str):
    return f"/v1{path}"

module_instance = Module()
snmp_v2_mib = module_instance.get_snmp_v2__mib()
if_mib = module_instance.get_if_mib()

influxdb_url = "http://localhost:8086"
influxdb_bucket = "snmp_series"
infuxdb_org = "docs"
influxdb_token = "S7bndRB46TQ2/IvmK0AH/ZLoS9QW+mFRmUqMgallgDahSqfihulnZ06J8JZeFokfRvX5yzMhDaJLr+TvKA59Vw=="

influxdb: InfluxDBClientAsync | None = None
influxdb_query_api: QueryApiAsync | None = None

# lifespan function is used to create a connection to InfluxDB
@asynccontextmanager
async def lifespan(_: FastAPI):
    global influxdb, influxdb_query_api

    influxdb = InfluxDBClientAsync(url=influxdb_url, token=influxdb_token, org=infuxdb_org)
    influxdb_query_api = influxdb.query_api()
    yield

    await influxdb.close()

# FastAPI class is used to create an API
api = FastAPI(lifespan=lifespan)

# origins list is used to allow the origins
origins = [
    "http://localhost",
    "http://localhost:3000",
]

# CORSMiddleware class is used to allow the origins
api.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# get_root function is used to return a response in JSON format
@api.websocket(api_v1("/dashboard/uptime"))
async def get_dashboard_uptime(
    websocket: WebSocket,
    agent_host: str | None = None,
    time_range: str = "5m"
):
    await websocket.accept()

    if agent_host is None:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)

    if influxdb_query_api is None:
        raise WebSocketException(code=status.WS_1011_INTERNAL_ERROR)

    query_builder = f'from(bucket: "snmp_series")\
        |> range(start: -{time_range})\
        |> filter(fn: (r) => r["_measurement"] == "snmp")\
        |> filter(fn: (r) => r["_field"] == "uptime")\
        |> filter(fn: (r) => r["agent_host"] == "{agent_host}")'

    try:
        while True:
            try:
                uptime_query = await influxdb_query_api.query(query_builder)

            except Exception as e:
                await websocket.send_text(f"Error querying InfluxDB: {str(e)}")
                continue

            uptime_output = uptime_query.to_values(columns=["_time", "_value"])

            uptimes: list[dict[str, Any]] = []
            for uptime in uptime_output:
                time_at = time_at = datetime.fromisoformat(str(uptime[0]))
                uptimes.append({"time_at": time_at.isoformat(), "uptime": uptime[1]})

            response = HTTPResponse("succesfully", uptimes)

            await websocket.send_json(response.json())
            await asyncio.sleep(60)

    except Exception as e:
        print(f"An error occurred: {e}")
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)

    finally:
        await websocket.close()


# get_traffic_usage function is used to return a response in JSON format
@api.websocket(api_v1("/dashboard/traffic/usage"))
async def get_dashboard_traffic_usage(
    websocket: WebSocket,
    agent_host: str | None = None,
    time_range: str = "5m"
):
    await websocket.accept()

    if agent_host is None:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)

    if influxdb_query_api is None:
        raise WebSocketException(code=status.WS_1011_INTERNAL_ERROR)

    query_builder = f'from(bucket: "snmp_series")\
        |> range(start: -{time_range})\
        |> filter(fn: (r) => r["_measurement"] == "interface")\
        |> filter(fn: (r) => r["_field"] == "ifOutOctets" or r["_field"] == "ifInOctets")\
        |> filter(fn: (r) => r["agent_host"] == "{agent_host}")'

    try:
        while True:
            try:
                traffic_usage_query = await influxdb_query_api.query(query_builder)

            except Exception as e:
                await websocket.send_text(f"Error querying InfluxDB: {str(e)}")
                continue

            traffic_usage_output = traffic_usage_query.to_values(columns=["_time", "_value", "_field", "ifDescr"])

            visited_traffic_usages: dict[str, dict[str, Any]] = {}
            for traffic_usage in traffic_usage_output:
                time_at = datetime.fromisoformat(str(traffic_usage[0]))
                isoformat_time_at = time_at.isoformat()

                octet_value = traffic_usage[1]
                field = str(traffic_usage[2])
                if_descr = str(traffic_usage[3])

                if "Null" not in if_descr:
                    if isoformat_time_at not in visited_traffic_usages:
                        visited_traffic_usages[isoformat_time_at] = {
                            "in": octet_value if field == "ifInOctets" else 0,
                            "out": octet_value if field == "ifOutOctets" else 0,
                        }

                    else:
                        visited_traffic_usages[isoformat_time_at]["in"] += octet_value if field == "ifInOctets" else 0
                        visited_traffic_usages[isoformat_time_at]["out"] += octet_value if field == "ifOutOctets" else 0

            traffic_usages: list[dict[str, Any]] = []
            for time_formated in visited_traffic_usages:
                in_octet = visited_traffic_usages[time_formated]["in"]
                out_octet = visited_traffic_usages[time_formated]["out"]

                traffic_usages.append({
                    "time_at": time_formated,
                    "in": in_octet,
                    "out": out_octet
                })

            response = HTTPResponse("succesfully", traffic_usages)

            await websocket.send_json(response.json())
            await asyncio.sleep(60)

    except Exception as e:
        print(f"An error occurred: {e}")
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)

    finally:
        await websocket.close()


# get_interfaces function is used to return a response in JSON format
@api.websocket(api_v1("/dashboard/traps"))
async def get_dashboard_traps(
    websocket: WebSocket,
    agent_host: str | None = None
):
    await websocket.accept()

    if agent_host is None:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)

    try:
        snmp = SimpleNetworkManagementProtocol(agent_host, "public")
        udp_transport = await UdpTransportTarget.create((agent_host, 161))

        if_number_object = await snmp.get_object(if_mib, "ifNumber", 0)
        new_if_number: int = int(if_number_object[1])

        interfaces: list[dict[str, Any]] = []
        for if_number in range(1, new_if_number+1):
            if_descr_object = await snmp.get_object(if_mib, "ifDescr", if_number)
            if b"Null" not in if_descr_object[1]:
                interfaces.append({
                    "interface_name": str(if_descr_object[1]),
                    "interface_index": if_number
                })

        while True:
            for interface in interfaces:
                if_name = interface["interface_name"]
                if_index = interface["interface_index"]

                identity = f"1.3.6.1.2.1.2.2.1.8.{if_index-1}"
                iterator = next_cmd(
                    SnmpEngine(),
                    CommunityData("public", mpModel=1),
                    udp_transport,
                    ContextData(),
                    ObjectType(ObjectIdentity(identity)),
                    lookupMib=False,
                    lexicographicMode=False
                )
                errorIndication, errorStatus, errorIndex, varBinds = await iterator

                if errorIndication:
                    print(errorIndication)
                    break

                elif errorStatus:
                    print(f'Error: {str(errorStatus)} at {errorIndex and varBinds[int(errorIndex) - 1] or "?"}')
                    break

                else:
                    for varBind in varBinds:
                        if varBind[1] == 1:
                            response = HTTPResponse("successfully", {
                                "interface_name": if_name,
                                "interface_index": if_index,
                                "interface_status": UP_STATUS
                            })
                            await websocket.send_json(response.json())

                        elif varBind[1] == 2:
                            response = HTTPResponse("successfully", {
                                "interface_name": if_name,
                                "interface_index": if_index,
                                "interface_status": DOWN_STATUS
                            })
                            await websocket.send_json(response.json())

                        elif varBind[1] == 3:
                            response = HTTPResponse("successfully", {
                                "interface_name": if_name,
                                "interface_index": if_index,
                                "interface_status": TESTING_STATUS
                            })
                            await websocket.send_json(response.json())

            await asyncio.sleep(1)

    except Exception as e:
        print(f"An error occurred: {e}")
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)

    finally:
        await websocket.close()

# get_interfaces function is used to return a response in JSON format
@api.get(api_v1("/dashboard/interfaces"))
async def get_dashboard_interfaces(agent_host: str | None = None):
    if agent_host is None:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)

    snmp = SimpleNetworkManagementProtocol(agent_host, "public")

    if_number_object = await snmp.get_object(if_mib, "ifNumber", 0)
    new_if_number = int(if_number_object[1])

    interfaces: list[int] = []
    number_of_interfaces: int = 0
    for if_number in range(1, new_if_number+1):
        if_descr_object = await snmp.get_object(if_mib, "ifDescr", if_number)
        if b"Null" not in if_descr_object[1]:
            number_of_interfaces += 1
            interfaces.append(if_number)

    number_of_interfaces_up: int = 0
    number_of_interfaces_down: int = 0
    for interface in interfaces:
        if_admin_status = await snmp.get_object(if_mib, "ifAdminStatus", interface)
        if if_admin_status[1] == 1:
            number_of_interfaces_up += 1
        else:
            number_of_interfaces_down += 1

    response = HTTPResponse("successfully", {
        "number_of_interfaces": number_of_interfaces,
        "number_of_interfaces_up": number_of_interfaces_up,
        "number_of_interfaces_down": number_of_interfaces_down
    })

    return response.json()


# get_interfaces function is used to return a response in JSON format
@api.get(api_v1("/management/interfaces"))
async def get_management_interfaces(agent_host: str | None = None):
    if agent_host is None:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)

    snmp = SimpleNetworkManagementProtocol(agent_host, "public")

    if_number_object = await snmp.get_object(if_mib, "ifNumber", 0)
    new_if_number = int(if_number_object[1])

    interfaces: list[dict[str, Any]] = []
    for if_number in range(1, new_if_number+1):
        if_descr_object = await snmp.get_object(if_mib, "ifDescr", if_number)
        if b"Null" not in if_descr_object[1]:
            if_descr = str(if_descr_object[1])

            if_mtu_object = await snmp.get_object(if_mib, "ifMtu", if_number)
            if_mtu = int(if_mtu_object[1])

            if_speed_object = await snmp.get_object(if_mib, "ifSpeed", if_number)
            if_speed = int(if_speed_object[1])

            if_admin_status_object = await snmp.get_object(if_mib, "ifAdminStatus", if_number)
            if_admin_status = int(if_admin_status_object[1])

            interfaces.append({
                "interface_name": if_descr,
                "interface_index": if_number,
                "interface_mtu": if_mtu,
                "interface_speed": if_speed,
                "interface_admin_status": if_admin_status
            })

    response = HTTPResponse("successfully", interfaces)
    return response.json()


# patch_interface_status function is used to return a response in JSON format
@api.patch(api_v1("/management/interfaces/{interface_index}/{interface_status}"))
async def patch_interface_status(
    interface_index: int,
    interface_status: str,
    agent_host: str | None = None,
):
    if agent_host is None:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)

    snmp = SimpleNetworkManagementProtocol(agent_host, "private")

    payload_status: int = 0
    if interface_status == UP_STATUS:
        payload_status = 1
    elif interface_status == DOWN_STATUS:
        payload_status = 2
    else:
        HTTPException(status_code=400, detail="Invalid interface status")

    if_status = await snmp.set_object(if_mib, "ifAdminStatus", interface_index, payload_status)
    if not if_status:
        raise HTTPException(status_code=400, detail="Failed to set interface status")

    response = HTTPResponse("successfully", {"interface_index": interface_index, "interface_status": interface_status})
    return response.json()


# get_agent_hosts function is used to return a response in JSON format
@api.get(api_v1("/agent/hosts"))
async def get_agent_hosts():
    response = HTTPResponse("successfully", {"agent_hosts": hosts})
    return response.json()
