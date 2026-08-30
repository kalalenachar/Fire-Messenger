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
  InputGroup,
  InputLeftElement,
  Stack,
  Flex,
  Avatar,
  Text,
  Checkbox,
  Box,
  Badge,
  useToast,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import { ChatState } from "../../Context/ChatProvider";

const ForwardModal = ({ isOpen, onClose, messageToForward }) => {
  const { user, chats, forwardMessage } = ChatState();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChatIds, setSelectedChatIds] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const toast = useToast();

  const availableChats = (chats || []).filter((chat) => {
    const chatTitle = chat.isSavedMessages
      ? "Saved Messages"
      : chat.isGroupChat
      ? chat.chatName
      : chat.users?.find((u) => u._id !== user?._id)?.name || chat.chatName;

    return chatTitle?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const toggleSelectChat = (chatId) => {
    setSelectedChatIds((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]
    );
  };

  const handleSendForward = async () => {
    if (!messageToForward || selectedChatIds.length === 0) return;
    setIsSending(true);
    try {
      await forwardMessage(messageToForward, selectedChatIds);
      toast({
        title: `Forwarded to ${selectedChatIds.length} chat${selectedChatIds.length > 1 ? "s" : ""}`,
        status: "success",
        duration: 2500,
        isClosable: true,
      });
      setSelectedChatIds([]);
      setSearchTerm("");
      onClose();
    } catch (err) {
      toast({
        title: "Forwarding Failed",
        description: err.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay backdropFilter="blur(6px)" bg="rgba(0,0,0,0.65)" />
      <ModalContent bg="var(--bg-card)" color="var(--text-primary)" borderRadius="xl" border="1px solid var(--color-border)">
        <ModalHeader borderBottom="1px solid var(--color-border)" pb={3}>
          Forward Message ↗️
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody py={4}>
          {/* Message Preview Box */}
          {messageToForward && (
            <Box
              p={3}
              mb={3}
              borderRadius="lg"
              bg="var(--bg-search)"
              borderLeft="4px solid var(--color-primary)"
              fontSize="sm"
            >
              <Text fontWeight="600" color="var(--color-primary)" fontSize="xs" mb={0.5}>
                {messageToForward.sender?.name || "Sender"}
              </Text>
              <Text noOfLines={2} color="var(--text-primary)">
                {messageToForward.type === "voice"
                  ? "🎤 Voice Note"
                  : messageToForward.type === "image"
                  ? "📷 Photo"
                  : messageToForward.type === "video"
                  ? "🎥 Video"
                  : messageToForward.type === "file"
                  ? `📄 ${messageToForward.fileName || "File"}`
                  : messageToForward.content}
              </Text>
            </Box>
          )}

          {/* Search bar */}
          <InputGroup mb={3}>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="var(--text-secondary)" />
            </InputLeftElement>
            <Input
              placeholder="Search chats or contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              bg="var(--bg-search)"
              borderColor="var(--color-border)"
              _focus={{ borderColor: "var(--color-primary)" }}
            />
          </InputGroup>

          {/* Chat List */}
          <Stack spacing={1.5} maxH="260px" overflowY="auto" pr={1}>
            {availableChats.length === 0 ? (
              <Text textAlign="center" py={6} color="var(--text-secondary)" fontSize="sm">
                No chats found
              </Text>
            ) : (
              availableChats.map((chat) => {
                const isSelected = selectedChatIds.includes(chat._id);
                const title = chat.isSavedMessages
                  ? "Saved Messages"
                  : chat.isGroupChat
                  ? chat.chatName
                  : chat.users?.find((u) => u._id !== user?._id)?.name || chat.chatName;

                const avatar = chat.isGroupChat
                  ? chat.groupPic || chat.pic || null
                  : chat.users?.find((u) => u._id !== user?._id)?.pic || chat.pic || null;

                return (
                  <Flex
                    key={chat._id}
                    p={2.5}
                    borderRadius="lg"
                    align="center"
                    justify="space-between"
                    bg={isSelected ? "var(--bg-hover)" : "transparent"}
                    _hover={{ bg: "var(--bg-hover)" }}
                    cursor="pointer"
                    onClick={() => toggleSelectChat(chat._id)}
                  >
                    <Flex align="center" gap={3}>
                      {chat.isSavedMessages ? (
                        <Box
                          w="36px"
                          h="36px"
                          borderRadius="50%"
                          bg="linear-gradient(135deg, #2AABEE, #229ED9)"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          fontSize="16px"
                        >
                          🔖
                        </Box>
                      ) : (
                        <Avatar size="sm" name={title} src={avatar} />
                      )}
                      <Box>
                        <Text fontWeight="600" fontSize="sm">
                          {title}
                        </Text>
                        {chat.isGroupChat && (
                          <Badge colorScheme="purple" fontSize="9px">
                            Group
                          </Badge>
                        )}
                      </Box>
                    </Flex>
                    <Checkbox
                      isChecked={isSelected}
                      colorScheme="teal"
                      pointerEvents="none"
                    />
                  </Flex>
                );
              })
            )}
          </Stack>
        </ModalBody>

        <ModalFooter borderTop="1px solid var(--color-border)">
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="teal"
            bg="var(--color-primary)"
            _hover={{ bg: "var(--color-primary-hover)" }}
            isDisabled={selectedChatIds.length === 0}
            isLoading={isSending}
            onClick={handleSendForward}
          >
            Send ({selectedChatIds.length})
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ForwardModal;
