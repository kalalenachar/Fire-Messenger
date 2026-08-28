import React, { useState, useEffect } from "react";
import { ViewIcon, EditIcon, CheckIcon, CheckCircleIcon } from "@chakra-ui/icons";
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
  Flex,
  Badge,
} from "@chakra-ui/react";
import { ChatState } from "../../Context/ChatProvider";
import VerifiedBadge from "../common/VerifiedBadge";
import VerificationModal from "./VerificationModal";

const ProfileModal = ({ user: targetUser, children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isVerifyOpen, onOpen: onVerifyOpen, onClose: onVerifyClose } = useDisclosure();
  const { user: currentUser, updateUserProfile } = ChatState();
  const toast = useToast();

  // Pick active user data for target (if viewing logged-in user, use latest currentUser state)
  const activeUser = currentUser?._id === targetUser?._id ? currentUser : targetUser;
  const isMe = currentUser?._id === activeUser?._id;

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(activeUser?.name || "");
  const [status, setStatus] = useState(activeUser?.status || "");
  const [pic, setPic] = useState(activeUser?.pic || "");

  useEffect(() => {
    setName(activeUser?.name || "");
    setStatus(activeUser?.status || "");
    setPic(activeUser?.pic || "");
  }, [activeUser, isOpen]);

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
      status: status.trim() || "🔥 Agni Messenger",
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

  const verifyStatus = activeUser?.verificationStatus || (activeUser?.isVerified ? "verified" : "none");
  const verifyType = activeUser?.verificationType || (activeUser?._id === "bot_fire_ai" ? "business" : "individual");

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
            <Flex align="center">
              <Text>{isMe ? "My Profile" : activeUser?.name || "User Profile"}</Text>
              <VerifiedBadge user={activeUser} size="md" />
            </Flex>
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
            <Box position="relative">
              <Avatar size="2xl" name={isEditing ? name : activeUser?.name} src={isEditing ? pic : activeUser?.pic} border="3px solid var(--color-primary)" />
              <Box position="absolute" bottom="0" right="0">
                <VerifiedBadge user={activeUser} size="lg" />
              </Box>
            </Box>

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
                  {activeUser?.email || "user@agnimessenger.io"}
                </Text>

                <Box mt={3} p={3} bg="var(--bg-search)" borderRadius="lg" w="100%">
                  <Text fontSize="xs" color="var(--color-primary)" fontWeight="bold" textTransform="uppercase" mb={1}>
                    Status / About
                  </Text>
                  <Text fontSize="sm" color="var(--text-primary)">
                    {activeUser?.status || "🔥 Burning with Passion | Agni Messenger"}
                  </Text>
                </Box>

                {/* VERIFICATION BADGE & IDENTITY CARD */}
                <Box mt={3} p={3.5} borderRadius="xl" border="1px solid var(--color-border)" bg="var(--bg-search)" textAlign="left">
                  <Flex justify="space-between" align="center" mb={1.5}>
                    <Text fontSize="xs" color="var(--color-primary)" fontWeight="bold" textTransform="uppercase">
                      Identity Verification
                    </Text>
                    {verifyStatus === "verified" ? (
                      <Badge colorScheme={verifyType === "business" ? "yellow" : "blue"} fontSize="xs">
                        {verifyType === "business" ? "🟡 Official Business" : "🔵 Verified Individual"}
                      </Badge>
                    ) : verifyStatus === "pending" ? (
                      <Badge colorScheme="orange" fontSize="xs">
                        ⏳ Under Review
                      </Badge>
                    ) : (
                      <Badge colorScheme="gray" fontSize="xs">
                        Unverified
                      </Badge>
                    )}
                  </Flex>

                  {verifyStatus === "verified" ? (
                    <VStack align="stretch" spacing={1} fontSize="xs">
                      <Text color="var(--text-secondary)">
                        {verifyType === "business"
                          ? `Official Business Identity via ${activeUser?.verificationDetails?.gstinMasked || "GSTIN Registration"}`
                          : `Identity Verified via Aadhaar (${activeUser?.verificationDetails?.aadhaarMasked || "XXXX-XXXX-4812"}) & Live Face Match`}
                      </Text>
                      {activeUser?.verificationDetails?.verifiedAt && (
                        <Text fontSize="10px" color="var(--text-secondary)" opacity={0.8}>
                          Verified on: {new Date(activeUser.verificationDetails.verifiedAt).toLocaleDateString()}
                        </Text>
                      )}
                    </VStack>
                  ) : verifyStatus === "pending" ? (
                    <VStack align="stretch" spacing={2} fontSize="xs">
                      <Text color="orange.400">
                        Verification Application is undergoing background manual review.
                      </Text>
                      {isMe && (
                        <Button size="xs" colorScheme="orange" variant="outline" onClick={onVerifyOpen}>
                          View Application & Fast-Track
                        </Button>
                      )}
                    </VStack>
                  ) : (
                    <VStack align="stretch" spacing={2} fontSize="xs">
                      <Text color="var(--text-secondary)">
                        Get the blue or gold verified tag on your profile by verifying your Aadhaar or Business GSTIN with Live Face capture.
                      </Text>
                      {isMe && (
                        <Button
                          size="sm"
                          leftIcon={<CheckCircleIcon />}
                          bg="linear-gradient(135deg, #3897f0 0%, #0066ff 100%)"
                          color="white"
                          _hover={{ opacity: 0.9 }}
                          onClick={onVerifyOpen}
                        >
                          Get Verified Tag Now
                        </Button>
                      )}
                    </VStack>
                  )}
                </Box>

                {(activeUser?._id === "bot_fire_ai" || activeUser?.name?.includes("Fire Bot") || activeUser?.name?.includes("Agni Bot")) && (
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

      {/* Verification Modal Flow */}
      <VerificationModal isOpen={isVerifyOpen} onClose={onVerifyClose} />
    </>
  );
};

export default ProfileModal;

