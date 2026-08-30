import React, { useState } from "react";
import { Button } from "@chakra-ui/button";
import { useDisclosure } from "@chakra-ui/hooks";
import { Input } from "@chakra-ui/input";
import { Box, Flex, Text } from "@chakra-ui/layout";
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
import { SearchIcon, BellIcon, MoonIcon, SunIcon } from "@chakra-ui/icons";
import { Avatar } from "@chakra-ui/avatar";
import { useHistory, useLocation } from "react-router-dom";
import NotificationBadge from "react-notification-badge";
import { Effect } from "react-notification-badge";
import ProfileModal from "./ProfileModal";
import GroupChatModal from "./GroupChatModal";
import UserListItem from "../userAvatar/UserListItem";
import StatusComposerModal from "./StatusComposerModal";
import AudienceProfileModal from "./AudienceProfileModal";
import VerifiedBadge from "../common/VerifiedBadge";
import StatusViewerModal from "./StatusViewerModal";
import { ChatState } from "../../Context/ChatProvider";
import { searchUsersAsync, clearCurrentSession } from "../../data/fireStorage";

function SideDrawer() {
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);

  const {
    setSelectedChat,
    user,
    setUser,
    notification,
    setNotification,
    chats,
    addOrSelectChat,
    theme,
    toggleTheme,
    setActiveFilter,
    isStatusComposerOpen,
    setIsStatusComposerOpen,
    isAudienceModalOpen,
    setIsAudienceModalOpen,
    activeStatusUser,
    setActiveStatusUser,
    setIsFolderModalOpen,
    openSavedMessages,
    isSoundEnabled,
    toggleSound,
  } = ChatState();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const history = useHistory();
  const location = useLocation();

  const isAdminPath = location.pathname.startsWith("/admin");
  const emailLower = (user?.email || "").toLowerCase();
  const isSuperAdmin =
    user?.isAdmin ||
    emailLower === "kalalenachar@gmail.com" ||
    emailLower.includes("alex@");

  const logoutHandler = () => {
    clearCurrentSession();
    setUser(null);
    history.push("/");
  };

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    const results = await searchUsersAsync(search, user?._id);
    setSearchResult(results);
    setLoading(false);
  };

  const accessChat = (targetUser) => {
    if (!targetUser) return;
    const targetUserId = typeof targetUser === "object" ? targetUser._id : targetUser;

    const existingChat = chats.find(
      (c) => !c.isGroupChat && c.users.some((u) => u._id === targetUserId)
    );

    if (existingChat) {
      setSelectedChat(existingChat);
    } else {
      const targetObj = typeof targetUser === "object" ? targetUser : { _id: targetUserId, name: "User" };
      const newChat = {
        _id: `chat_${user._id}_${targetUserId}`,
        chatName: targetObj.name,
        isGroupChat: false,
        users: [user, targetObj],
        latestMessage: { content: "Started a new conversation 🔥", createdAt: new Date().toISOString() },
        unread: 0,
        category: "Personal",
      };
      addOrSelectChat(newChat);
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
        px={{ base: 2.5, sm: 4 }}
        py={{ base: 1.5, sm: 2.5 }}
        borderBottom="1px solid var(--color-border)"
        color="var(--text-header)"
        boxShadow="var(--shadow-sm)"
        position="relative"
        zIndex="1000"
        flexShrink={0}
      >
        {/* Agni Messenger Logo & Brand */}
        <Box display="flex" alignItems="center" gap={{ base: 2, sm: 3 }} flexShrink={0}>
          <Box
            w={{ base: "32px", sm: "38px" }}
            h={{ base: "32px", sm: "38px" }}
            borderRadius="50%"
            bg="linear-gradient(135deg, #00a884, #075e54)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize={{ base: "18px", sm: "22px" }}
            boxShadow="0 2px 8px rgba(0,0,0,0.3)"
            flexShrink={0}
          >
            🔥
          </Box>
          <Box display={{ base: "none", md: "block" }}>
            <Text fontWeight="bold" fontSize="lg" lineHeight="1.1" color="var(--text-header)">
              Agni Messenger
            </Text>
            <Text fontSize="xs" color={theme === "light" ? "#e0f2fe" : "var(--color-primary)"} fontWeight="500">
              Agni Real-Time Edition
            </Text>
          </Box>
        </Box>

        {/* Action Controls */}
        <Box display="flex" alignItems="center" gap={{ base: 1, sm: 2 }} flexShrink={0}>
          {/* Header Portal Switcher Toggle (Chat Portal vs Admin Portal) */}
          {isSuperAdmin && (
            <Flex
              align="center"
              bg="rgba(0, 0, 0, 0.25)"
              p="3px"
              borderRadius="full"
              border="1px solid rgba(255, 255, 255, 0.2)"
              boxShadow="0 2px 8px rgba(0,0,0,0.15)"
              mr={{ base: 1, sm: 2 }}
            >
              <Button
                size="xs"
                borderRadius="full"
                px={{ base: 2.5, sm: 3.5 }}
                py={1.5}
                fontWeight="700"
                fontSize="xs"
                bg={!isAdminPath ? "var(--color-primary)" : "transparent"}
                color={!isAdminPath ? "#ffffff" : "var(--text-header)"}
                opacity={!isAdminPath ? 1 : 0.8}
                _hover={{ opacity: 1, bg: !isAdminPath ? "var(--color-primary-hover)" : "rgba(255,255,255,0.12)" }}
                onClick={() => history.push("/chats")}
                transition="all 0.2s ease"
              >
                💬 Chat Portal
              </Button>
              <Button
                size="xs"
                borderRadius="full"
                px={{ base: 2.5, sm: 3.5 }}
                py={1.5}
                fontWeight="700"
                fontSize="xs"
                bg={isAdminPath ? "#805ad5" : "transparent"}
                color={isAdminPath ? "#ffffff" : "var(--text-header)"}
                opacity={isAdminPath ? 1 : 0.8}
                _hover={{ opacity: 1, bg: isAdminPath ? "#6b46c1" : "rgba(255,255,255,0.12)" }}
                onClick={() => history.push("/admin")}
                transition="all 0.2s ease"
              >
                ⚡ Admin Portal
              </Button>
            </Flex>
          )}

          {/* Search Button */}
          <Tooltip label="Search Contacts" placement="bottom">
            <Button
              size="sm"
              variant="ghost"
              color="var(--text-header)"
              _hover={{ bg: "rgba(255,255,255,0.15)" }}
              onClick={onOpen}
              leftIcon={<SearchIcon color="var(--text-header)" />}
              fontWeight="600"
              px={{ base: 2, md: 3 }}
              minW="auto"
            >
              <Box as="span" display={{ base: "none", md: "inline" }}>
                Search Contacts
              </Box>
            </Button>
          </Tooltip>

          {/* Status / Stories Button */}
          <Tooltip label="Status & Stories" placement="bottom">
            <Button
              size="sm"
              variant="ghost"
              color="var(--text-header)"
              _hover={{ bg: "rgba(255,255,255,0.15)" }}
              onClick={() => setActiveFilter("Status")}
              fontWeight="600"
              px={{ base: 2, md: 3 }}
              minW="auto"
            >
              <Box as="span" display={{ base: "none", md: "inline" }}>
                Status 🔥
              </Box>
              <Box as="span" display={{ base: "inline", md: "none" }}>
                🔥
              </Box>
            </Button>
          </Tooltip>

          {/* Saved Messages Quick Shortcut */}
          <Tooltip label="Open Saved Messages" placement="bottom">
            <Button
              size="sm"
              variant="ghost"
              color="var(--text-header)"
              _hover={{ bg: "rgba(255,255,255,0.15)" }}
              onClick={() => {
                if (location.pathname !== "/chats") {
                  history.push("/chats");
                }
                openSavedMessages();
              }}
              fontWeight="600"
              px={{ base: 2, md: 3 }}
              minW="auto"
            >
              <Box as="span" display={{ base: "none", md: "inline" }}>
                Saved Messages 🔖
              </Box>
              <Box as="span" display={{ base: "inline", md: "none" }}>
                🔖
              </Box>
            </Button>
          </Tooltip>

          {/* Dark / Light Theme Switcher */}
          <Tooltip label={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`} placement="bottom">
            <Button
              size="sm"
              variant="ghost"
              color="var(--text-header)"
              _hover={{ bg: "rgba(255,255,255,0.15)" }}
              onClick={toggleTheme}
              px={{ base: 1.5, sm: 2 }}
              minW="auto"
            >
              {theme === "dark" ? <SunIcon color="#ffb74d" fontSize="18px" /> : <MoonIcon color="#ffffff" fontSize="18px" />}
            </Button>
          </Tooltip>

          {/* Sound Effects Toggle */}
          <Tooltip label={`Sound Effects: ${isSoundEnabled ? "On" : "Muted"}`} placement="bottom">
            <Button
              size="sm"
              variant="ghost"
              color="var(--text-header)"
              _hover={{ bg: "rgba(255,255,255,0.15)" }}
              onClick={toggleSound}
              px={{ base: 1.5, sm: 2 }}
              minW="auto"
            >
              <span style={{ fontSize: "16px" }}>{isSoundEnabled ? "🔔" : "🔕"}</span>
            </Button>
          </Tooltip>

          {/* Notifications */}
          <Menu>
            <MenuButton p={1}>
              <NotificationBadge count={notification.length} effect={Effect.SCALE} />
              <BellIcon fontSize="xl" m={1} color="var(--text-header)" />
            </MenuButton>
            <MenuList color="var(--text-primary)" bg="var(--bg-menu)" borderColor="var(--color-border)" boxShadow="var(--shadow-md)" zIndex="2000">
              {!notification.length && <MenuItem bg="transparent" color="var(--text-secondary)">No New Notifications</MenuItem>}
              {notification.map((notif, idx) => {
                const targetChat =
                  typeof notif.chatObj === "object" && notif.chatObj
                    ? notif.chatObj
                    : chats.find((c) => c._id === (notif.chat?._id || notif.chat));
                const title = targetChat
                  ? targetChat.isGroupChat
                    ? targetChat.chatName
                    : targetChat.users?.find((u) => u._id !== user?._id)?.name || targetChat.chatName
                  : "Chat";

                return (
                  <MenuItem
                    key={idx}
                    bg="transparent"
                    _hover={{ bg: "var(--bg-hover)" }}
                    color="var(--text-primary)"
                    onClick={() => {
                      if (targetChat) {
                        setSelectedChat(targetChat);
                      }
                      setNotification(notification.filter((n) => n !== notif));
                    }}
                  >
                    New message from {title}
                  </MenuItem>
                );
              })}
            </MenuList>
          </Menu>

          {/* Profile & Settings Menu */}
          <Menu>
            <MenuButton as={Button} bg="transparent" p={0} _hover={{ bg: "transparent" }}>
              <Avatar size="sm" cursor="pointer" name={user?.name} src={user?.pic} border="2px solid var(--text-header)" />
            </MenuButton>
            <MenuList color="var(--text-primary)" bg="var(--bg-menu)" borderColor="var(--color-border)" boxShadow="var(--shadow-md)" zIndex="2000">
              <ProfileModal user={user}>
                <MenuItem bg="transparent" color="var(--text-primary)" _hover={{ bg: "var(--bg-hover)" }}>
                  <Box display="flex" alignItems="center" w="100%">
                    <Text>My Profile</Text>
                    <VerifiedBadge user={user} size="xs" />
                  </Box>
                </MenuItem>
              </ProfileModal>
              <MenuDivider borderColor="var(--color-border)" />
              <MenuItem bg="transparent" color="var(--text-primary)" _hover={{ bg: "var(--bg-hover)" }} onClick={openSavedMessages}>
                Saved Messages 🔖
              </MenuItem>
              <MenuDivider borderColor="var(--color-border)" />
              <GroupChatModal>
                <MenuItem bg="transparent" color="var(--text-primary)" _hover={{ bg: "var(--bg-hover)" }}>Create Group Chat</MenuItem>
              </GroupChatModal>
              <MenuDivider borderColor="var(--color-border)" />
              <MenuItem bg="transparent" color="var(--text-primary)" _hover={{ bg: "var(--bg-hover)" }} onClick={() => setIsFolderModalOpen(true)}>
                Folder Settings 📁
              </MenuItem>
              <MenuDivider borderColor="var(--color-border)" />
              <MenuItem bg="transparent" color="#f44336" fontWeight="bold" _hover={{ bg: "var(--bg-hover)" }} onClick={logoutHandler}>
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
            <SearchIcon color="var(--color-primary)" /> Search Registered Contacts
          </DrawerHeader>
          <DrawerBody>
            <Box display="flex" pb={2} gap={2} mt={2}>
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  handleSearch();
                }}
                bg="var(--bg-search)"
                borderColor="var(--color-border)"
                color="var(--text-primary)"
              />
              <Button bg="var(--color-primary)" color="white" _hover={{ bg: "var(--color-primary-hover)" }} onClick={handleSearch}>
                Find
              </Button>
            </Box>

            {loading ? (
              <Text mt={4} color="var(--text-secondary)">Searching database...</Text>
            ) : searchResult.length === 0 && search.trim() ? (
              <Text mt={4} color="var(--text-muted)" fontSize="sm">No contact matching "{search}" found.</Text>
            ) : (
              searchResult?.map((u) => (
                <UserListItem key={u._id} user={u} handleFunction={() => accessChat(u)} />
              ))
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Global Status Modals */}
      <StatusComposerModal
        isOpen={isStatusComposerOpen}
        onClose={() => setIsStatusComposerOpen(false)}
        onOpenAudienceManager={() => setIsAudienceModalOpen(true)}
      />

      <AudienceProfileModal
        isOpen={isAudienceModalOpen}
        onClose={() => setIsAudienceModalOpen(false)}
      />

      <StatusViewerModal
        isOpen={Boolean(activeStatusUser)}
        onClose={() => setActiveStatusUser(null)}
        userStatusStack={activeStatusUser}
      />
    </>
  );
}

export default SideDrawer;
