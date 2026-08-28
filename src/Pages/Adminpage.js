import React, { useEffect } from "react";
import { Box, Button, Flex, Heading } from "@chakra-ui/react";
import { useHistory } from "react-router-dom";
import { ArrowBackIcon } from "@chakra-ui/icons";
import SideDrawer from "../components/miscellaneous/SideDrawer";
import AdminDashboard from "../components/admin/AdminDashboard";
import { ChatState } from "../Context/ChatProvider";
import { getCurrentSessionUser } from "../data/fireStorage";

const Adminpage = () => {
  const history = useHistory();
  const { user, setUser } = ChatState();

  useEffect(() => {
    const activeUser = user || getCurrentSessionUser();
    if (!activeUser) {
      history.push("/");
    } else {
      const emailLower = (activeUser.email || "").toLowerCase();
      const isSuperAdmin =
        activeUser.isAdmin ||
        emailLower === "kalalenachar@gmail.com" ||
        emailLower.includes("alex@");

      if (!isSuperAdmin) {
        history.push("/chats");
      } else if (!activeUser.isAdmin) {
        const updatedAdminUser = { ...activeUser, isAdmin: true };
        setUser(updatedAdminUser);
        try {
          localStorage.setItem("userInfo", JSON.stringify(updatedAdminUser));
        } catch (e) {}
      }
    }
  }, [user, setUser, history]);

  const activeUser = user || getCurrentSessionUser();
  const emailLower = (activeUser?.email || "").toLowerCase();
  const isSuperAdmin =
    activeUser?.isAdmin ||
    emailLower === "kalalenachar@gmail.com" ||
    emailLower.includes("alex@");

  if (!activeUser || !isSuperAdmin) return null;

  return (
    <Box w="100vw" h="100dvh" maxH="100vh" display="flex" flexDirection="column" bg="var(--bg-app)" overflow="hidden">
      {/* Top Messenger Navigation Drawer Header */}
      <SideDrawer />

      {/* Admin Header Sub-bar */}
      <Flex
        bg="var(--bg-header)"
        px={{ base: 3, md: 6 }}
        py={2}
        borderBottom="1px solid var(--color-border)"
        alignItems="center"
        justifyContent="space-between"
      >
        <Button
          leftIcon={<ArrowBackIcon />}
          size="sm"
          variant="ghost"
          color="var(--text-header)"
          _hover={{ bg: "rgba(255,255,255,0.15)" }}
          onClick={() => history.push("/chats")}
        >
          Back to Messenger
        </Button>

        <Heading size="xs" textTransform="uppercase" letterSpacing="wider" color="var(--text-header)">
          Agni Messenger Operations Control
        </Heading>
      </Flex>

      {/* Main Admin Dashboard Content Area */}
      <Box flex="1" overflowY="auto" p={{ base: 2, md: 4 }}>
        <AdminDashboard />
      </Box>
    </Box>
  );
};

export default Adminpage;
