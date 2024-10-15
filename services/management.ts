import axiosQuery from "@yoth.dev/utilities/axios";
import type { DefaultResponseBodySchema } from "@yoth.dev/typings/response";

export type InterfaceStatus = "up" | "down";

export interface GetManagementInterfacesResponseBodySchema {
    interface_name: string;
    interface_index: string;
    interface_mtu: number;
    interface_speed: number;
    interface_admin_status: string;
}

export const managementService = {
    getInterfaces(agentHost: string): Promise<DefaultResponseBodySchema<GetManagementInterfacesResponseBodySchema[]>> {
        return axiosQuery.get(`/v1/management/interfaces?agent_host=${agentHost}`);
    },
    patchInterface(agentHost: string, interfaceIndex: number, interfaceStatus: InterfaceStatus): Promise<DefaultResponseBodySchema<null>> {
        return axiosQuery.patch(`/v1/management/interfaces/${interfaceIndex}/${interfaceStatus}?agent_host=${agentHost}`);
    }
};
