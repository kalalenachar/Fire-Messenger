import React, { useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Input,
  Box,
  Text,
  Stack,
  Checkbox,
  IconButton,
  Avatar,
  Divider,
} from "@chakra-ui/react";
import { DeleteIcon, EditIcon, AddIcon, CheckIcon } from "@chakra-ui/icons";
import { ChatState } from "../../Context/ChatProvider";

const EMOJI_OPTIONS = ["💼", "👤", "🚀", "📢", "💬", "🤖", "🔒", "🔥", "⭐", "📚", "🎨", "⚽"];

const FolderSettingsModal = ({ isOpen, onClose }) => {
  const { user, chats, folders, createFolder, updateFolder, deleteFolder } = ChatState();

  const [editingFolderId, setEditingFolderId] = useState(null); // null = list view or creating new
  const [folderName, setFolderName] = useState("");
  const [folderIcon, setFolderIcon] = useState("📁");
  const [selectedChatIds, setSelectedChatIds] = useState([]);
  const [rules, setRules] = useState({
    groups: false,
    channels: false,
    bots: false,
    unreadOnly: false,
  });

  const resetForm = () => {
    setEditingFolderId(null);
    setFolderName("");
    setFolderIcon("📁");
    setSelectedChatIds([]);
    setRules({ groups: false, channels: false, bots: false, unreadOnly: false });
  };

  const handleStartCreate = () => {
    resetForm();
    setEditingFolderId("NEW");
  };

  const handleStartEdit = (folder) => {
    setEditingFolderId(folder.id);
    setFolderName(folder.name);
    setFolderIcon(folder.icon || "📁");
    setSelectedChatIds(folder.includedChatIds || []);
    setRules(folder.rules || { groups: false, channels: false, bots: false, unreadOnly: false });
  };

  const applyPreset = (presetType) => {
    if (presetType === "Work") {
      setFolderName("Work");
      setFolderIcon("💼");
      setRules({ groups: true, channels: false, bots: false, unreadOnly: false });
    } else if (presetType === "Personal") {
      setFolderName("Personal");
      setFolderIcon("👤");
      setRules({ groups: false, channels: false, bots: false, unreadOnly: false });
    } else if (presetType === "Unread") {
      setFolderName("Unread");
      setFolderIcon("🔔");
      setRules({ groups: false, channels: false, bots: false, unreadOnly: true });
    }
  };

  const handleSave = async () => {
    if (!folderName.trim()) return;

    const payload = {
      name: folderName.trim(),
      icon: folderIcon,
      includedChatIds: selectedChatIds,
      rules,
    };

    if (editingFolderId === "NEW") {
      await createFolder(payload);
    } else if (editingFolderId) {
      await updateFolder(editingFolderId, payload);
    }

    resetForm();
  };

  const handleDelete = async (folderId) => {
    await deleteFolder(folderId);
    if (editingFolderId === folderId) {
      resetForm();
    }
  };

  const toggleChatSelection = (chatId) => {
    setSelectedChatIds((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]
    );
  };

  const getChatTitle = (chat) => {
    if (chat.isGroupChat) return chat.chatName;
    const otherUser = chat.users?.find((u) => u._id !== user?._id);
    return otherUser?.name || chat.chatName;
  };

  const getChatAvatar = (chat) => {
    if (chat.isGroupChat) {
      return "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80";
    }
    const otherUser = chat.users?.find((u) => u._id !== user?._id);
    return otherUser?.pic || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
      <ModalOverlay backdropFilter="blur(6px)" />
      <ModalContent bg="var(--bg-sidebar)" color="var(--text-primary)" borderRadius="16px" boxShadow="0 20px 40px rgba(0,0,0,0.5)">
        <ModalHeader borderBottom="1px solid var(--color-border)" display="flex" alignItems="center" gap={2}>
          <Text fontSize="xl">📁</Text>
          <Text fontWeight="bold">Chat Folders & Filters Settings</Text>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody py={4}>
          {editingFolderId ? (
            /* Create / Edit Form View */
            <Stack spacing={4}>
              {/* Presets Header */}
              {editingFolderId === "NEW" && (
                <Box bg="var(--bg-search)" p={3} borderRadius="12px" border="1px dashed var(--color-border)">
                  <Text fontSize="xs" fontWeight="bold" color="var(--text-secondary)" mb={2}>
                    QUICK PRESET TEMPLATES:
                  </Text>
                  <Box display="flex" gap={2}>
                    <Button size="xs" colorScheme="teal" variant="outline" onClick={() => applyPreset("Work")}>
                      💼 Work Preset
                    </Button>
                    <Button size="xs" colorScheme="purple" variant="outline" onClick={() => applyPreset("Personal")}>
                      👤 Personal Preset
                    </Button>
                    <Button size="xs" colorScheme="orange" variant="outline" onClick={() => applyPreset("Unread")}>
                      🔔 Unread Preset
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Folder Name & Icon Selector */}
              <Box>
                <Text fontSize="xs" fontWeight="bold" color="var(--text-secondary)" mb={1.5}>
                  FOLDER NAME & ICON
                </Text>
                <Box display="flex" gap={2}>
                  <Box position="relative" display="flex" alignItems="center" bg="var(--bg-search)" px={3} borderRadius="10px">
                    <Text fontSize="xl">{folderIcon}</Text>
                  </Box>
                  <Input
                    placeholder="Folder Name (e.g. Work, Favorites, Projects)"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    bg="var(--bg-search)"
                    border="1px solid var(--color-border)"
                    color="var(--text-primary)"
                    _focus={{ borderColor: "var(--color-primary)" }}
                  />
                </Box>

                {/* Emoji Pick List */}
                <Box display="flex" gap={1.5} mt={2.5} flexWrap="wrap">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <Box
                      key={emoji}
                      onClick={() => setFolderIcon(emoji)}
                      cursor="pointer"
                      p={1.5}
                      borderRadius="8px"
                      bg={folderIcon === emoji ? "var(--color-primary)" : "var(--bg-search)"}
                      _hover={{ bg: "var(--bg-hover)" }}
                      fontSize="md"
                      transition="all 0.15s"
                    >
                      {emoji}
                    </Box>
                  ))}
                </Box>
              </Box>

              <Divider borderColor="var(--color-border)" />

              {/* Included Category Rules */}
              <Box>
                <Text fontSize="xs" fontWeight="bold" color="var(--text-secondary)" mb={2}>
                  AUTOMATIC CHAT TYPE INCLUSION RULES
                </Text>
                <Stack spacing={2} bg="var(--bg-search)" p={3} borderRadius="12px">
                  <Checkbox
                    colorScheme="teal"
                    isChecked={rules.groups}
                    onChange={(e) => setRules({ ...rules, groups: e.target.checked })}
                  >
                    <Text fontSize="sm">Include all Group Chats 👥</Text>
                  </Checkbox>
                  <Checkbox
                    colorScheme="teal"
                    isChecked={rules.channels}
                    onChange={(e) => setRules({ ...rules, channels: e.target.checked })}
                  >
                    <Text fontSize="sm">Include Broadcast Channels 📢</Text>
                  </Checkbox>
                  <Checkbox
                    colorScheme="teal"
                    isChecked={rules.bots}
                    onChange={(e) => setRules({ ...rules, bots: e.target.checked })}
                  >
                    <Text fontSize="sm">Include Automated Bots 🤖</Text>
                  </Checkbox>
                  <Checkbox
                    colorScheme="teal"
                    isChecked={rules.unreadOnly}
                    onChange={(e) => setRules({ ...rules, unreadOnly: e.target.checked })}
                  >
                    <Text fontSize="sm">Filter Unread Messages Only 🔔</Text>
                  </Checkbox>
                </Stack>
              </Box>

              <Divider borderColor="var(--color-border)" />

              {/* Specific Included Chats Selection */}
              <Box>
                <Text fontSize="xs" fontWeight="bold" color="var(--text-secondary)" mb={2}>
                  ADD SPECIFIC CHATS ({selectedChatIds.length} Selected)
                </Text>
                <Box maxH="180px" overflowY="auto" pr={1} bg="var(--bg-search)" p={2} borderRadius="12px">
                  {chats?.map((chat) => {
                    const title = getChatTitle(chat);
                    const avatar = getChatAvatar(chat);
                    const isSelected = selectedChatIds.includes(chat._id);

                    return (
                      <Box
                        key={chat._id}
                        onClick={() => toggleChatSelection(chat._id)}
                        cursor="pointer"
                        p={2}
                        borderRadius="8px"
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        bg={isSelected ? "var(--bg-active)" : "transparent"}
                        _hover={{ bg: "var(--bg-hover)" }}
                        mb={1}
                      >
                        <Box display="flex" alignItems="center" gap={2.5}>
                          <Avatar size="xs" name={title} src={avatar} />
                          <Text fontSize="sm" fontWeight="500">
                            {title}
                          </Text>
                        </Box>
                        <Checkbox
                          colorScheme="teal"
                          isChecked={isSelected}
                          onChange={() => {}} // Handled by container click
                          pointerEvents="none"
                        />
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Stack>
          ) : (
            /* Folder List Overview View */
            <Stack spacing={3}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Text fontSize="xs" fontWeight="bold" color="var(--text-secondary)">
                  YOUR CUSTOM CHAT FOLDERS ({folders?.length || 0})
                </Text>
                <Button
                  size="sm"
                  bg="var(--color-primary)"
                  color="white"
                  leftIcon={<AddIcon fontSize="xs" />}
                  _hover={{ bg: "var(--color-primary-hover)" }}
                  onClick={handleStartCreate}
                >
                  Create Folder
                </Button>
              </Box>

              {(!folders || folders.length === 0) ? (
                <Box bg="var(--bg-search)" p={6} borderRadius="12px" textAlign="center">
                  <Text fontSize="3xl" mb={2}>📁</Text>
                  <Text fontWeight="600" mb={1}>No Custom Folders Yet</Text>
                  <Text fontSize="xs" color="var(--text-secondary)" mb={4}>
                    Organize your conversations by creating folders for Work, Personal, Study or Bots just like in Telegram.
                  </Text>
                  <Button
                    size="sm"
                    colorScheme="teal"
                    onClick={handleStartCreate}
                  >
                    + Create First Folder
                  </Button>
                </Box>
              ) : (
                <Stack spacing={2} maxH="320px" overflowY="auto">
                  {folders.map((folder) => {
                    const count = (folder.includedChatIds || []).length;
                    const activeRules = Object.keys(folder.rules || {}).filter((k) => folder.rules[k]);

                    return (
                      <Box
                        key={folder.id}
                        p={3}
                        borderRadius="12px"
                        bg="var(--bg-search)"
                        border="1px solid var(--color-border)"
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Box display="flex" alignItems="center" gap={3}>
                          <Box
                            w="40px"
                            h="40px"
                            borderRadius="10px"
                            bg="var(--bg-active)"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            fontSize="xl"
                          >
                            {folder.icon || "📁"}
                          </Box>
                          <Box>
                            <Text fontWeight="bold" fontSize="sm">
                              {folder.name}
                            </Text>
                            <Text fontSize="xs" color="var(--text-secondary)">
                              {count} Chats {activeRules.length > 0 ? `• Rules: ${activeRules.join(", ")}` : ""}
                            </Text>
                          </Box>
                        </Box>

                        <Box display="flex" gap={1}>
                          <IconButton
                            size="sm"
                            icon={<EditIcon />}
                            aria-label="Edit Folder"
                            variant="ghost"
                            color="var(--text-secondary)"
                            _hover={{ bg: "var(--bg-hover)", color: "var(--color-primary)" }}
                            onClick={() => handleStartEdit(folder)}
                          />
                          <IconButton
                            size="sm"
                            icon={<DeleteIcon />}
                            aria-label="Delete Folder"
                            variant="ghost"
                            color="#f44336"
                            _hover={{ bg: "var(--bg-hover)" }}
                            onClick={() => handleDelete(folder.id)}
                          />
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Stack>
          )}
        </ModalBody>

        <ModalFooter borderTop="1px solid var(--color-border)">
          {editingFolderId ? (
            <Box display="flex" justifyContent="space-between" w="100%">
              <Button variant="ghost" color="var(--text-secondary)" onClick={resetForm}>
                Back to Folders List
              </Button>
              <Button
                bg="var(--color-primary)"
                color="white"
                _hover={{ bg: "var(--color-primary-hover)" }}
                leftIcon={<CheckIcon />}
                onClick={handleSave}
              >
                Save Folder
              </Button>
            </Box>
          ) : (
            <Button colorScheme="teal" onClick={onClose}>
              Done
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default FolderSettingsModal;
