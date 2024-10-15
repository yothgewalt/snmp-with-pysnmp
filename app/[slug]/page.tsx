"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { dashboardService } from "@yoth.dev/services/dashboard";

import type { GetDashboardInterfacesResponseBodySchema } from "@yoth.dev/services/dashboard";

import { Button, Container, Flex, Grid, Group, Paper, ScrollArea, Select, Stack, Table, Text } from "@mantine/core";
import { IconAlertCircle, IconCloudComputing, IconExclamationCircle, IconPlayerPlay, IconRoad, IconTimeline, IconWorldUpload } from "@tabler/icons-react";
import { AreaChart } from "@mantine/charts";
import { NumberTicker } from "@yoth.dev/components/NumberTicker/NumberTicker";
import LoadingScreen from "@yoth.dev/components/LoadingScreen/LoadingScreen";
import { DefaultResponseBodySchema } from "@yoth.dev/typings/response";
import { TrafficUsageResponseBodySchema, TrapInterfaceResponseBodySchema, UptimeResponseBodySchema } from "@yoth.dev/typings/dashboard";
import { GetManagementInterfacesResponseBodySchema, managementService } from "@yoth.dev/services/management";
import { notifications } from "@mantine/notifications";

export default function Page({ params }: { params: { slug: string } }) {
    const uptimeSocketRef = useRef<WebSocket | null>(null);
    const trafficSocketRef = useRef<WebSocket | null>(null);
    const trapSocketRef = useRef<WebSocket | null>(null);

    const [dashboardInterfaces, setDashboardInterfaces] = useState<GetDashboardInterfacesResponseBodySchema | undefined>();
    const getInterfaces = useCallback(async (agentHost: string) => {
        if (!agentHost) return;

        try {
            const response = await dashboardService.getInterfaces(agentHost);
            if (response.data) {
                setDashboardInterfaces(response.data);
            }

        } catch (error: unknown) {
            if (error instanceof Error) console.error(error.message);
        }
    }, [])

    useEffect(() => {
        getInterfaces(params.slug);
    }, [params.slug, getInterfaces]);

    const [timeRange, setTimeRange] = useState<string>("5m");

    const [uptimeData, setUptimeData] = useState<UptimeResponseBodySchema[]>([]);
    useEffect(() => {
        if (!timeRange || !params.slug) return;

        if (uptimeSocketRef.current) {
            uptimeSocketRef.current.close();
        }

        const uptimeWebSocket = new WebSocket(`ws://127.0.0.1:8000/v1/dashboard/uptime?agent_host=${params.slug}&time_range=${timeRange}`);

        uptimeWebSocket.onopen = () => {
            console.log('Connected to uptime websocket');
        }

        uptimeWebSocket.onmessage = (event) => {
            const response: DefaultResponseBodySchema<UptimeResponseBodySchema[]> = JSON.parse(event.data);
            if (response.data) {
                const updatedData = response.data.map((item) => ({
                    time_at: new Date(item.time_at).toLocaleString(),
                    uptime: item.uptime / 1024,
                }));

                setUptimeData((prevData) => updatedData ? [...prevData, ...updatedData] : prevData);
            }
        }

        uptimeWebSocket.onclose = () => {
            console.log('Disconnected from uptime websocket');
        }

        uptimeSocketRef.current = uptimeWebSocket;

        return () => {
            uptimeWebSocket.close();
        }
    }, [timeRange, params.slug]);

    const [trafficData, setTrafficData] = useState<TrafficUsageResponseBodySchema[]>([]);
    useEffect(() => {
        if (!timeRange || !params.slug) return;

        if (trafficSocketRef.current) {
            trafficSocketRef.current.close();
        }

        const trafficUsageWebSocket = new WebSocket(`ws://127.0.0.1:8000/v1/dashboard/traffic/usage?agent_host=${params.slug}&time_range=${timeRange}`);

        trafficUsageWebSocket.onopen = () => {
            console.log('Connected to traffic usage websocket');
        }

        trafficUsageWebSocket.onmessage = (event) => {
            const response: DefaultResponseBodySchema<TrafficUsageResponseBodySchema[]> = JSON.parse(event.data);
            if (response.data) {
                const updatedData = response.data.map((item) => ({
                    time_at: new Date(item.time_at).toLocaleString(),
                    in: item.in / 1024,
                    out: item.out / 1024,
                }));

                setTrafficData((prevData) => updatedData ? [...prevData, ...updatedData] : prevData);
            }
        }

        trafficUsageWebSocket.onclose = () => {
            console.log('Disconnected from traffic usage websocket');
        }

        trafficSocketRef.current = trafficUsageWebSocket;

        return () => {
            trafficUsageWebSocket.close();
        }
    }, [timeRange, params.slug]);

    const onTimeRangeChage = (value: string) => {
        setUptimeData([]);
        setTrafficData([]);

        setTimeRange(value);
    }

    const [interfaceLoading, setInterfaceLoading] = useState<boolean>(false);
    const [managementInterfaces, setManagementInterfacesInterfaces] = useState<GetManagementInterfacesResponseBodySchema[] | undefined>();
    const getManagementInterfaces = useCallback(async () => {
        if (!params.slug) return;

        try {
            const response = await managementService.getInterfaces(params.slug);
            if (response.data) {
                setManagementInterfacesInterfaces(response.data);

            }

        } catch (error: unknown) {
            if (error instanceof Error) console.error(error.message);
        }
    }, []);

    useEffect(() => {
        getManagementInterfaces();
    }, [getManagementInterfaces]);

    const patchInterfaceByStatus = useCallback(async (interfaceIndex: number, interfaceStatus: "up" | "down") => {
        if (!params.slug) return;

        setInterfaceLoading(true);

        try {
            await managementService.patchInterface(params.slug, interfaceIndex, interfaceStatus);
            getManagementInterfaces();
            setManagementInterfacesInterfaces((prevData) => {
                const updateData = prevData?.map((inf) => {
                    if (Number(inf.interface_index) === interfaceIndex) {
                        return {
                            ...inf,
                            interface_admin_status: interfaceStatus === "up" ? "1" : "0",
                        }
                    }

                    return inf;
                });

                return updateData;
            });

            notifications.show({
                title: "สำเร็จ",
                autoClose: 3000,
                message: "ทำรายการเปลี่ยนสถานะอินเทอร์เฟซสำเร็จ",
                color: "green"
            });
            setInterfaceLoading(false);

        } catch (error: unknown) {
            if (error instanceof Error) console.error(error.message);
            setInterfaceLoading(false);
        }
    }, []);

    useEffect(() => {
        if (trapSocketRef.current) {
            trapSocketRef.current.close();
        }

        const trapWebSocket = new WebSocket(`ws://127.0.0.1:8000/v1/dashboard/traps?agent_host=${params.slug}`);

        trapWebSocket.onopen = () => {
            console.log('Connected to traffic usage websocket');
        }

        trapWebSocket.onmessage = (event) => {
            const response: DefaultResponseBodySchema<TrapInterfaceResponseBodySchema> = JSON.parse(event.data);
            if (response.data) {
                const interfaceName = response.data.interface_name;
                const interfaceStatus = response.data.interface_status;

                setManagementInterfacesInterfaces((prevData) => {
                    if (prevData) {
                        const updateData = prevData.map((item) => {
                            if (item.interface_name === interfaceName) {
                                return {
                                    ...item,
                                    interface_admin_status: interfaceStatus === "up" ? "1" : "0",
                                };
                            }
                            return item;
                        }).filter((item): item is GetManagementInterfacesResponseBodySchema => item !== undefined);

                        return updateData;
                    }

                    return prevData;
                });
            }

            console.log(response.data);
        }

        trapWebSocket.onclose = () => {
            console.log('Disconnected from traffic usage websocket');
        }

        trapSocketRef.current = trapWebSocket;

        return () => {
            trapWebSocket.close();
        }
    }, [notifications]);

    const managementInterfacesRows = managementInterfaces?.map((inf) => (
        <Table.Tr key={inf.interface_index}>
            <Table.Td>{inf.interface_name}</Table.Td>
            <Table.Td c={"gray.5"}>{(inf.interface_speed / (1024 * 1024 * 1024)).toLocaleString()} GB</Table.Td>
            <Table.Td c={"gray.5"}>{inf.interface_mtu} Bytes</Table.Td>
            <Table.Td>{inf.interface_admin_status == "1" ? (<Text fw={"bold"} c={"green.5"}>เปิดใช้งาน</Text>) : (<Text fw={"bold"} c={"red.5"}>ปิดใช้งาน</Text>)}</Table.Td>
            <Table.Td>
                {inf.interface_admin_status == "1" ? (
                    <Button
                        w={"auto"} size={"xs"} px={"xs"}
                        radius={"md"} color={"red"}
                        loading={interfaceLoading}
                        onClick={() => patchInterfaceByStatus(Number(inf.interface_index), "down")}
                    >
                        <Group gap={"xs"}>
                            <IconExclamationCircle size={16} />
                            <Text>ปิดใช้งาน</Text>
                        </Group>
                    </Button>
                ) : (
                    <Button
                        w={"auto"} size={"xs"} px={"xs"}
                        radius={"md"} color={"green"}
                        loading={interfaceLoading}
                        onClick={() => patchInterfaceByStatus(Number(inf.interface_index), "up")}
                    >
                        <Group gap={"xs"}>
                            <IconPlayerPlay size={16} />
                            <Text>เปิดใช้งาน</Text>
                        </Group>
                    </Button>
                )}
            </Table.Td>
        </Table.Tr>
    ));

    if (!dashboardInterfaces || !managementInterfaces) {
        return (
            <Container w={"100%"} h={"100%"} maw={"90rem"}>
                <LoadingScreen />
            </Container>
        );
    }

    return (
        <Container w={"100%"} h={"100%"} maw={"90rem"}>
            <ScrollArea
                w={"100%"} h={"100dvh"}
                offsetScrollbars
            >
                <Flex
                    w={"100%"} h={"100%"} p={"md"}
                    direction={"column"}
                    justify={"flex-start"}
                    align={"flex-start"}
                    wrap={"nowrap"}
                    gap={"md"}
                >
                    <Flex
                        w={"100%"} h={"auto"}
                        direction={"row"}
                        justify={"flex-start"}
                        align={"flex-start"}
                        wrap={"nowrap"}
                        gap={"md"}
                    >
                        <Select
                            label={
                                <Group gap={"xs"}>
                                    <IconTimeline size={24} color="#48c6ef" />
                                    <Text>เลือกช่วงเวลาการดูข้อมูล</Text>
                                </Group>
                            }
                            description="รายละเอียดช่วงเวลาการดูข้อมูลผ่านกราฟ"
                            placeholder="5m"
                            data={["1m", "5m", "15m", "1h", "3h", "6h", "12h", "24h", "2d", "7d", "30d"]}
                            onChange={(value) => onTimeRangeChage(value as string)}
                            defaultValue={"5m"}
                            allowDeselect
                            mt="md"
                            size="md"
                        />
                    </Flex>
                    <Flex
                        w={"100%"} h={"auto"}
                        direction={"row"}
                        justify={"center"}
                        align={"center"}
                        wrap={"nowrap"}
                        gap={"md"}
                    >
                        <Paper
                            w={"100%"}  h={"auto"}
                            withBorder p={"md"} radius={"md"}
                            shadow={"xs"}
                        >
                            <Flex
                                w={"100%"} h={"auto"}
                                direction={"column"}
                                gap={"xl"}
                            >
                                <Stack gap={0}>
                                    <Group gap={"xs"}>
                                        <IconTimeline size={36} />
                                        <Text fw={"bold"} fz={"h3"}>เวลาการทำงาน (Uptime)</Text>
                                    </Group>
                                    <Text fz={"h4"} c={"gray.6"}>แสดงช่วงเวลาการทำงานของระบบเครือข่ายผ่านกราฟ</Text>
                                </Stack>
                                <AreaChart
                                    h={300}
                                    data={uptimeData}
                                    dataKey="time_at"
                                    series={[{ name: 'uptime', color: 'blue.5' }]}
                                    curveType="natural"
                                    connectNulls={false}
                                    tickLine="none"
                                    gridAxis="none"
                                />
                            </Flex>
                        </Paper>
                        <Paper
                            w={"100%"}  h={"auto"}
                            withBorder p={"md"} radius={"md"}
                            shadow={"xs"}
                        >
                            <Flex
                                w={"100%"} h={"auto"}
                                direction={"column"}
                                gap={"xl"}
                            >
                                <Stack gap={0}>
                                    <Group gap={"xs"}>
                                        <IconRoad size={36} />
                                        <Text fw={"bold"} fz={"h3"}>ทราฟฟิคการใช้งาน (Traffic Usage)</Text>
                                    </Group>
                                    <Text fz={"h4"} c={"gray.6"}>แสดงปริมาณการใช้งานทราฟฟิคในระบบเครืิอข่ายผ่านกราฟ</Text>
                                </Stack>
                                <AreaChart
                                    h={300}
                                    data={trafficData}
                                    dataKey="time_at"
                                    series={[
                                        { name: 'in', color: 'blue.5' },
                                        { name: 'out', color: 'red.5' },
                                    ]}
                                    curveType="natural"
                                    tickLine="none"
                                    gridAxis="none"
                                />
                            </Flex>
                        </Paper>
                    </Flex>
                    <Grid
                        w={"100%"} h={"auto"}
                        justify={"flex-start"}
                        align={"flex-start"}
                        gutter={"md"}
                    >
                        <Grid.Col span={4}>
                            <Paper w={"100%"} h={"auto"} withBorder p={"md"} radius={"md"} shadow={"xs"}>
                                <Stack>
                                    <Stack gap={0}>
                                        <Group gap={"xs"}>
                                            <IconCloudComputing size={26} />
                                            <Text fw={"bold"} fz={"h4"}>จำนวนอินเทอร์เฟซ</Text>
                                        </Group>
                                        <Text fz={"h5"} c={"gray.6"}>แสดงจำนวนอินเทอร์เฟซทั้งหมดที่มีบนอุปกรณ์</Text>
                                    </Stack>
                                    <Flex
                                        w={"100%"} h={"100%"}
                                        justify={"center"} align={"center"}
                                        wrap={"nowrap"}
                                    >
                                        <Text fw={"bold"} fz={"4rem"}>
                                            <NumberTicker value={dashboardInterfaces.number_of_interfaces} />
                                        </Text>
                                    </Flex>
                                </Stack>
                            </Paper>
                        </Grid.Col>
                        <Grid.Col span={4}>
                            <Paper w={"100%"} h={"auto"} withBorder p={"md"} radius={"md"} shadow={"xs"}>
                                <Stack>
                                    <Stack gap={0}>
                                        <Group gap={"xs"}>
                                            <IconWorldUpload size={26} />
                                            <Text fw={"bold"} fz={"h4"}>จำนวนอินเทอร์เฟซที่เปิดใช้งาน</Text>
                                        </Group>
                                        <Text fz={"h5"} c={"gray.6"}>แสดงจำนวนอินเทอร์เฟซทั้งหมดที่ถูกเปิดการใช้งาน</Text>
                                    </Stack>
                                    <Flex
                                        w={"100%"} h={"100%"}
                                        justify={"center"} align={"center"}
                                        wrap={"nowrap"}
                                    >
                                        <Text fw={"bold"} fz={"4rem"} c={"teal.5"}>
                                            <NumberTicker value={dashboardInterfaces.number_of_interfaces_up === 0 ? NaN : dashboardInterfaces.number_of_interfaces_up} />
                                        </Text>
                                    </Flex>
                                </Stack>
                            </Paper>
                        </Grid.Col>
                        <Grid.Col span={4}>
                            <Paper w={"100%"} h={"auto"} withBorder p={"md"} radius={"md"} shadow={"xs"}>
                                <Stack>
                                    <Stack gap={0}>
                                        <Group gap={"xs"}>
                                            <IconAlertCircle size={26} />
                                            <Text fw={"bold"} fz={"h4"}>จำนวนอินเทอร์เฟซที่ปิดใช้งาน</Text>
                                        </Group>
                                        <Text fz={"h5"} c={"gray.6"}>แสดงจำนวนอินเทอร์เฟซทั้งหมดที่ถูก ปิดการใช้งาน</Text>
                                    </Stack>
                                    <Flex
                                        w={"100%"} h={"100%"}
                                        justify={"center"} align={"center"}
                                        wrap={"nowrap"}
                                    >
                                        <Text fw={"bold"} fz={"4rem"}>
                                            <NumberTicker value={dashboardInterfaces.number_of_interfaces_down === 0 ? NaN : dashboardInterfaces.number_of_interfaces_down} />
                                        </Text>
                                    </Flex>
                                </Stack>
                            </Paper>
                        </Grid.Col>
                    </Grid>
                    <Table striped withTableBorder>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>ชื่ออินเทอร์เฟซ</Table.Th>
                                <Table.Th>ความเร็ว</Table.Th>
                                <Table.Th>ขนาดข้อมูลสูงสุด</Table.Th>
                                <Table.Th>สถานะ</Table.Th>
                                <Table.Th>คำสั่งต่ออินเทอร์เฟซ</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {managementInterfacesRows}
                        </Table.Tbody>
                    </Table>
                </Flex>
            </ScrollArea>
        </Container>
    )
}
