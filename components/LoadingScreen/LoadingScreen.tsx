import { Flex, Loader } from "@mantine/core";

export default function LoadingScreen() {
    return (
        <Flex
            w={"100%"} h={"100%"}
            direction={"column"}
            justify={"center"} align={"center"}
            className="overflow-hidden"
        >
            <Loader color="blue" size={"xl"} type="bars" />
        </Flex>
    );
}
