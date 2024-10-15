# from typing import Union

# from fastapi import FastAPI

# app = FastAPI()

# @app.get("/")
# def read_root():
#     return {"Hello": "World"}


# @app.get("/items/{item_id}")
# def read_item(item_id: int, q: Union[str, None] = None):
#     return {"item_id": item_id, "q": q}

# import influxdb_client.client.influxdb_client

# influxdb_url = "http://localhost:8086"
# influxdb_bucket = "snmp_series"
# infuxdb_org = "docs"
# influxdb_token = "S7bndRB46TQ2/IvmK0AH/ZLoS9QW+mFRmUqMgallgDahSqfihulnZ06J8JZeFokfRvX5yzMhDaJLr+TvKA59Vw=="

# influxdb = influxdb_client.client.influxdb_client.InfluxDBClient(url=influxdb_url, token=influxdb_token, org=infuxdb_org)
# influxdb_query_api = influxdb.query_api()

# query_builder = 'from(bucket: "snmp_series")\
#             |> range(start: -1m)\
#             |> filter(fn: (r) => r["_measurement"] == "snmp")\
#             |> filter(fn: (r) => r["_field"] == "uptime")'

# uptime_query = influxdb_query_api.query(org=infuxdb_org, query=query_builder)

# results = []
# for table in uptime_query:
#     for record in table.records:
#         results.append((record.get_field(), record.get_value()))

# print(results)
# print(results)

# import asyncio

# from pysnmp.hlapi.v3arch.asyncio import send_notification, SnmpEngine, CommunityData, UdpTransportTarget, ContextData, ObjectIdentity, NotificationType
# from pysnmp.proto.rfc1902 import Integer

# async def run():
#     snmpEngine = SnmpEngine()

#     iterator = send_notification(
#         snmpEngine,  # Target IP and SNMP trap port (replace 'localhost' with your manager IP) # type: ignore
#         CommunityData("public", mpModel=0),  # SNMPv2c community string
#         await UdpTransportTarget.create(("192.168.1.147", 161)),  # Target IP and SNMP trap port (replace 'localhost' with your manager IP) # type: ignore
#         ContextData(),
#         "trap",
#         NotificationType(ObjectIdentity("1.3.6.1.6.3.1.1.5.4")).add_varbinds(
#             ("1.3.6.1.2.1.2.2.1.2", Integer(2)),  # ifIndex for Ethernet0/0 is 1
#             ("1.3.6.1.2.1.2.2.1.8", Integer(1))
#         )
#     )

#     errorIndication, errorStatus, errorIndex, varBinds = await iterator

#     if errorIndication:
#         print(f"Error: {errorIndication}")
#     else:
#         print("Link up trap sent for Ethernet0/1!")

# asyncio.run(run())

# import asyncio
# from pysnmp.hlapi.v3arch.asyncio import send_notification, SnmpEngine, CommunityData, UdpTransportTarget, ContextData, ObjectIdentity, NotificationType

# from pysnmp.proto.rfc1902 import Integer

# async def send_snmp_trap(interface_index: int, status: int):
#     snmp_engine = SnmpEngine()

#     iterator = send_notification(
#         snmp_engine,
#         CommunityData("public", mpModel=0),  # SNMPv2c community string
#         await UdpTransportTarget.create(("192.168.1.184", 161)),  # Target IP and SNMP trap port
#         ContextData(),
#         "trap",
#         NotificationType(ObjectIdentity("1.3.6.1.6.3.1.1.5.4")).add_varbinds(
#             ("1.3.6.1.2.1.2.2.1.2", Integer(interface_index)),  # ifDescr OID
#             ("1.3.6.1.2.1.2.2.1.7", Integer(status))  # ifOperStatus OID
#         )
#     )

#     errorIndication, errorStatus, errorIndex, varBinds = await iterator

#     if errorIndication:
#         print(f"Error: {errorIndication}")
#     elif errorStatus:
#         print(f"Error Status: {errorStatus}")
#     else:
#         print(f"Trap sent for interface index {interface_index} with status {status}!")

# Interface index for Ethernet0/1 (for example, 2)
# interface_index = 4  # Adjust as necessary

# # Set status to 1 for 'up' and 2 for 'down'
# status = 1  # Link Up

# Run the async function to send the trap
# asyncio.run(send_snmp_trap(interface_index, status))

# import asyncio
# from cgitb import lookup
# from pysnmp.hlapi.v3arch.asyncio import next_cmd, SnmpEngine, CommunityData, UdpTransportTarget, ContextData, ObjectIdentity, ObjectType, Integer

# async def trap_receiver():
#     # กำหนดที่อยู่ IP และพอร์ตที่รับ trap
#     udp_transport = await UdpTransportTarget.create(('192.168.1.184', 161))  # 0.0.0.0 รับจากทุก IP
#     print("Listening for SNMP traps...")

#     while True:
#         # รับ trap
#         iterator = next_cmd(
#             SnmpEngine(),
#             CommunityData('public', mpModel=1),
#             udp_transport,
#             ContextData(),
#             ObjectType(ObjectIdentity('1.3.6.1.2.1.2.2.1.8.9')),  # OID for ifOperStatus
#             lookupMib=False,
#             lexicographicMode=False
#         )
#         errorIndication, errorStatus, errorIndex, varBinds = await iterator

#         if errorIndication:
#             print(errorIndication)
#             break
#         elif errorStatus:
#             print(f'Error: {errorStatus.prettyPrint()} at {errorIndex and varBinds[int(errorIndex) - 1] or "?"}')
#             break
#         else:
#             for varBind in varBinds:
#                 # ตรวจสอบสถานะ Admin Status
#                 if varBind[1] == 1:
#                     print(f'INTERFACE ENABLED: Interface {varBind[0].prettyPrint()} is enabled.')
#                 elif varBind[1] == 2:
#                     print(f'INTERFACE DISABLED: Interface {varBind[0].prettyPrint()} is disabled.')
#                 elif varBind[1] == 3:
#                     print(f'INTERFACE TESTING: Interface {varBind[0].prettyPrint()} is in testing.')

# if __name__ == "__main__":
#     asyncio.run(trap_receiver())

import asyncio
from pysnmp.hlapi.v3arch.asyncio import set_cmd, SnmpEngine, CommunityData, UdpTransportTarget, ContextData, ObjectIdentity, ObjectType, Integer

async def main():
    error_indication, error_status, error_index, var_binds = await set_cmd(
        SnmpEngine(),
        CommunityData('private', mpModel=1),
        await UdpTransportTarget.create(('192.168.1.184', 161)),
        ContextData(),
        ObjectType(ObjectIdentity('IF-MIB', 'ifAdminStatus', 2), Integer(1))
    )
    print(error_indication, error_status, error_index, var_binds)

asyncio.run(main())
