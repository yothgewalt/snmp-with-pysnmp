import "./globals.css";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

import { PropsWithChildren } from "react";

import type { Metadata } from "next";
import localFont from "next/font/local";

import { ColorSchemeScript, Flex, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

import AppShell from "@yoth.dev/components/AppShell/AppShell";

const lineSeedSans = localFont({
    src: [
        {
            path: "./fonts/LINESeedSansTH_W_Th.woff2",
            weight: "100",
            style: "normal",
        },
        {
            path: "./fonts/LINESeedSansTH_W_Rg.woff2",
            weight: "400",
            style: "normal",
        },
        {
            path: "./fonts/LINESeedSansTH_W_Bd.woff2",
            weight: "700",
            style: "normal",
        },
        {
            path: "./fonts/LINESeedSansTH_W_XBd.woff2",
            weight: "800",
            style: "normal",
        },
        {
            path: "./fonts/LINESeedSansTH_W_He.woff2",
            weight: "900",
            style: "normal",
        },
    ]
});

export const metadata: Metadata = {
    title: "Simple Network Management Protocol Sample",
    description: "SNMP (Simple Network Management Protocol) is used for monitoring and managing network devices. It involves an SNMP Manager, Agents on devices, and MIBs (Management Information Base) to retrieve or modify data. SNMP versions include SNMPv1, SNMPv2c, and SNMPv3 (most secure). It uses OIDs to identify data points. A typical SNMP command is snmpwalk, and devices send alerts called SNMP traps to notify managers of events like high CPU usage.",
};

export default async function RootLayout({ children }: Readonly<PropsWithChildren>) {
    return (
        <html lang="en">
            <head>
                <ColorSchemeScript />
            </head>
            <body className={`h-screen ${lineSeedSans.className} antialiased`}>
                <MantineProvider
                    defaultColorScheme="dark"
                    classNamesPrefix="next"
                >
                    <Notifications
                        position="top-right"
                        zIndex={1000}
                        limit={5}
                    />
                    <Flex w={"100%"} h={"100dvh"}>
                        <AppShell />
                        {children}
                    </Flex>
                </MantineProvider>
            </body>
        </html>
    );
}
