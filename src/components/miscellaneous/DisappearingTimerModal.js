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
  Stack,
  RadioGroup,
  Radio,
  Text,
  Box,
  useToast,
} from "@chakra-ui/react";
import { ChatState } from "../../Context/ChatProvider";

const DisappearingTimerModal = ({ isOpen, onClose, chatId, currentTimer = 0 }) => {
  const { setChatDisappearingTimer } = ChatState();
  const [selectedTimer, setSelectedTimer] = useState(String(currentTimer || 0));
  const toast = useToast();

  const handleSave = () => {
    const seconds = parseInt(selectedTimer, 10);
    setChatDisappearingTimer(chatId, seconds);
    toast({
      title: seconds > 0 ? "Disappearing Messages Turned On ⏳" : "Disappearing Messages Turned Off",
      description: seconds > 0 ? `New messages will disappear after ${seconds === 86400 ? "24 hours" : seconds === 604800 ? "7 days" : "90 days"}.` : "Messages will remain permanent in this chat.",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" isCentered>
      <ModalOverlay backdropFilter="blur(6px)" bg="rgba(0,0,0,0.65)" />
      <ModalContent bg="var(--bg-card)" color="var(--text-primary)" borderRadius="xl" border="1px solid var(--color-border)">
        <ModalHeader borderBottom="1px solid var(--color-border)" pb={3}>
          Disappearing Messages ⏳
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody py={4}>
          <Text fontSize="xs" color="var(--text-secondary)" mb={4}>
            For more privacy and storage efficiency, all new messages sent in this chat can disappear after a set duration.
          </Text>

          <RadioGroup onChange={setSelectedTimer} value={selectedTimer}>
            <Stack spacing={3}>
              <Box
                p={2.5}
                borderRadius="lg"
                bg={selectedTimer === "86400" ? "var(--bg-hover)" : "var(--bg-search)"}
                cursor="pointer"
                onClick={() => setSelectedTimer("86400")}
              >
                <Radio value="86400" colorScheme="teal">
                  <Text fontWeight="600" fontSize="sm">24 Hours</Text>
                </Radio>
              </Box>

              <Box
                p={2.5}
                borderRadius="lg"
                bg={selectedTimer === "604800" ? "var(--bg-hover)" : "var(--bg-search)"}
                cursor="pointer"
                onClick={() => setSelectedTimer("604800")}
              >
                <Radio value="604800" colorScheme="teal">
                  <Text fontWeight="600" fontSize="sm">7 Days</Text>
                </Radio>
              </Box>

              <Box
                p={2.5}
                borderRadius="lg"
                bg={selectedTimer === "7776000" ? "var(--bg-hover)" : "var(--bg-search)"}
                cursor="pointer"
                onClick={() => setSelectedTimer("7776000")}
              >
                <Radio value="7776000" colorScheme="teal">
                  <Text fontWeight="600" fontSize="sm">90 Days</Text>
                </Radio>
              </Box>

              <Box
                p={2.5}
                borderRadius="lg"
                bg={selectedTimer === "0" ? "var(--bg-hover)" : "var(--bg-search)"}
                cursor="pointer"
                onClick={() => setSelectedTimer("0")}
              >
                <Radio value="0" colorScheme="teal">
                  <Text fontWeight="600" fontSize="sm">Off (Keep forever)</Text>
                </Radio>
              </Box>
            </Stack>
          </RadioGroup>
        </ModalBody>
        <ModalFooter borderTop="1px solid var(--color-border)">
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="teal" bg="var(--color-primary)" _hover={{ bg: "var(--color-primary-hover)" }} onClick={handleSave}>
            Apply Timer
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default DisappearingTimerModal;
