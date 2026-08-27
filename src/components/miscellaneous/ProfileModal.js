import React from "react";
import { ViewIcon } from "@chakra-ui/icons";
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
} from "@chakra-ui/react";

const ProfileModal = ({ user, children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

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
        <ModalContent bg="var(--bg-header)" color="var(--text-primary)" borderRadius="xl" border="1px solid var(--color-border)">
          <ModalHeader textAlign="center" fontSize="2xl" fontWeight="bold" pt={6}>
            {user?.name || "User Profile"}
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody display="flex" flexDirection="column" alignItems="center" py={4} gap={4}>
            <Avatar size="2xl" name={user?.name} src={user?.pic} border="3px solid var(--color-primary)" />

            <Box textAlign="center" w="100%">
              <Text fontSize="sm" color="var(--text-secondary)" mb={1}>
                {user?.email || "user@firemessenger.io"}
              </Text>

              <Box mt={3} p={3} bg="var(--bg-search)" borderRadius="lg" w="100%">
                <Text fontSize="xs" color="var(--color-primary)" fontWeight="bold" textTransform="uppercase" mb={1}>
                  Status / About
                </Text>
                <Text fontSize="sm" color="var(--text-primary)">
                  {user?.status || "🔥 Burning with Passion | Fire Messenger"}
                </Text>
              </Box>
            </Box>
          </ModalBody>

          <ModalFooter borderTop="1px solid var(--color-border)">
            <Button bg="var(--color-primary)" color="white" _hover={{ bg: "var(--color-primary-hover)" }} onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ProfileModal;
