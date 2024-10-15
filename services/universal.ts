import axiosQuery from "@yoth.dev/utilities/axios";
import type { DefaultResponseBodySchema } from "@yoth.dev/typings/response";

interface AgentHostsResponseBody {
    agent_hosts: string[];
}

export const universalService = {
    getAgentHosts(): Promise<DefaultResponseBodySchema<AgentHostsResponseBody>> {
        return axiosQuery.get("/v1/agent/hosts");
    }
}
