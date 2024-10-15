import { Container } from "@mantine/core";

import LoadingScreen from "@yoth.dev/components/LoadingScreen/LoadingScreen";

export default function RootLoadingPage() {
    return (
        <Container w={"100%"} h={"100%"} maw={"90rem"}>
            <LoadingScreen />
        </Container>
    );
}
