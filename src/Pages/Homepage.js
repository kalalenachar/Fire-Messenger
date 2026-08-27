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
  Button,
} from "@chakra-ui/react";
import { useHistory } from "react-router-dom";
import Login from "../components/Authentication/Login";
import Signup from "../components/Authentication/Signup";
import { defaultUser } from "../data/fireMockData";

function Homepage() {
  const history = useHistory();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userInfo"));
    if (user) history.push("/chats");
  }, [history]);

  const handleGuestLogin = () => {
    localStorage.setItem("userInfo", JSON.stringify(defaultUser));
    history.push("/chats");
  };

  return (
    <Box minH="100vh" w="100vw" bg="var(--bg-app)" display="flex" alignItems="center" justifyContent="center" p={4}>
      <Container maxW="md" centerContent>
        {/* Fire Messenger Header Card */}
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          p={6}
          bg="var(--bg-header)"
          w="100%"
          mb={4}
          borderRadius="xl"
          boxShadow="var(--shadow-md)"
          border="1px solid var(--color-border)"
        >
          <Box
            w="60px"
            h="60px"
            borderRadius="50%"
            bg="linear-gradient(135deg, #00a884, #075e54)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="32px"
            mb={2}
            boxShadow="0 4px 12px rgba(0,168,132,0.4)"
          >
            🔥
          </Box>
          <Text fontSize="3xl" fontWeight="bold" color="var(--text-primary)" letterSpacing="-0.5px">
            Fire Messenger
          </Text>
          <Text fontSize="sm" color="var(--color-primary)" fontWeight="600" mt={1}>
            Fast & Secure Real-Time Messaging
          </Text>
        </Box>

        {/* Auth Box */}
        <Box bg="var(--bg-header)" w="100%" p={6} borderRadius="xl" boxShadow="var(--shadow-md)" border="1px solid var(--color-border)">
          <Tabs isFitted variant="soft-rounded" colorScheme="teal">
            <TabList mb={4}>
              <Tab color="var(--text-secondary)" _selected={{ color: "white", bg: "var(--color-primary)" }}>Login</Tab>
              <Tab color="var(--text-secondary)" _selected={{ color: "white", bg: "var(--color-primary)" }}>Sign Up</Tab>
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

          <Button
            mt={4}
            w="100%"
            variant="outline"
            borderColor="var(--color-primary)"
            color="var(--color-primary)"
            _hover={{ bg: "var(--color-primary)", color: "white" }}
            onClick={handleGuestLogin}
          >
            🚀 Continue as Guest Demo User
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

export default Homepage;
