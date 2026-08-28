import React, { useEffect } from "react";
import {
  Box,
  Container,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from "@chakra-ui/react";
import { useHistory } from "react-router-dom";
import Login from "../components/Authentication/Login";
import Signup from "../components/Authentication/Signup";
import { ChatState } from "../Context/ChatProvider";

function Homepage() {
  const history = useHistory();
  const { user } = ChatState();

  useEffect(() => {
    if (user) {
      history.push("/chats");
    }
  }, [user, history]);

  return (
    <Box
      minH="100dvh"
      w="100%"
      bg="var(--bg-app)"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      p={{ base: 3, md: 4 }}
      py={{ base: 6, md: 10 }}
    >
      <Container maxW="md" centerContent w="100%" my="auto">
        {/* Authentication Form Card */}
        <Box
          bg="var(--bg-card)"
          w="100%"
          p={{ base: 4, md: 6 }}
          borderRadius="xl"
          boxShadow="var(--shadow-md)"
          border="1px solid var(--color-border)"
          mb={{ base: 6, md: 0 }}
        >
          <Tabs isFitted variant="soft-rounded" colorScheme="green">
            <TabList mb="1.5em" bg="var(--bg-search)" p={1} borderRadius="lg">
              <Tab
                color="var(--text-secondary)"
                _selected={{ color: "white", bg: "var(--color-primary)", fontWeight: "bold" }}
                borderRadius="md"
              >
                Login
              </Tab>
              <Tab
                color="var(--text-secondary)"
                _selected={{ color: "white", bg: "var(--color-primary)", fontWeight: "bold" }}
                borderRadius="md"
              >
                Sign Up
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel p={0}>
                <Login />
              </TabPanel>
              <TabPanel p={0}>
                <Signup />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </Container>
    </Box>
  );
}

export default Homepage;
