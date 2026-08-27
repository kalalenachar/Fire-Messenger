import React, { useState } from "react";
import { Box, Stack, Text, Badge } from "@chakra-ui/layout";
import {
  Avatar,
  Input,
  InputGroup,
  InputLeftElement,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Tooltip,
} from "@chakra-ui/react";
import { SearchIcon, SettingsIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { ChatState } from "../Context/ChatProvider";
import StatusSection from "./StatusSection";
import FolderSettingsModal from "./miscellaneous/FolderSettingsModal";

const MyChats = () => {
  const {
    selectedChat,
    setSelectedChat,
    user,
    chats,
    activeFilter,
    setActiveFilter,
    setIsStatusComposerOpen,
    setIsAudienceModalOpen,
    folders,
    isFolderModalOpen,
    setIsFolderModalOpen,
    toggleChatFolder,
  } = ChatState();
  const [searchTerm, setSearchTerm] = useState("");

  const defaultCategories = ["All", "Status", "Personal", "Groups", "Channels", "Bots"];

  // Filter chats by active category/folder & search term
  const filteredChats = (chats || []).filter((chat) => {
    const activeCustomFolder = folders?.find((f) => f.id === activeFilter);
    let matchesCategory = false;

    if (!activeCustomFolder) {
      matchesCategory =
        activeFilter === "All" ||
        (activeFilter === "Groups" && chat.isGroupChat && !chat.isChannel) ||
        (activeFilter === "Channels" && chat.isChannel) ||
        (activeFilter === "Bots" && chat.category === "Bots") ||
        (activeFilter === "Personal" && !chat.isGroupChat && chat.category !== "Bots");
    } else {
      const isIncludedById = activeCustomFolder.includedChatIds?.includes(chat._id);
      const rules = activeCustomFolder.rules || {};
      const matchesRuleGroup = rules.groups && chat.isGroupChat && !chat.isChannel;
      const matchesRuleChannel = rules.channels && chat.isChannel;
      const matchesRuleBot = rules.bots && chat.category === "Bots";
      const matchesRuleUnread = rules.unreadOnly && chat.unread > 0;
      matchesCategory = Boolean(
        isIncludedById || matchesRuleGroup || matchesRuleChannel || matchesRuleBot || matchesRuleUnread
      );
    }

    const chatName = chat.isGroupChat
      ? chat.chatName
      : chat.users?.find((u) => u._id !== user?._id)?.name || chat.chatName;

    const matchesSearch = chatName?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const getChatAvatar = (chat) => {
    if (chat.isGroupChat) {
      return "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80";
    }
    const otherUser = chat.users?.find((u) => u._id !== user?._id);
    return otherUser?.pic || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
  };

  const getChatTitle = (chat) => {
    if (chat.isGroupChat) return chat.chatName;
    const otherUser = chat.users?.find((u) => u._id !== user?._id);
    return otherUser?.name || chat.chatName;
  };

  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <Box
      w="100%"
      h="100%"
      bg="var(--bg-sidebar)"
      display="flex"
      flexDirection="column"
      borderRight="1px solid var(--color-border)"
    >
      {/* Search Input Bar */}
      <Box p={3} pb={2}>
        <InputGroup size="sm">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="var(--text-secondary)" />
          </InputLeftElement>
          <Input
            placeholder="Search or start new chat"
            borderRadius="18px"
            bg="var(--bg-search)"
            border="none"
            color="var(--text-primary)"
            _placeholder={{ color: "var(--text-secondary)" }}
            _focus={{ bg: "var(--bg-input)", boxShadow: "0 0 0 1px var(--color-primary)" }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
      </Box>

      {/* Folder Tabs & Category Pills Row */}
      <Box display="flex" alignItems="center" px={3} py={2} borderBottom="1px solid var(--color-border)" bg="rgba(0,0,0,0.1)">
        <Box display="flex" gap={1.5} flex="1" overflowX="auto" sx={{ scrollbarWidth: "none" }}>
          {/* Default Categories */}
          {defaultCategories.map((cat) => (
            <Box
              key={cat}
              onClick={() => setActiveFilter(cat)}
              cursor="pointer"
              px={3}
              py={1}
              borderRadius="14px"
              fontSize="xs"
              fontWeight="600"
              whiteSpace="nowrap"
              bg={activeFilter === cat ? "var(--color-primary)" : "var(--bg-search)"}
              color={activeFilter === cat ? "#ffffff" : "var(--text-secondary)"}
              _hover={{ bg: activeFilter === cat ? "var(--color-primary-hover)" : "var(--bg-hover)" }}
              transition="all 0.15s ease"
            >
              {cat}
            </Box>
          ))}

          {/* Custom Folders */}
          {folders?.map((folder) => {
            const isSelected = activeFilter === folder.id;
            return (
              <Box
                key={folder.id}
                onClick={() => setActiveFilter(folder.id)}
                cursor="pointer"
                px={3}
                py={1}
                borderRadius="14px"
                fontSize="xs"
                fontWeight="600"
                whiteSpace="nowrap"
                display="flex"
                alignItems="center"
                gap={1.5}
                bg={isSelected ? "var(--color-primary)" : "var(--bg-search)"}
                color={isSelected ? "#ffffff" : "var(--text-secondary)"}
                _hover={{ bg: isSelected ? "var(--color-primary-hover)" : "var(--bg-hover)" }}
                transition="all 0.15s ease"
              >
                <span>{folder.icon || "📁"}</span>
                <span>{folder.name}</span>
              </Box>
            );
          })}
        </Box>

        {/* Folder Settings Modal Launcher Button */}
        <Tooltip label="Folder Settings" placement="bottom">
          <IconButton
            size="xs"
            icon={<SettingsIcon />}
            aria-label="Folder Settings"
            variant="ghost"
            color="var(--text-secondary)"
            _hover={{ bg: "var(--bg-hover)", color: "var(--color-primary)" }}
            onClick={() => setIsFolderModalOpen(true)}
            ml={1}
          />
        </Tooltip>
      </Box>

      {/* Main Content Stream: Status Section or Chat List Stream */}
      {activeFilter === "Status" ? (
        <Box flex="1" overflow="hidden">
          <StatusSection
            onOpenComposer={() => setIsStatusComposerOpen(true)}
            onOpenAudienceManager={() => setIsAudienceModalOpen(true)}
          />
        </Box>
      ) : (
        <Box flex="1" overflowY="auto" px={2} py={1}>
          {filteredChats.length > 0 ? (
            <Stack spacing={1}>
              {filteredChats.map((chat) => {
                const isSelected = selectedChat?._id === chat._id;
                const title = getChatTitle(chat);
                const avatar = getChatAvatar(chat);

                return (
                  <Box
                    key={chat._id}
                    onClick={() => setSelectedChat(chat)}
                    cursor="pointer"
                    p={2.5}
                    borderRadius="10px"
                    bg={isSelected ? "var(--bg-active)" : "transparent"}
                    _hover={{
                      bg: isSelected ? "var(--bg-active)" : "var(--bg-hover)",
                      "& .chat-action-menu": { opacity: 1 },
                    }}
                    display="flex"
                    alignItems="center"
                    gap={3}
                    transition="background 0.15s ease"
                    position="relative"
                    role="group"
                  >
                    {/* Avatar & Online Dot */}
                    <Box position="relative">
                      <Avatar size="md" name={title} src={avatar} />
                      {!chat.isGroupChat && (
                        <Box
                          position="absolute"
                          bottom="0"
                          right="0"
                          w="12px"
                          h="12px"
                          borderRadius="50%"
                          bg="var(--color-online)"
                          border="2px solid var(--bg-sidebar)"
                        />
                      )}
                    </Box>

                    {/* Chat Info */}
                    <Box flex="1" overflow="hidden">
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Text fontWeight="600" fontSize="sm" color="var(--text-primary)" isTruncated>
                          {title}
                        </Text>
                        {chat.latestMessage?.createdAt && (
                          <Text
                            fontSize="11px"
                            color={chat.unread > 0 ? "var(--color-primary)" : "var(--text-secondary)"}
                            fontWeight={chat.unread > 0 ? "bold" : "normal"}
                          >
                            {formatTime(chat.latestMessage.createdAt)}
                          </Text>
                        )}
                      </Box>

                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Text fontSize="xs" color="var(--text-secondary)" isTruncated pr={2}>
                          {chat.latestMessage?.sender?.name ? `${chat.latestMessage.sender.name}: ` : ""}
                          {chat.latestMessage?.content || "No messages yet"}
                        </Text>

                        <Box display="flex" alignItems="center" gap={1.5}>
                          {chat.unread > 0 && (
                            <Badge
                              borderRadius="full"
                              bg="var(--color-primary)"
                              color="#ffffff"
                              fontSize="11px"
                              px={2}
                              py={0.5}
                            >
                              {chat.unread}
                            </Badge>
                          )}

                          {/* Quick 'Add to Folder' Options Menu */}
                          <Menu placement="right-start">
                            <MenuButton
                              className="chat-action-menu"
                              as={IconButton}
                              icon={<ChevronRightIcon boxSize={4} />}
                              size="xs"
                              variant="ghost"
                              opacity={0.3}
                              _hover={{ opacity: 1, bg: "var(--bg-hover)" }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <MenuList
                              bg="var(--bg-menu)"
                              borderColor="var(--color-border)"
                              boxShadow="var(--shadow-md)"
                              onClick={(e) => e.stopPropagation()}
                              zIndex="1500"
                            >
                              <MenuItem
                                bg="transparent"
                                fontSize="xs"
                                fontWeight="bold"
                                color="var(--text-secondary)"
                                _hover={{ bg: "transparent" }}
                                cursor="default"
                              >
                                ADD / REMOVE FOLDERS:
                              </MenuItem>
                              <MenuDivider borderColor="var(--color-border)" />

                              {(!folders || folders.length === 0) && (
                                <MenuItem
                                  bg="transparent"
                                  fontSize="xs"
                                  color="var(--text-muted)"
                                  onClick={() => setIsFolderModalOpen(true)}
                                >
                                  + Create a Chat Folder first
                                </MenuItem>
                              )}

                              {folders?.map((folder) => {
                                const isIncluded = folder.includedChatIds?.includes(chat._id);
                                return (
                                  <MenuItem
                                    key={folder.id}
                                    bg="transparent"
                                    _hover={{ bg: "var(--bg-hover)" }}
                                    fontSize="xs"
                                    color="var(--text-primary)"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleChatFolder(folder.id, chat._id);
                                    }}
                                  >
                                    <Box display="flex" alignItems="center" justifyContent="space-between" w="100%">
                                      <span>
                                        {folder.icon || "📁"} {folder.name}
                                      </span>
                                      {isIncluded && (
                                        <Badge bg="var(--color-primary)" color="white" fontSize="9px" px={1.5}>
                                          Included ✓
                                        </Badge>
                                      )}
                                    </Box>
                                  </MenuItem>
                                );
                              })}
                            </MenuList>
                          </Menu>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <Box p={6} textAlign="center" color="var(--text-secondary)">
              <Text fontSize="sm">No conversations match this folder/filter</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Global Folder Settings Modal */}
      <FolderSettingsModal isOpen={isFolderModalOpen} onClose={() => setIsFolderModalOpen(false)} />
    </Box>
  );
};

export default MyChats;
