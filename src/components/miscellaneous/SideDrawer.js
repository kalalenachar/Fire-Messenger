import React, { useState } from "react";
import { Button } from "@chakra-ui/button";
import { useDisclosure } from "@chakra-ui/hooks";
import { Input } from "@chakra-ui/input";
import { Box, Text } from "@chakra-ui/layout";
import {
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
} from "@chakra-ui/menu";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
} from "@chakra-ui/modal";
import { Tooltip } from "@chakra-ui/tooltip";
import { SearchIcon, BellIcon, ChevronDownIcon, MoonIcon, SunIcon } from "@chakra-ui/icons";
import { Avatar } from "@chakra-ui/avatar";
import { useHistory } from "react-router-dom";
import NotificationBadge from "react-notification-badge";
import { Effect } from "react-notification-badge";
import ProfileModal from "./ProfileModal";
import GroupChatModal from "./GroupChatModal";
import UserListItem from "../userAvatar/UserListItem";
import { ChatState } from "../../Context/ChatProvider";

function SideDrawer() {
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);

  const {
    setSelectedChat,
    user,
    notification,
    setNotification,
    chats,
    setChats,
    theme,
    toggleTheme,
  } = ChatState();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const history = useHistory();

  const logoutHandler = () => {
    localStorage.removeItem("userInfo");
    history.push("/");
  };

  const handleSearch = () => {
    if (!search.trim()) return;
    setLoading(true);

    setTimeout(() => {
      const results = [
        {
          _id: "user_search_1",
          name: "David Miller",
          email: "david@firemessenger.io",
          pic: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
        },
        {
          _id: "user_search_2",
          name: "Jessica Chen",
          email: "jessica@firemessenger.io",
          pic: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
        },
      ].filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      );
      setSearchResult(results);
      setLoading(false);
    }, 400);
  };

  const accessChat = (userId) => {
    const targetUser = searchResult.find((u) => u._id === userId);
    if (!targetUser) return;

    const existingChat = chats.find(
      (c) => !c.isGroupChat && c.users.some((u) => u._id === userId)
    );

    if (existingChat) {
      setSelectedChat(existingChat);
    } else {
      const newChat = {
        _id: `chat_${Date.now()}`,
        chatName: targetUser.name,
        isGroupChat: false,
        users: [user, targetUser],
        latestMessage: { content: "Started a new conversation 🔥", createdAt: new Date().toISOString() },
        unread: 0,
        category: "Personal",
      };
      setChats([newChat, ...chats]);
      setSelectedChat(newChat);
    }
    onClose();
  };

  return (
    <>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        bg="var(--bg-header)"
        w="100%"
        px={4}
        py={2}
        borderBottom="1px solid var(--color-border)"
        color="var(--text-primary)"
      >
        {/* Fire Messenger Logo & Brand */}
        <Box display="flex" alignItems="center" gap={3}>
          <Box
            w="36px"
            h="36px"
            borderRadius="50%"
            bg="gradient(135deg, #00a884, #075e54)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="20px"
            boxShadow="0 2px 8px rgba(0,168,132,0.4)"
          >
            🔥
          </Box>
          <Box>
            <Text fontWeight="bold" fontSize="lg" lineHeight="1.1">
              Fire Messenger
            </Text>
            <Text fontSize="xs" color="var(--color-primary)" fontWeight="500">
              WhatsApp Emerald Edition
            </Text>
          </Box>
        </Box>

        {/* Action Controls */}
        <Box display="flex" alignItems="center" gap={2}>
          {/* Search Button */}
          <Tooltip label="Search Contacts" placement="bottom">
            <Button
              size="sm"
              variant="ghost"
              color="var(--text-primary)"
              _hover={{ bg: "var(--bg-hover)" }}
              onClick={onOpen}
              leftIcon={<SearchIcon color="var(--color-primary)" />}
            >
              Search
            </Button>
          </Tooltip>

          {/* Dark / Light Theme Switcher */}
          <Tooltip label={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`} placement="bottom">
            <Button
              size="sm"
              variant="ghost"
              color="var(--text-primary)"
              _hover={{ bg: "var(--bg-hover)" }}
              onClick={toggleTheme}
            >
              {theme === "dark" ? <SunIcon color="#ff9800" /> : <MoonIcon color="#00a884" />}
            </Button>
          </Tooltip>

          {/* Notifications */}
          <Menu>
            <MenuButton p={1}>
              <NotificationBadge count={notification.length} effect={Effect.SCALE} />
              <BellIcon fontSize="xl" m={1} color="var(--text-secondary)" />
            </MenuButton>
            <MenuList color="var(--text-primary)" bg="var(--bg-header)" borderColor="var(--color-border)">
              {!notification.length && <MenuItem bg="transparent">No New Notifications</MenuItem>}
              {notification.map((notif) => (
                <MenuItem
                  key={notif._id}
                  bg="transparent"
                  _hover={{ bg: "var(--bg-hover)" }}
                  onClick={() => {
                    setSelectedChat(notif.chat);
                    setNotification(notification.filter((n) => n !== notif));
                  }}
                >
                  New message in {notif.chat?.chatName || "Chat"}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>

          {/* Profile & Settings Menu */}
          <Menu>
            <MenuButton as={Button} bg="transparent" p={0} _hover={{ bg: "transparent" }}>
              <Avatar size="sm" cursor="pointer" name={user?.name} src={user?.pic} />
            </MenuButton>
            <MenuList color="var(--text-primary)" bg="var(--bg-header)" borderColor="var(--color-border)">
              <ProfileModal user={user}>
                <MenuItem bg="transparent" _hover={{ bg: "var(--bg-hover)" }}>My Profile</MenuItem>
              </ProfileModal>
              <MenuDivider />
              <GroupChatModal>
                <MenuItem bg="transparent" _hover={{ bg: "var(--bg-hover)" }}>Create Group Chat</MenuItem>
              </GroupChatModal>
              <MenuDivider />
              <MenuItem bg="transparent" color="#ff5252" _hover={{ bg: "var(--bg-hover)" }} onClick={logoutHandler}>
                Logout
              </MenuItem>
            </MenuList>
          </Menu>
        </Box>
      </Box>

      {/* Contacts Search Drawer */}
      <Drawer placement="left" onClose={onClose} isOpen={isOpen}>
        <DrawerOverlay />
        <DrawerContent bg="var(--bg-sidebar)" color="var(--text-primary)">
          <DrawerHeader borderBottomWidth="1px" borderColor="var(--color-border)" display="flex" alignItems="center" gap={2}>
            <SearchIcon color="var(--color-primary)" /> Search Fire Contacts
          </DrawerHeader>
          <DrawerBody>
            <Box display="flex" pb={2} gap={2} mt={2}>
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                bg="var(--bg-search)"
                borderColor="var(--color-border)"
                color="var(--text-primary)"
              />
              <Button bg="var(--color-primary)" color="white" _hover={{ bg: "var(--color-primary-hover)" }} onClick={handleSearch}>
                Find
              </Button>
            </Box>

            {loading ? (
              <Text mt={4} color="var(--text-secondary)">Searching contacts...</Text>
            ) : (
              searchResult?.map((u) => (
                <UserListItem key={u._id} user={u} handleFunction={() => accessChat(u._id)} />
              ))
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export default SideDrawer;
