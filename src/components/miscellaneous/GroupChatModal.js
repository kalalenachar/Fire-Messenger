import React, { useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  useDisclosure,
  FormControl,
  Input,
  useToast,
  Box,
} from "@chakra-ui/react";
import { ChatState } from "../../Context/ChatProvider";
import UserBadgeItem from "../userAvatar/UserBadgeItem";
import UserListItem from "../userAvatar/UserListItem";

const GroupChatModal = ({ children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [groupChatName, setGroupChatName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const toast = useToast();

  const { user, chats, setChats, setSelectedChat } = ChatState();

  const sampleContacts = [
    { _id: "user_sarah", name: "Sarah Jenkins", pic: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" },
    { _id: "user_marcus", name: "Marcus Vance", pic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" },
    { _id: "user_elena", name: "Elena Rostova", pic: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80" },
  ];

  const handleSearch = (query) => {
    setSearch(query);
    if (!query.trim()) {
      setSearchResult([]);
      return;
    }
    const results = sampleContacts.filter((c) =>
      c.name.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResult(results);
  };

  const handleGroup = (userToAdd) => {
    if (selectedUsers.some((u) => u._id === userToAdd._id)) {
      toast({
        title: "User already added",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
      return;
    }
    setSelectedUsers([...selectedUsers, userToAdd]);
  };

  const handleDelete = (delUser) => {
    setSelectedUsers(selectedUsers.filter((sel) => sel._id !== delUser._id));
  };

  const handleSubmit = () => {
    if (!groupChatName.trim()) {
      toast({
        title: "Please enter a group name",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
      return;
    }

    const newGroupChat = {
      _id: `group_${Date.now()}`,
      chatName: groupChatName,
      isGroupChat: true,
      groupAdmin: user,
      users: [user, ...selectedUsers],
      latestMessage: {
        content: `Created group "${groupChatName}" 🔥`,
        sender: user,
        createdAt: new Date().toISOString(),
      },
      unread: 0,
      category: "Groups",
    };

    setChats([newGroupChat, ...chats]);
    setSelectedChat(newGroupChat);
    onClose();
    toast({
      title: "Fire Group Chat Created! 🔥",
      status: "success",
      duration: 3000,
      isClosable: true,
      position: "bottom",
    });
  };

  return (
    <>
      <span onClick={onOpen}>{children}</span>

      <Modal onClose={onClose} isOpen={isOpen} isCentered size="md">
        <ModalOverlay />
        <ModalContent bg="var(--bg-header)" color="var(--text-primary)" borderRadius="xl" border="1px solid var(--color-border)">
          <ModalHeader textAlign="center" fontSize="xl" fontWeight="bold">
            Create Fire Group Chat 🔥
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody display="flex" flexDirection="column" gap={3}>
            <FormControl>
              <Input
                placeholder="Group Name (e.g. Fire Developers)"
                value={groupChatName}
                onChange={(e) => setGroupChatName(e.target.value)}
                bg="var(--bg-search)"
                border="none"
                color="var(--text-primary)"
              />
            </FormControl>

            <FormControl>
              <Input
                placeholder="Add Members (e.g. Sarah, Marcus, Elena)"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                bg="var(--bg-search)"
                border="none"
                color="var(--text-primary)"
              />
            </FormControl>

            <Box display="flex" flexWrap="wrap" gap={1}>
              {selectedUsers.map((u) => (
                <UserBadgeItem key={u._id} user={u} handleFunction={() => handleDelete(u)} />
              ))}
            </Box>

            {searchResult.map((u) => (
              <UserListItem key={u._id} user={u} handleFunction={() => handleGroup(u)} />
            ))}
          </ModalBody>

          <ModalFooter borderTop="1px solid var(--color-border)">
            <Button bg="var(--color-primary)" color="white" _hover={{ bg: "var(--color-primary-hover)" }} onClick={handleSubmit}>
              Create Group
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default GroupChatModal;
