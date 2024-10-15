"use client";

import { Container, Flex, Stack, Text } from "@mantine/core";

import AnimatedGridPattern from "@yoth.dev/components/AnimatedGridPattern/AnimatedGridPattern";

import { useStore } from "@nanostores/react";
import { $agentHost } from "@yoth.dev/contexts/nanostores";

import { cn } from "@yoth.dev/libraries/classname";
import { useCallback, useEffect, useState } from "react";
import { dashboardService, GetDashboardInterfacesResponseBodySchema } from "@yoth.dev/services/dashboard";

export default function RootPage() {
    const agentHostStore = useStore($agentHost);

    const [interfaces, setInterfaces] = useState<GetDashboardInterfacesResponseBodySchema | undefined>();
    const getInterfaces = useCallback(async (agentHost: string) => {
        if (!agentHost) return;

        try {
            const response = await dashboardService.getInterfaces(agentHost);
            if (response.data) {
                setInterfaces(response.data);
            }

        } catch (error: unknown) {
            if (error instanceof Error) console.error(error.message);
        }
    }, [])

    useEffect(() => {
        if (agentHostStore) {
            getInterfaces(agentHostStore);
            console.log(interfaces?.number_of_interfaces)
        }

    }, [agentHostStore, getInterfaces]);

    return (
        <Container w={"100%"} h={"100%"} maw={"90rem"}>
            <Flex
                pos={"relative"}
                w={"100%"} h={"100%"}
                direction={"column"}
                justify={"center"} align={"center"}
                className="overflow-hidden"
            >
                <Stack justify="center" align="center" gap={0}>
                    <Text fw={"bold"} fz={48}>กรุณาเลือกอุปกรณ์ที่ต้องการตรวจสอบ</Text>
                    <Text fz={24} c={"gray.5"}>คุณต้องเลือกอุปกรณ์จากไอพีแอดเดรสทางด้านซ้ายบนที่บาร์</Text>
                </Stack>

                <AnimatedGridPattern
                    numSquares={30}
                    maxOpacity={0.2}
                    duration={1.5}
                    repeatDelay={1}
                    className={cn(
                        "[mask-image:radial-gradient(600px_circle_at_center,white,transparent)]",
                    )}
                />
            </Flex>
        </Container>
    );
}
