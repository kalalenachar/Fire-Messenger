import React from "react";
import { Box } from "@chakra-ui/layout";
import SideDrawer from "../components/miscellaneous/SideDrawer";
import MyChats from "../components/MyChats";
import SingleChat from "../components/SingleChat";
import { ChatState } from "../Context/ChatProvider";

const Chatpage = () => {
  const { user, selectedChat } = ChatState();

  return (
    <Box w="100vw" h="100vh" display="flex" flexDirection="column" bg="var(--bg-app)" overflow="hidden">
      {/* Top Header */}
      {user && <SideDrawer />}

      {/* Main Messenger Workspace Layout */}
      <Box flex="1" display="flex" w="100%" h="calc(100vh - 53px)" overflow="hidden">
        {/* Left Sidebar - Chat List */}
        <Box
          w={{ base: selectedChat ? "0%" : "100%", md: "360px", lg: "400px" }}
          display={{ base: selectedChat ? "none" : "flex", md: "flex" }}
          h="100%"
          flexShrink={0}
        >
          {user && <MyChats />}
        </Box>

        {/* Right Main Area - Active Conversation */}
        <Box
          flex="1"
          display={{ base: selectedChat ? "flex" : "none", md: "flex" }}
          h="100%"
        >
          {user && <SingleChat />}
        </Box>
      </Box>
    </Box>
  );
};

export default Chatpage;
