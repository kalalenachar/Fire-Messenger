import React, { useState, useEffect } from "react";
import { ViewIcon, EditIcon, CheckIcon, CheckCircleIcon, WarningIcon, LockIcon } from "@chakra-ui/icons";
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
  InputGroup,
  InputRightElement,
  Spinner,
} from "@chakra-ui/react";
import axios from "axios";
import { ChatState } from "../../Context/ChatProvider";
import VerifiedBadge from "../common/VerifiedBadge";
import VerificationModal from "./VerificationModal";

const API_BASE_URL =
  typeof window !== "undefined" && window.location.port === "3000"
    ? `http://${window.location.hostname}:5000/api`
    : `${typeof window !== "undefined" ? window.location.protocol : "http:"}//${
        typeof window !== "undefined" ? window.location.host : "localhost:5000"
      }/api`;

const ProfileModal = ({ user: targetUser, children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isVerifyOpen, onOpen: onVerifyOpen, onClose: onVerifyClose } = useDisclosure();
  const { user: currentUser, updateUserProfile } = ChatState();
  const toast = useToast();

  // Pick active user data for target (if viewing logged-in user, use latest currentUser state)
  const activeUser = currentUser?._id === targetUser?._id ? currentUser : targetUser;
  const isMe = currentUser?._id === activeUser?._id;
  const emailLower = (activeUser?.email || "").toLowerCase();
  const isAdminUser =
    activeUser?.isAdmin ||
    activeUser?.role === "admin" ||
    emailLower === "kalalenachar@gmail.com" ||
    emailLower.includes("alex@") ||
    emailLower.includes("admin") ||
    activeUser?._id === "bot_fire_ai";

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(activeUser?.name || "");
  const [username, setUsername] = useState(activeUser?.username || "");
  const [status, setStatus] = useState(activeUser?.status || "");
  const [pic, setPic] = useState(activeUser?.pic || "");

  // Password Update State
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Username validation state
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const [usernameError, setUsernameError] = useState("");

  useEffect(() => {
    setName(activeUser?.name || "");
    setUsername(activeUser?.username || "");
    setStatus(activeUser?.status || "");
    setPic(activeUser?.pic || "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordFields(false);
    setIsEditing(false);
  }, [activeUser, isOpen]);

  // Real-time Username availability check
  const handleUsernameChange = (val) => {
    const clean = val.toLowerCase().trim();
    setUsername(clean);

    if (clean === (activeUser?.username || "").toLowerCase()) {
      setUsernameAvailable(true);
      setUsernameError("");
      return;
    }

    const regex = /^[a-z0-9_.]{3,20}$/;
    if (!regex.test(clean)) {
      setUsernameAvailable(false);
      setUsernameError("3-20 chars: letters, numbers, dots & underscores.");
      return;
    }

    setUsernameChecking(true);
    setUsernameError("");

    const timer = setTimeout(async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/user/check-username`, {
          params: { username: clean },
        });
        if (data.available) {
          setUsernameAvailable(true);
          setUsernameError("Username is available!");
        } else {
          setUsernameAvailable(false);
          setUsernameError(data.message || "Username is already taken.");
        }
      } catch (err) {
        setUsernameAvailable(false);
        setUsernameError("Error checking username.");
      } finally {
        setUsernameChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  };

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

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast({
        title: "Name cannot be empty",
        status: "warning",
        duration: 3000,
        position: "bottom",
      });
      return;
    }

    if (username && username !== (activeUser?.username || "").toLowerCase() && !usernameAvailable) {
      toast({
        title: "Invalid or Unavailable Username",
        description: usernameError || "Please choose an available username.",
        status: "warning",
        duration: 3000,
        position: "bottom",
      });
      return;
    }

    const updates = {
      name: name.trim(),
      username: username.trim(),
      status: status.trim() || "🔥 Agni Messenger",
      pic,
    };

    if (showPasswordFields && newPassword) {
      if (!currentPassword) {
        toast({
          title: "Current Password Required",
          description: "Please enter your current password to change account password.",
          status: "warning",
          duration: 3000,
          position: "bottom",
        });
        return;
      }
      if (newPassword !== confirmPassword) {
        toast({
          title: "Password Mismatch",
          description: "New Password and Confirm Password do not match.",
          status: "warning",
          duration: 3000,
          position: "bottom",
        });
        return;
      }
      updates.currentPassword = currentPassword;
      updates.newPassword = newPassword;
    }

    try {
      await updateUserProfile(updates);
      setIsEditing(false);
      setShowPasswordFields(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Profile Updated! 🔥",
        status: "success",
        duration: 3000,
        position: "bottom",
      });
    } catch (err) {
      toast({
        title: "Profile Update Failed",
        description: err.message,
        status: "error",
        duration: 3000,
        position: "bottom",
      });
    }
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
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg="var(--bg-card)" color="var(--text-primary)" borderRadius="2xl" border="1px solid var(--color-border)" boxShadow="var(--shadow-md)">
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
                  Upload New Avatar Photo (Auto Resized & Compressed)
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
                    USERNAME (@handle)
                  </Text>
                  <InputGroup size="sm">
                    <Input
                      value={username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      bg="var(--bg-search)"
                      color="var(--text-primary)"
                      borderColor={usernameAvailable ? "var(--color-border)" : "red.400"}
                      placeholder="e.g. alex_rivers"
                    />
                    <InputRightElement>
                      {usernameChecking ? (
                        <Spinner size="xs" color="var(--color-primary)" />
                      ) : usernameAvailable ? (
                        <CheckIcon color="green.400" />
                      ) : (
                        <WarningIcon color="red.400" />
                      )}
                    </InputRightElement>
                  </InputGroup>
                  {usernameError && (
                    <Text fontSize="10px" color={usernameAvailable ? "green.400" : "red.400"} mt={1}>
                      {usernameError}
                    </Text>
                  )}
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

                {/* SECURITY / CHANGE PASSWORD SECTION */}
                <Box w="100%" pt={2}>
                  {!showPasswordFields ? (
                    <Button
                      size="xs"
                      variant="outline"
                      colorScheme="teal"
                      leftIcon={<LockIcon />}
                      onClick={() => setShowPasswordFields(true)}
                    >
                      Change Account Password
                    </Button>
                  ) : (
                    <VStack spacing={2} align="stretch" p={3} border="1px dashed var(--color-border)" borderRadius="md" bg="var(--bg-search)">
                      <Text fontSize="xs" color="var(--color-primary)" fontWeight="bold">
                        🔒 Security / Change Password
                      </Text>
                      <Input
                        type="password"
                        placeholder="Current Password"
                        size="xs"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        bg="var(--bg-card)"
                      />
                      <Input
                        type="password"
                        placeholder="New Password"
                        size="xs"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        bg="var(--bg-card)"
                      />
                      <Input
                        type="password"
                        placeholder="Confirm New Password"
                        size="xs"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        bg="var(--bg-card)"
                      />
                      <Button size="xs" variant="ghost" colorScheme="gray" onClick={() => setShowPasswordFields(false)}>
                        Cancel Password Change
                      </Button>
                    </VStack>
                  )}
                </Box>
              </VStack>
            ) : (
              <Box textAlign="center" w="100%">
                {activeUser?.username && (
                  <Text fontSize="sm" color="var(--color-primary)" fontWeight="bold" mb={1}>
                    @{activeUser.username}
                  </Text>
                )}
                {activeUser?.email && (
                  <Text fontSize="sm" color="var(--text-secondary)" mb={1}>
                    {activeUser.email
                      .replace(/@firemessenger\.io$/i, "@agnimessenger.io")
                      .replace(/@fire\.io$/i, "@agnimessenger.io")
                      .replace(/@agni\.io$/i, "@agnimessenger.io")}
                  </Text>
                )}

                <Box mt={3} p={3} bg="var(--bg-search)" borderRadius="lg" w="100%">
                  <Text fontSize="xs" color="var(--color-primary)" fontWeight="bold" textTransform="uppercase" mb={1}>
                    Status / About
                  </Text>
                  <Text fontSize="sm" color="var(--text-primary)">
                    {activeUser?.status || "🔥 Burning with Passion | Agni Messenger"}
                  </Text>
                </Box>

                {/* VERIFICATION BADGE & IDENTITY CARD */}
                {!isAdminUser && (
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
                      ) : verifyStatus === "rejected" ? (
                        <Badge colorScheme="red" fontSize="xs">
                          ⚠️ Rejected
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
                            ? "Official Business Entity Verified ✓"
                            : "Individual Identity & Face Match Verified ✓"}
                        </Text>
                        {isMe && activeUser?.verificationDetails?.verifiedAt && (
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
                            View Application Status
                          </Button>
                        )}
                      </VStack>
                    ) : verifyStatus === "rejected" ? (
                      <VStack align="stretch" spacing={2} fontSize="xs">
                        <Box p={2} bg="rgba(239, 68, 68, 0.15)" borderRadius="md" border="1px solid #ef4444">
                          <Text color="red.400" fontWeight="bold">
                            Application Rejected by Administrator
                          </Text>
                          <Text color="var(--text-secondary)" fontSize="xs" mt={0.5}>
                            Reason: {activeUser?.verificationDetails?.rejectionReason || "Verification criteria not met."}
                          </Text>
                        </Box>
                        {isMe && (
                          <Button
                            size="sm"
                            leftIcon={<CheckCircleIcon />}
                            colorScheme="red"
                            onClick={onVerifyOpen}
                          >
                            Re-apply for Verification Now
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
                )}

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

