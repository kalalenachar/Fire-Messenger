import React, { useEffect } from "react";
import {
  Box,
  Container,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
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
        {/* Agni Messenger Header Card */}
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          p={{ base: 4, md: 6 }}
          bg="var(--bg-card)"
          w="100%"
          mb={4}
          borderRadius="xl"
          boxShadow="var(--shadow-md)"
          border="1px solid var(--color-border)"
        >
          <Box
            w="64px"
            h="64px"
            borderRadius="50%"
            bg="linear-gradient(135deg, #00a884, #075e54)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="32px"
            boxShadow="0 4px 12px rgba(0, 168, 132, 0.4)"
            mb={3}
          >
            🔥
          </Box>
          <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="800" color="var(--text-primary)" letterSpacing="-0.5px">
            Agni Messenger
          </Text>
          <Text fontSize="sm" color="var(--color-primary)" fontWeight="600" mt={1}>
            Fast & Secure Real-Time Messaging
          </Text>
        </Box>

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
