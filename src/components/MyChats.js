import React, { useState } from "react";
import { Box, Stack, Text, Badge, Flex } from "@chakra-ui/layout";
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
import ReportModal from "./miscellaneous/ReportModal";
import VerifiedBadge from "./common/VerifiedBadge";

const MyChats = () => {
  const {
    selectedChat,
    setSelectedChat,
    user,
    chats,
    messagesMap,
    activeFilter,
    setActiveFilter,
    setIsStatusComposerOpen,
    setIsAudienceModalOpen,
    folders,
    isFolderModalOpen,
    setIsFolderModalOpen,
    toggleChatFolder,
    togglePinChat,
    isChatPinned,
    hideChat,
    unhideChat,
    isChatHidden,
    blockUser,
    unblockUser,
    isUserBlocked,
    draftsMap,
  } = ChatState();
  const [searchTerm, setSearchTerm] = useState("");
  const [reportTarget, setReportTarget] = useState(null);

  const defaultCategories = ["All", "Status", "Personal", "Groups", "Starred", "Channels", "Bots"];

  // Filter chats by active category/folder & search term
  const filteredChats = (chats || []).filter((chat) => {
    const isHidden = isChatHidden?.(chat._id);
    if (isHidden && !searchTerm.trim()) {
      return false; // Hide from standard stream unless explicitly searching
    }

    const activeCustomFolder = folders?.find((f) => f.id === activeFilter);
    let matchesCategory = false;

    if (!activeCustomFolder) {
      if (activeFilter === "Starred") {
        const msgs = messagesMap[chat._id] || [];
        matchesCategory = msgs.some((m) => Array.isArray(m.isStarredBy) && m.isStarredBy.includes(user?._id));
      } else {
        matchesCategory =
          activeFilter === "All" ||
          (activeFilter === "Groups" && chat.isGroupChat && !chat.isChannel) ||
          (activeFilter === "Channels" && chat.isChannel) ||
          (activeFilter === "Bots" && chat.category === "Bots") ||
          (activeFilter === "Personal" && (!chat.isGroupChat || chat.isSavedMessages) && chat.category !== "Bots");
      }
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

    const chatName = chat.isSavedMessages
      ? "Saved Messages"
      : chat.isGroupChat
      ? chat.chatName
      : chat.users?.find((u) => u._id !== user?._id)?.name || chat.chatName;

    const matchesSearch = chatName?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  // Sort chats so pinned chats stay at top
  const sortedChats = [...filteredChats].sort((a, b) => {
    const pinnedA = isChatPinned?.(a._id);
    const pinnedB = isChatPinned?.(b._id);
    if (pinnedA && !pinnedB) return -1;
    if (!pinnedA && pinnedB) return 1;
    const timeA = new Date(a.latestMessage?.createdAt || 0).getTime();
    const timeB = new Date(b.latestMessage?.createdAt || 0).getTime();
    return timeB - timeA;
  });

  const getChatAvatar = (chat) => {
    if (chat.isGroupChat) {
      return "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80";
    }
    const otherUser = chat.users?.find((u) => u._id !== user?._id);
    return otherUser?.pic || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
  };

  const getChatTitle = (chat) => {
    if (chat.isSavedMessages) return "Saved Messages";
    if (chat.isGroupChat) return chat.chatName;
    const otherUser = chat.users?.find((u) => u._id !== user?._id);
    return otherUser?.name || chat.chatName;
  };

  const renderAvatar = (chat, title) => {
    if (chat.isSavedMessages || chat._id?.startsWith("chat_saved_")) {
      return (
        <Box
          w="48px"
          h="48px"
          borderRadius="50%"
          bg="linear-gradient(135deg, #2AABEE, #229ED9)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="22px"
          boxShadow="0 2px 8px rgba(42, 171, 238, 0.4)"
          color="white"
          flexShrink={0}
        >
          🔖
        </Box>
      );
    }
    const avatar = getChatAvatar(chat);
    return (
      <Box position="relative" flexShrink={0}>
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
    );
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
              {cat === "Starred" ? "⭐ Starred" : cat}
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
          {sortedChats.length > 0 ? (
            <Stack spacing={1}>
              {sortedChats.map((chat) => {
                const isSelected = selectedChat?._id === chat._id;
                const title = getChatTitle(chat);
                const isPinned = isChatPinned?.(chat._id);
                const otherUser = !chat.isGroupChat ? chat.users?.find((u) => u._id !== user?._id) : null;
                const chatDraft = draftsMap?.[chat._id];

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
                    {/* Avatar & Online Indicator */}
                    {renderAvatar(chat, title)}

                    {/* Chat Info */}
                    <Box flex="1" overflow="hidden">
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Box display="flex" alignItems="center" gap={1} flex="1" overflow="hidden" pr={1}>
                          <Text fontWeight="600" fontSize="sm" color="var(--text-primary)" isTruncated>
                            {title}
                          </Text>
                          {otherUser && <VerifiedBadge user={otherUser} size="xs" />}
                          {isPinned && (
                            <Text fontSize="xs" title="Pinned Chat" opacity={0.85}>
                              📌
                            </Text>
                          )}
                          {chat.disappearingTimer > 0 && (
                            <Text fontSize="xs" title="Disappearing Messages" opacity={0.85}>
                              ⏳
                            </Text>
                          )}
                          {isChatHidden?.(chat._id) && (
                            <Badge colorScheme="purple" fontSize="9px" px={1.5} borderRadius="4px">
                              👁️ Hidden
                            </Badge>
                          )}
                        </Box>
                        {chat.latestMessage?.createdAt && (
                          <Text
                            fontSize="11px"
                            color={chat.unread > 0 ? "var(--color-primary)" : "var(--text-secondary)"}
                            fontWeight={chat.unread > 0 ? "bold" : "normal"}
                            whiteSpace="nowrap"
                          >
                            {formatTime(chat.latestMessage.createdAt)}
                          </Text>
                        )}
                      </Box>

                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        {chatDraft ? (
                          <Text fontSize="xs" color="#38bdf8" isTruncated pr={2}>
                            <span style={{ fontWeight: "700" }}>Draft: </span>
                            {chatDraft}
                          </Text>
                        ) : (
                          <Text fontSize="xs" color="var(--text-secondary)" isTruncated pr={2}>
                            {chat.latestMessage?.sender?.name && !chat.isSavedMessages ? `${chat.latestMessage.sender.name}: ` : ""}
                            {chat.latestMessage?.content || "No messages yet"}
                          </Text>
                        )}

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

                          {/* Quick Options Menu */}
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
                                color="var(--text-primary)"
                                _hover={{ bg: "var(--bg-hover)" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePinChat?.(chat._id);
                                }}
                              >
                                {isChatHidden?.(chat._id) ? "📌 Pin & Unhide Chat" : isPinned ? "📌 Unpin Chat" : "📌 Pin Chat"}
                              </MenuItem>

                              {isChatHidden?.(chat._id) ? (
                                <MenuItem
                                  bg="transparent"
                                  fontSize="xs"
                                  fontWeight="bold"
                                  color="var(--text-primary)"
                                  _hover={{ bg: "var(--bg-hover)" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    unhideChat?.(chat._id);
                                  }}
                                >
                                  👁️ Unhide Chat
                                </MenuItem>
                              ) : (
                                <MenuItem
                                  bg="transparent"
                                  fontSize="xs"
                                  fontWeight="bold"
                                  color="var(--text-primary)"
                                  _hover={{ bg: "var(--bg-hover)" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    hideChat?.(chat._id);
                                  }}
                                >
                                  🙈 Hide Chat
                                </MenuItem>
                              )}

                              {!chat.isGroupChat && !chat.isSavedMessages && (() => {
                                const otherUser = chat.users?.find((u) => u._id !== user?._id);
                                if (!otherUser) return null;
                                const isBlocked = isUserBlocked?.(otherUser._id);
                                return (
                                  <MenuItem
                                    key="block-option"
                                    bg="transparent"
                                    fontSize="xs"
                                    fontWeight="bold"
                                    color={isBlocked ? "#38bdf8" : "#f44336"}
                                    _hover={{ bg: "var(--bg-hover)" }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isBlocked) {
                                        unblockUser?.(otherUser._id);
                                      } else {
                                        blockUser?.(otherUser._id);
                                      }
                                    }}
                                  >
                                    {isBlocked ? "🔓 Unblock User" : "🚫 Block User"}
                                  </MenuItem>
                                );
                              })()}

                              <MenuItem
                                bg="transparent"
                                fontSize="xs"
                                fontWeight="bold"
                                color="#ffb74d"
                                _hover={{ bg: "var(--bg-hover)" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReportTarget(chat);
                                }}
                              >
                                ⚠️ Report Chat
                              </MenuItem>

                              {folders && folders.length > 0 && (
                                <>
                                  <MenuDivider borderColor="var(--color-border)" />
                                  <Box px={3} py={1} fontSize="10px" fontWeight="bold" color="var(--text-secondary)" textTransform="uppercase">
                                    Add to Folder
                                  </Box>
                                  {folders.map((f) => {
                                    const isAdded = f.includedChatIds?.includes(chat._id);
                                    return (
                                      <MenuItem
                                        key={f.id}
                                        bg="transparent"
                                        fontSize="xs"
                                        color="var(--text-primary)"
                                        _hover={{ bg: "var(--bg-hover)" }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleChatFolder?.(f.id, chat._id);
                                        }}
                                      >
                                        <Flex align="center" justify="space-between" w="100%">
                                          <Flex align="center" gap={1.5}>
                                            <span>{f.icon || "📁"}</span>
                                            <span>{f.name}</span>
                                          </Flex>
                                          {isAdded && <span style={{ color: "var(--color-primary)" }}>✓</span>}
                                        </Flex>
                                      </MenuItem>
                                    );
                                  })}
                                </>
                              )}
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
            <Flex direction="column" align="center" justify="center" h="200px" color="var(--text-muted)">
              <Text fontSize="2xl" mb={1}>
                {activeFilter === "Starred" ? "⭐" : "💬"}
              </Text>
              <Text fontSize="sm" fontWeight="600">
                {activeFilter === "Starred" ? "No starred messages found" : "No chats in this folder"}
              </Text>
            </Flex>
          )}
        </Box>
      )}

      {/* Folder Settings Modal */}
      <FolderSettingsModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={Boolean(reportTarget)}
        onClose={() => setReportTarget(null)}
        targetObj={reportTarget}
      />
    </Box>
  );
};

export default MyChats;
