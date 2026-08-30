import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Textarea,
  Text,
  useToast,
} from "@chakra-ui/react";
import { ChatState } from "../../Context/ChatProvider";

const EditMessageModal = ({ isOpen, onClose, messageToEdit, chatId }) => {
  const { editMessage } = ChatState();
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (messageToEdit) {
      setContent(messageToEdit.content || "");
    }
  }, [messageToEdit, isOpen]);

  const handleSave = async () => {
    if (!content.trim() || !messageToEdit || !chatId) return;
    setIsSaving(true);
    try {
      await editMessage(chatId, messageToEdit._id, content.trim());
      toast({
        title: "Message Edited",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      onClose();
    } catch (err) {
      toast({
        title: "Edit Failed",
        description: err.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay backdropFilter="blur(6px)" bg="rgba(0,0,0,0.65)" />
      <ModalContent bg="var(--bg-card)" color="var(--text-primary)" borderRadius="xl" border="1px solid var(--color-border)">
        <ModalHeader borderBottom="1px solid var(--color-border)" pb={3}>
          Edit Message ✏️
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody py={4}>
          <Text fontSize="xs" color="var(--text-secondary)" mb={2}>
            Original content sent {messageToEdit ? new Date(messageToEdit.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}:
          </Text>
          <Textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Edit your message..."
            bg="var(--bg-search)"
            borderColor="var(--color-border)"
            _focus={{ borderColor: "var(--color-primary)" }}
            autoFocus
          />
        </ModalBody>
        <ModalFooter borderTop="1px solid var(--color-border)">
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="teal"
            bg="var(--color-primary)"
            _hover={{ bg: "var(--color-primary-hover)" }}
            isLoading={isSaving}
            isDisabled={!content.trim() || content === messageToEdit?.content}
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EditMessageModal;
