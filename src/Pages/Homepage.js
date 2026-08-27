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
import { defaultUsersList, setCurrentSessionUser } from "../data/fireStorage";
import { ChatState } from "../Context/ChatProvider";

function Homepage() {
  const history = useHistory();
  const { user, setUser } = ChatState();

  useEffect(() => {
    if (user) {
      history.push("/chats");
    }
  }, [user, history]);

  const handleGuestLogin = () => {
    const guestUser = defaultUsersList[0];
    setCurrentSessionUser(guestUser);
    setUser(guestUser);
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
            mb={2}
            boxShadow="0 4px 14px rgba(0,168,132,0.4)"
          >
            🔥
          </Box>
          <Text fontSize="3xl" fontWeight="800" color="var(--text-primary)" letterSpacing="-0.5px">
            Fire Messenger
          </Text>
          <Text fontSize="sm" color="var(--color-primary)" fontWeight="600" mt={1}>
            Fast & Secure Real-Time Messaging
          </Text>
        </Box>

        {/* Auth Box */}
        <Box bg="var(--bg-card)" w="100%" p={6} borderRadius="xl" boxShadow="var(--shadow-md)" border="1px solid var(--color-border)">
          <Tabs isFitted variant="soft-rounded">
            <TabList mb={4} bg="var(--bg-app)" p={1} borderRadius="lg">
              <Tab
                fontWeight="600"
                color="var(--text-secondary)"
                _selected={{ color: "white", bg: "var(--color-primary)" }}
                borderRadius="md"
              >
                Login
              </Tab>
              <Tab
                fontWeight="600"
                color="var(--text-secondary)"
                _selected={{ color: "white", bg: "var(--color-primary)" }}
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

          <Button
            mt={5}
            w="100%"
            variant="outline"
            borderColor="var(--color-primary)"
            color="var(--color-primary)"
            fontWeight="bold"
            _hover={{ bg: "var(--color-primary)", color: "white" }}
            onClick={handleGuestLogin}
            size="lg"
            borderRadius="lg"
          >
            🚀 Continue as Guest Demo User
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

export default Homepage;
