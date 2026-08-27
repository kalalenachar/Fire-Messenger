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
  VStack,
  Text,
  Textarea,
  RadioGroup,
  Radio,
  Box,
  useToast,
} from "@chakra-ui/react";

import { submitReportAsync, getCurrentSessionUser } from "../../data/fireStorage";
import { ChatState } from "../../Context/ChatProvider";

const reportReasons = [
  { id: "spam", label: "Spam or Unsolicited Messaging", icon: "🚫" },
  { id: "harassment", label: "Harassment or Bullying", icon: "⚠️" },
  { id: "inappropriate", label: "Inappropriate Content or Media", icon: "🔞" },
  { id: "fake", label: "Fake Account or Impersonation", icon: "🎭" },
  { id: "scam", label: "Scam, Fraud or Phishing", icon: "🎣" },
  { id: "other", label: "Other Issues", icon: "❓" },
];

const ReportModal = ({ isOpen, onClose, targetObj }) => {
  const [selectedReason, setSelectedReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const { user } = ChatState() || {};

  const isUserTarget = targetObj && !targetObj.isGroupChat && !targetObj.chatName;
  const targetTitle = targetObj
    ? isUserTarget
      ? targetObj.name
      : targetObj.chatName || "Conversation"
    : "Target";

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const currentUser = user || getCurrentSessionUser();
    const reasonLabel = reportReasons.find((r) => r.id === selectedReason)?.label || selectedReason;

    const res = await submitReportAsync(currentUser, targetObj, reasonLabel, details);

    setIsSubmitting(false);
    toast({
      title: "🚨 Report Logged & Email Dispatched",
      description: `Report for "${targetTitle}" was recorded in database and an instant email alert was sent to Admin (${res.adminEmail || "admin@firemessenger.io"}).`,
      status: "success",
      duration: 5000,
      isClosable: true,
      position: "top",
    });
    setDetails("");
    setSelectedReason("spam");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay backdropFilter="blur(6px)" />
      <ModalContent bg="var(--bg-menu)" color="var(--text-primary)" border="1px solid var(--color-border)" borderRadius="16px" boxShadow="var(--shadow-xl)">
        <ModalHeader borderBottom="1px solid var(--color-border)" fontSize="md" fontWeight="bold" display="flex" alignItems="center" gap={2}>
          <span>⚠️</span> Report {isUserTarget ? "User" : "Chat"}: <Text as="span" color="var(--color-primary)">{targetTitle}</Text>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody py={4}>
          <Text fontSize="xs" color="var(--text-secondary)" mb={3}>
            Help us maintain a safe community. Please select the primary reason for reporting this {isUserTarget ? "user" : "chat"}:
          </Text>

          <RadioGroup value={selectedReason} onChange={setSelectedReason}>
            <VStack align="stretch" spacing={2.5}>
              {reportReasons.map((reason) => (
                <Box
                  key={reason.id}
                  p={2.5}
                  borderRadius="10px"
                  bg={selectedReason === reason.id ? "var(--bg-hover)" : "transparent"}
                  border="1px solid"
                  borderColor={selectedReason === reason.id ? "var(--color-primary)" : "transparent"}
                  cursor="pointer"
                  onClick={() => setSelectedReason(reason.id)}
                  transition="all 0.15s ease"
                  display="flex"
                  alignItems="center"
                >
                  <Radio value={reason.id} colorScheme="teal">
                    <Text fontSize="xs" fontWeight="600" color="var(--text-primary)" ml={2}>
                      {reason.icon} {reason.label}
                    </Text>
                  </Radio>
                </Box>
              ))}
            </VStack>
          </RadioGroup>

          <Text fontSize="xs" fontWeight="bold" mt={4} mb={1.5} color="var(--text-secondary)">
            Additional Context (Optional):
          </Text>
          <Textarea
            placeholder="Describe what happened or provide message details..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            bg="var(--bg-search)"
            border="1px solid var(--color-border)"
            color="var(--text-primary)"
            fontSize="xs"
            rows={3}
            borderRadius="10px"
            _focus={{ borderColor: "var(--color-primary)", boxShadow: "none" }}
          />
        </ModalBody>

        <ModalFooter borderTop="1px solid var(--color-border)" gap={2}>
          <Button variant="ghost" size="sm" onClick={onClose} color="var(--text-secondary)">
            Cancel
          </Button>
          <Button
            size="sm"
            bg="var(--color-primary)"
            color="white"
            _hover={{ bg: "var(--color-primary-hover)" }}
            isLoading={isSubmitting}
            onClick={handleSubmit}
          >
            Submit Report
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ReportModal;
