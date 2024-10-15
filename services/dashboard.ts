import axiosQuery from "@yoth.dev/utilities/axios";
import type { DefaultResponseBodySchema } from "@yoth.dev/typings/response";

export interface GetDashboardInterfacesResponseBodySchema {
    number_of_interfaces: number;
    number_of_interfaces_up: number;
    number_of_interfaces_down: number;
}

export const dashboardService = {
    getInterfaces(agentHost: string): Promise<DefaultResponseBodySchema<GetDashboardInterfacesResponseBodySchema>> {
        return axiosQuery.get(`/v1/dashboard/interfaces?agent_host=${agentHost}`);
    }
};
