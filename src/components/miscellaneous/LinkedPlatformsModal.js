import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Box,
  Text,
  Badge,
  Flex,
  VStack,
  HStack,
  useToast,
} from "@chakra-ui/react";
import { ChatState } from "../../Context/ChatProvider";
import {
  fetchPlatformsStatusAsync,
  startWhatsAppBridgeAsync,
  confirmWhatsAppBridgeAsync,
  disconnectWhatsAppBridgeAsync,
  startTelegramBridgeAsync,
  confirmTelegramBridgeAsync,
  disconnectTelegramBridgeAsync,
} from "../../data/fireStorage";

const LinkedPlatformsModal = ({ isOpen, onClose }) => {
  const { user, linkedPlatforms, setLinkedPlatforms, syncBridgeChats } = ChatState();
  const toast = useToast();

  const [waLoading, setWaLoading] = useState(false);
  const [tgLoading, setTgLoading] = useState(false);

  const handleStartWhatsApp = useCallback(async () => {
    if (!user?._id) return;
    setWaLoading(true);
    try {
      await startWhatsAppBridgeAsync(user._id, null);
    } catch (err) {
      console.error(err);
    } finally {
      setWaLoading(false);
    }
  }, [user]);

  const handleStartTelegram = useCallback(async () => {
    if (!user?._id) return;
    setTgLoading(true);
    try {
      await startTelegramBridgeAsync(user._id);
    } catch (err) {
      console.error(err);
    } finally {
      setTgLoading(false);
    }
  }, [user]);

  const loadStatus = useCallback(async () => {
    if (!user?._id) return;
    try {
      const platforms = await fetchPlatformsStatusAsync(user._id);
      setLinkedPlatforms(platforms);
      if (!platforms.whatsapp?.connected) {
        handleStartWhatsApp();
      }
      if (!platforms.telegram?.connected) {
        handleStartTelegram();
      }
    } catch (err) {
      console.warn("Could not load platforms status:", err);
    }
  }, [user, setLinkedPlatforms, handleStartWhatsApp, handleStartTelegram]);

  // Load status on modal open
  useEffect(() => {
    if (isOpen && user?._id) {
      loadStatus();
    }
  }, [isOpen, user?._id, loadStatus]);


  const handleConfirmWhatsApp = async () => {
    if (!user?._id) return;
    setWaLoading(true);
    try {
      const session = await confirmWhatsAppBridgeAsync(
        user._id,
        "+1 (555) 789-0123",
        "My WhatsApp Account"
      );
      setLinkedPlatforms((prev) => ({
        ...prev,
        whatsapp: { connected: true, phone: session.phone, name: session.name },
      }));
      await syncBridgeChats();
      toast({
        title: "WhatsApp Connected! 🟢",
        description: "Your WhatsApp chats and contacts have been synced into Agni Messenger.",
        status: "success",
        duration: 4000,
        isClosable: true,
      });
    } catch (err) {
      toast({ title: "Connection failed", status: "error", duration: 3000 });
    } finally {
      setWaLoading(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!user?._id) return;
    setWaLoading(true);
    try {
      await disconnectWhatsAppBridgeAsync(user._id);
      setLinkedPlatforms((prev) => ({
        ...prev,
        whatsapp: { connected: false },
      }));
      handleStartWhatsApp();
      await syncBridgeChats();
      toast({
        title: "WhatsApp Disconnected",
        description: "Synced WhatsApp chats removed from local feed.",
        status: "info",
        duration: 3000,
      });
    } catch (err) {
      toast({ title: "Failed to disconnect", status: "error", duration: 3000 });
    } finally {
      setWaLoading(false);
    }
  };

  const handleConfirmTelegram = async () => {
    if (!user?._id) return;
    setTgLoading(true);
    try {
      const session = await confirmTelegramBridgeAsync(user._id, "@agni_user", "My Telegram Account");
      setLinkedPlatforms((prev) => ({
        ...prev,
        telegram: { connected: true, username: session.username, name: session.name },
      }));
      await syncBridgeChats();
      toast({
        title: "Telegram Connected! 🔵",
        description: "Your Telegram channels and chats have been synced into Agni Messenger.",
        status: "success",
        duration: 4000,
        isClosable: true,
      });
    } catch (err) {
      toast({ title: "Connection failed", status: "error", duration: 3000 });
    } finally {
      setTgLoading(false);
    }
  };

  const handleDisconnectTelegram = async () => {
    if (!user?._id) return;
    setTgLoading(true);
    try {
      await disconnectTelegramBridgeAsync(user._id);
      setLinkedPlatforms((prev) => ({
        ...prev,
        telegram: { connected: false },
      }));
      handleStartTelegram();
      await syncBridgeChats();
      toast({
        title: "Telegram Disconnected",
        description: "Synced Telegram chats removed from local feed.",
        status: "info",
        duration: 3000,
      });
    } catch (err) {
      toast({ title: "Failed to disconnect", status: "error", duration: 3000 });
    } finally {
      setTgLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="xl">
      <ModalOverlay bg="rgba(0, 0, 0, 0.8)" backdropFilter="blur(10px)" />
      <ModalContent
        bg="linear-gradient(145deg, #141724 0%, #0d0f17 100%)"
        border="1px solid rgba(255, 255, 255, 0.12)"
        boxShadow="0 24px 60px rgba(0, 0, 0, 0.9)"
        color="white"
        borderRadius="20px"
        overflow="hidden"
      >
        <ModalHeader
          borderBottom="1px solid rgba(255, 255, 255, 0.08)"
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          py={4}
          px={6}
        >
          <HStack spacing={3}>
            <Text fontSize="xl" fontWeight="800">
              🔗 Linked Platforms
            </Text>
            <Badge colorScheme="purple" variant="solid" borderRadius="full" px={2} fontSize="xs">
              Omnichannel
            </Badge>
          </HStack>
        </ModalHeader>
        <ModalCloseButton color="gray.400" _hover={{ color: "white" }} />

        <ModalBody p={6}>
          <Tabs variant="soft-rounded" colorScheme="orange">
            <TabList mb={4} bg="rgba(255, 255, 255, 0.03)" p={1} borderRadius="12px">
              <Tab
                flex={1}
                color="gray.300"
                _selected={{ color: "white", bg: "rgba(37, 211, 102, 0.25)", border: "1px solid #25D366" }}
                fontWeight="600"
                fontSize="sm"
              >
                <HStack spacing={2}>
                  <Text>🟢 WhatsApp</Text>
                  {linkedPlatforms?.whatsapp?.connected && (
                    <Badge colorScheme="green" fontSize="10px" borderRadius="full">
                      Linked
                    </Badge>
                  )}
                </HStack>
              </Tab>
              <Tab
                flex={1}
                color="gray.300"
                _selected={{ color: "white", bg: "rgba(34, 158, 217, 0.25)", border: "1px solid #229ED9" }}
                fontWeight="600"
                fontSize="sm"
              >
                <HStack spacing={2}>
                  <Text>🔵 Telegram</Text>
                  {linkedPlatforms?.telegram?.connected && (
                    <Badge colorScheme="blue" fontSize="10px" borderRadius="full">
                      Linked
                    </Badge>
                  )}
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              {/* --- WHATSAPP PANEL --- */}
              <TabPanel p={0}>
                {linkedPlatforms?.whatsapp?.connected ? (
                  <VStack spacing={4} align="stretch">
                    <Box
                      p={5}
                      bg="rgba(37, 211, 102, 0.08)"
                      border="1px solid rgba(37, 211, 102, 0.3)"
                      borderRadius="16px"
                    >
                      <Flex justify="space-between" align="center">
                        <HStack spacing={3}>
                          <Box fontSize="32px">🟢</Box>
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="700" fontSize="md">
                              {linkedPlatforms.whatsapp.name || "WhatsApp Account"}
                            </Text>
                            <Text fontSize="xs" color="green.300">
                              Connected: {linkedPlatforms.whatsapp.phone || "+1 (555) 789-0123"}
                            </Text>
                          </VStack>
                        </HStack>
                        <Badge colorScheme="green" px={3} py={1} borderRadius="full">
                          ACTIVE
                        </Badge>
                      </Flex>
                      <Text fontSize="xs" color="gray.400" mt={3}>
                        ✓ Real-time 2-way message synchronization is active. Messages and voice notes from your WhatsApp
                        contacts will appear in your Agni Inbox.
                      </Text>
                    </Box>

                    <Button
                      colorScheme="red"
                      variant="outline"
                      size="sm"
                      isLoading={waLoading}
                      onClick={handleDisconnectWhatsApp}
                    >
                      Unlink WhatsApp Account
                    </Button>
                  </VStack>
                ) : (
                  <VStack spacing={4} align="center">
                    <Text fontSize="sm" color="gray.300" textAlign="center">
                      Scan the QR Code with WhatsApp on your phone or use 1-Tap Mobile Pairing:
                    </Text>

                    {/* QR Code Mock Canvas Visualizer */}
                    <Box
                      p={4}
                      bg="white"
                      borderRadius="16px"
                      boxShadow="0 8px 30px rgba(37, 211, 102, 0.3)"
                      position="relative"
                    >
                      <Box
                        w="180px"
                        h="180px"
                        bg="linear-gradient(45deg, #000 25%, #fff 25%, #fff 50%, #000 50%, #000 75%, #fff 75%, #fff 100%)"
                        backgroundSize="20px 20px"
                        borderRadius="8px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Box bg="white" p={2} borderRadius="8px" boxShadow="md">
                          <Text fontSize="24px">🟢</Text>
                        </Box>
                      </Box>
                    </Box>

                    <Text fontSize="xs" color="gray.400">
                      1. Open WhatsApp ➔ <b>Settings ➔ Linked Devices ➔ Link a Device</b>
                      <br />
                      2. Point phone camera at the screen to scan.
                    </Text>

                    <HStack spacing={3} w="100%">
                      <Button
                        flex={1}
                        colorScheme="green"
                        bg="#25D366"
                        _hover={{ bg: "#1EBE5D" }}
                        isLoading={waLoading}
                        onClick={handleConfirmWhatsApp}
                      >
                        ⚡ Confirm / Link WhatsApp
                      </Button>
                      <Button
                        variant="ghost"
                        color="gray.400"
                        size="sm"
                        onClick={handleStartWhatsApp}
                        isLoading={waLoading}
                      >
                        ↻ Refresh QR
                      </Button>
                    </HStack>
                  </VStack>
                )}
              </TabPanel>

              {/* --- TELEGRAM PANEL --- */}
              <TabPanel p={0}>
                {linkedPlatforms?.telegram?.connected ? (
                  <VStack spacing={4} align="stretch">
                    <Box
                      p={5}
                      bg="rgba(34, 158, 217, 0.08)"
                      border="1px solid rgba(34, 158, 217, 0.3)"
                      borderRadius="16px"
                    >
                      <Flex justify="space-between" align="center">
                        <HStack spacing={3}>
                          <Box fontSize="32px">🔵</Box>
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="700" fontSize="md">
                              {linkedPlatforms.telegram.name || "Telegram Account"}
                            </Text>
                            <Text fontSize="xs" color="blue.300">
                              Connected: {linkedPlatforms.telegram.username || "@agni_user"}
                            </Text>
                          </VStack>
                        </HStack>
                        <Badge colorScheme="blue" px={3} py={1} borderRadius="full">
                          ACTIVE
                        </Badge>
                      </Flex>
                      <Text fontSize="xs" color="gray.400" mt={3}>
                        ✓ Real-time Telegram DMs, channels, and supergroups synced into Agni Messenger with instant delivery.
                      </Text>
                    </Box>

                    <Button
                      colorScheme="red"
                      variant="outline"
                      size="sm"
                      isLoading={tgLoading}
                      onClick={handleDisconnectTelegram}
                    >
                      Unlink Telegram Account
                    </Button>
                  </VStack>
                ) : (
                  <VStack spacing={4} align="center">
                    <Text fontSize="sm" color="gray.300" textAlign="center">
                      Scan the QR Code with Telegram or use 1-Tap Mobile Link Auth:
                    </Text>

                    {/* QR Code Mock Canvas Visualizer */}
                    <Box
                      p={4}
                      bg="white"
                      borderRadius="16px"
                      boxShadow="0 8px 30px rgba(34, 158, 217, 0.3)"
                      position="relative"
                    >
                      <Box
                        w="180px"
                        h="180px"
                        bg="linear-gradient(45deg, #0088cc 25%, #fff 25%, #fff 50%, #0088cc 50%, #0088cc 75%, #fff 75%, #fff 100%)"
                        backgroundSize="20px 20px"
                        borderRadius="8px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Box bg="white" p={2} borderRadius="8px" boxShadow="md">
                          <Text fontSize="24px">🔵</Text>
                        </Box>
                      </Box>
                    </Box>

                    <Text fontSize="xs" color="gray.400">
                      1. Open Telegram ➔ <b>Settings ➔ Devices ➔ Link Desktop Device</b>
                      <br />
                      2. Scan the QR code or tap the 1-Tap authorization button.
                    </Text>

                    <HStack spacing={3} w="100%">
                      <Button
                        flex={1}
                        colorScheme="blue"
                        bg="#229ED9"
                        _hover={{ bg: "#1E8EC5" }}
                        isLoading={tgLoading}
                        onClick={handleConfirmTelegram}
                      >
                        ⚡ 1-Tap Connect Telegram
                      </Button>
                      <Button
                        variant="ghost"
                        color="gray.400"
                        size="sm"
                        onClick={handleStartTelegram}
                        isLoading={tgLoading}
                      >
                        ↻ Refresh QR
                      </Button>
                    </HStack>
                  </VStack>
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>

        <ModalFooter borderTop="1px solid rgba(255, 255, 255, 0.08)" py={3} px={6}>
          <Button variant="ghost" color="gray.400" onClick={onClose} size="sm">
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default LinkedPlatformsModal;
