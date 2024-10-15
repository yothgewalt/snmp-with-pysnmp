import { InterfaceStatus } from "@yoth.dev/services/management";

export type TimeRange = "1m" | "5m" | "15m" | "1h" | "3h" | "6h" | "12h" | "24h" | "2d" | "7d" | "30d";

export interface TrafficUsageResponseBodySchema {
    time_at: string;
    in: number;
    out: number;
}

export interface UptimeResponseBodySchema {
    time_at: string;
    uptime: number;
}

export interface TrapInterfaceResponseBodySchema {
    interface_name: string;
    interface_index: number;
    interface_status: InterfaceStatus;
}
