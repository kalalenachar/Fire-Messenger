import React, { useState, useEffect } from "react";
import { ViewIcon, EditIcon, CheckIcon } from "@chakra-ui/icons";
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
  IconButton,
  Text,
  Avatar,
  Box,
  Input,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { ChatState } from "../../Context/ChatProvider";

const ProfileModal = ({ user: targetUser, children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { user: currentUser, updateUserProfile } = ChatState();
  const toast = useToast();

  const isMe = currentUser?._id === targetUser?._id;

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(targetUser?.name || "");
  const [status, setStatus] = useState(targetUser?.status || "");
  const [pic, setPic] = useState(targetUser?.pic || "");

  useEffect(() => {
    setName(targetUser?.name || "");
    setStatus(targetUser?.status || "");
    setPic(targetUser?.pic || "");
  }, [targetUser, isOpen]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 250;
        const MAX_HEIGHT = 250;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const resizedBase64 = canvas.toDataURL("image/jpeg", 0.85);
        setPic(resizedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    if (!name.trim()) {
      toast({
        title: "Name cannot be empty",
        status: "warning",
        duration: 3000,
        position: "bottom",
      });
      return;
    }

    updateUserProfile({
      name: name.trim(),
      status: status.trim() || "🔥 Fire Messenger",
      pic,
    });

    setIsEditing(false);
    toast({
      title: "Profile Updated! 🔥",
      status: "success",
      duration: 3000,
      position: "bottom",
    });
  };

  return (
    <>
      {children ? (
        <span onClick={onOpen}>{children}</span>
      ) : (
        <IconButton
          icon={<ViewIcon />}
          onClick={onOpen}
          variant="ghost"
          size="sm"
          color="var(--text-secondary)"
        />
      )}

      <Modal size="md" onClose={onClose} isOpen={isOpen} isCentered>
        <ModalOverlay />
        <ModalContent bg="var(--bg-card)" color="var(--text-primary)" borderRadius="xl" border="1px solid var(--color-border)" boxShadow="var(--shadow-md)">
          <ModalHeader textAlign="center" fontSize="2xl" fontWeight="bold" pt={6} display="flex" alignItems="center" justifyContent="center" gap={2}>
            {isMe ? "My Profile" : targetUser?.name || "User Profile"}
            {isMe && !isEditing && (
              <IconButton
                icon={<EditIcon />}
                size="xs"
                variant="ghost"
                color="var(--color-primary)"
                onClick={() => setIsEditing(true)}
              />
            )}
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody display="flex" flexDirection="column" alignItems="center" py={4} gap={4}>
            <Avatar size="2xl" name={isEditing ? name : targetUser?.name} src={isEditing ? pic : targetUser?.pic} border="3px solid var(--color-primary)" />

            {isMe && isEditing && (
              <Box>
                <Text fontSize="xs" color="var(--text-secondary)" mb={1} textAlign="center">
                  Upload New Avatar Photo
                </Text>
                <Input type="file" accept="image/*" size="xs" onChange={handleImageUpload} color="var(--text-secondary)" />
              </Box>
            )}

            {isMe && isEditing ? (
              <VStack spacing={3} w="100%" px={4}>
                <Box w="100%">
                  <Text fontSize="xs" color="var(--color-primary)" fontWeight="bold" mb={1}>
                    DISPLAY NAME
                  </Text>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    bg="var(--bg-search)"
                    color="var(--text-primary)"
                    borderColor="var(--color-border)"
                  />
                </Box>
                <Box w="100%">
                  <Text fontSize="xs" color="var(--color-primary)" fontWeight="bold" mb={1}>
                    STATUS / ABOUT
                  </Text>
                  <Input
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    bg="var(--bg-search)"
                    color="var(--text-primary)"
                    borderColor="var(--color-border)"
                  />
                </Box>
              </VStack>
            ) : (
              <Box textAlign="center" w="100%">
                <Text fontSize="sm" color="var(--text-secondary)" mb={1}>
                  {targetUser?.email || "user@firemessenger.io"}
                </Text>

                <Box mt={3} p={3} bg="var(--bg-search)" borderRadius="lg" w="100%">
                  <Text fontSize="xs" color="var(--color-primary)" fontWeight="bold" textTransform="uppercase" mb={1}>
                    Status / About
                  </Text>
                  <Text fontSize="sm" color="var(--text-primary)">
                    {targetUser?.status || "🔥 Burning with Passion | Fire Messenger"}
                  </Text>
                </Box>

                {(targetUser?._id === "bot_fire_ai" || targetUser?.name?.includes("Fire Bot")) && (
                  <Box mt={3} p={3} bg="rgba(239, 68, 68, 0.1)" border="1px solid var(--color-primary)" borderRadius="lg" w="100%" textAlign="left">
                    <Text fontSize="xs" color="var(--color-primary)" fontWeight="bold" textTransform="uppercase" mb={1}>
                      ⚡ Groq AI Integration Active
                    </Text>
                    <Text fontSize="xs" color="var(--text-secondary)">
                      Model: <strong>openai/gpt-oss-120b & Groq Models</strong> (Groq API)
                    </Text>
                  </Box>
                )}
              </Box>
            )}
          </ModalBody>

          <ModalFooter borderTop="1px solid var(--color-border)" gap={2}>
            {isMe && isEditing ? (
              <>
                <Button variant="ghost" color="var(--text-secondary)" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button leftIcon={<CheckIcon />} bg="var(--color-primary)" color="white" _hover={{ bg: "var(--color-primary-hover)" }} onClick={handleSaveProfile}>
                  Save Profile
                </Button>
              </>
            ) : (
              <Button bg="var(--color-primary)" color="white" _hover={{ bg: "var(--color-primary-hover)" }} onClick={onClose}>
                Close
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ProfileModal;
