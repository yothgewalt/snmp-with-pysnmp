import { atom } from "nanostores";

export const $navigate = atom<string>("Management");
export const $agentHost = atom<string | undefined>();
