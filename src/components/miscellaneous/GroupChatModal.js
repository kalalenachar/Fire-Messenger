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
  Text,
} from "@chakra-ui/react";
import { ChatState } from "../../Context/ChatProvider";
import UserBadgeItem from "../userAvatar/UserBadgeItem";
import UserListItem from "../userAvatar/UserListItem";
import { getRegisteredUsers } from "../../data/fireStorage";

const GroupChatModal = ({ children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [groupChatName, setGroupChatName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const toast = useToast();

  const { user, addOrSelectChat } = ChatState();

  const handleSearch = (query) => {
    setSearch(query);
    if (!query.trim()) {
      setSearchResult([]);
      return;
    }
    const allUsers = getRegisteredUsers();
    const results = allUsers.filter(
      (u) =>
        u._id !== user?._id &&
        (u.name.toLowerCase().includes(query.toLowerCase()) ||
          u.email.toLowerCase().includes(query.toLowerCase()))
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

    if (selectedUsers.length < 1) {
      toast({
        title: "Please select at least 1 member for the group",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
      return;
    }

    const newGroupChat = {
      _id: `group_${Date.now()}`,
      chatName: groupChatName.trim(),
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

    addOrSelectChat(newGroupChat);
    onClose();
    setGroupChatName("");
    setSelectedUsers([]);
    setSearchResult([]);
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
        <ModalContent bg="var(--bg-card)" color="var(--text-primary)" borderRadius="xl" border="1px solid var(--color-border)">
          <ModalHeader textAlign="center" fontSize="xl" fontWeight="bold">
            Create Fire Group Chat 🔥
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody display="flex" flexDirection="column" gap={3}>
            <FormControl>
              <Text fontSize="xs" fontWeight="bold" color="var(--color-primary)" mb={1}>GROUP NAME</Text>
              <Input
                placeholder="e.g. Core Tech Team"
                value={groupChatName}
                onChange={(e) => setGroupChatName(e.target.value)}
                bg="var(--bg-search)"
                borderColor="var(--color-border)"
                color="var(--text-primary)"
              />
            </FormControl>

            <FormControl>
              <Text fontSize="xs" fontWeight="bold" color="var(--color-primary)" mb={1}>ADD REGISTERED MEMBERS</Text>
              <Input
                placeholder="Search registered user name..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                bg="var(--bg-search)"
                borderColor="var(--color-border)"
                color="var(--text-primary)"
              />
            </FormControl>

            <Box display="flex" flexWrap="wrap" gap={1}>
              {selectedUsers.map((u) => (
                <UserBadgeItem key={u._id} user={u} handleFunction={() => handleDelete(u)} />
              ))}
            </Box>

            {searchResult.slice(0, 4).map((u) => (
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
