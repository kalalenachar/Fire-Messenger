import React, { useEffect } from "react";
import { Box } from "@chakra-ui/react";
import { useHistory } from "react-router-dom";
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
    <Box position="fixed" top={0} left={0} right={0} bottom={0} w="100vw" h="100dvh" display="flex" flexDirection="column" bg="var(--bg-app)" overflow="hidden">
      {/* Top Messenger Navigation Drawer Header */}
      <SideDrawer />

      {/* Main Admin Dashboard Content Area */}
      <Box flex="1" overflowY="auto" p={{ base: 2, md: 4 }}>
        <AdminDashboard />
      </Box>
    </Box>
  );
};

export default Adminpage;
