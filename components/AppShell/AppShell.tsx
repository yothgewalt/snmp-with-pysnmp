"use client";

import classes from "./AppShell.module.css";

import { useRouter } from "next/navigation";

import { useCallback, useEffect, useState } from "react";

import { Group, Code, Select, Text, Stack } from "@mantine/core";

import { IconFlagQuestion } from "@tabler/icons-react";

import { universalService } from "@yoth.dev/services/universal";
import { $agentHost } from "@yoth.dev/contexts/nanostores";

export default function AppShell() {
    const router = useRouter();

    const [agentHosts, setAgentHosts] = useState<string[]>([]);

    const onAgentHostChange = (value: string) => {
        $agentHost.set(value);
        router.push(`/${value}`);
    }

    const getAgentHosts = useCallback(async () => {
        try {
            const response = await universalService.getAgentHosts();
            if (response.data) setAgentHosts(response.data.agent_hosts);

        } catch (error: unknown) {
            if (error instanceof Error) console.error(error.message);
        }
    }, []);

    useEffect(() => {
        getAgentHosts();

        if (!$agentHost.get()) {
            router.push(`/`);
        }

    }, [getAgentHosts]);

    return (
        <nav className={classes.navbar}>
            <div className={classes.navbarMain}>
                <Group className={classes.header} justify="space-between">
                    SNMP Example
                    <Code fw={700}>v1.0.0</Code>
                </Group>
                <Stack mb={"xl"}>
                    <Select
                        label={
                            <Group gap={"xs"}>
                                <IconFlagQuestion size={24} color="#facc15" />
                                <Text>เลือกอุปกรณ์เครือข่าย</Text>
                            </Group>
                        }
                        description="เลือกอุปกรณ์เครือข่ายที่ต้องการดูข้อมูล"
                        placeholder="ไอพีแอดเดรส"
                        data={agentHosts}
                        defaultValue={agentHosts[0]}
                        onChange={(value) => onAgentHostChange(value as string)}
                        allowDeselect
                        mt="md"
                        size="md"
                    />
                </Stack>
            </div>
        </nav>
    );
}
