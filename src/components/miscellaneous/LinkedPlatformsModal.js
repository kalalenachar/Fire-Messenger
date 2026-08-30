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
  Spinner,
  Image,
  Input,
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
  submitTelegramPasswordAsync,
} from "../../data/fireStorage";

const LinkedPlatformsModal = ({ isOpen, onClose }) => {
  const { user, linkedPlatforms, setLinkedPlatforms, syncBridgeChats, socket } = ChatState();
  const toast = useToast();

  const [waLoading, setWaLoading] = useState(false);
  const [tgLoading, setTgLoading] = useState(false);
  const [waQrDataUrl, setWaQrDataUrl] = useState(null);
  const [tgQrDataUrl, setTgQrDataUrl] = useState(null);
  const [waPairingCode, setWaPairingCode] = useState(null);

  // Telegram 2FA Password state
  const [isTgPasswordNeeded, setIsTgPasswordNeeded] = useState(false);
  const [tgPasswordHint, setTgPasswordHint] = useState("");
  const [tgPassword, setTgPassword] = useState("");
  const [tgPassLoading, setTgPassLoading] = useState(false);

  const handleStartWhatsApp = useCallback(async () => {
    if (!user?._id) return;
    setWaLoading(true);
    try {
      const res = await startWhatsAppBridgeAsync(user._id, null);
      if (res?.qrDataUrl) {
        setWaQrDataUrl(res.qrDataUrl);
      }
      if (res?.pairingCode) {
        setWaPairingCode(res.pairingCode);
      }
      if (res?.connected) {
        setLinkedPlatforms((prev) => ({
          ...prev,
          whatsapp: { connected: true, phone: res.phone, name: res.name },
        }));
      }
    } catch (err) {
      console.error("WhatsApp bridge start error:", err);
    } finally {
      setWaLoading(false);
    }
  }, [user, setLinkedPlatforms]);

  const handleStartTelegram = useCallback(async () => {
    if (!user?._id) return;
    setTgLoading(true);
    setIsTgPasswordNeeded(false);
    setTgPassword("");
    try {
      const res = await startTelegramBridgeAsync(user._id);
      if (res?.qrDataUrl) {
        setTgQrDataUrl(res.qrDataUrl);
      }
      if (res?.status === "password_needed") {
        setIsTgPasswordNeeded(true);
        setTgPasswordHint(res.passwordHint || "");
      }
      if (res?.connected) {
        setLinkedPlatforms((prev) => ({
          ...prev,
          telegram: { connected: true, username: res.username, name: res.name },
        }));
      }
    } catch (err) {
      console.error("Telegram bridge start error:", err);
    } finally {
      setTgLoading(false);
    }
  }, [user, setLinkedPlatforms]);

  const loadStatus = useCallback(async () => {
    if (!user?._id) return;
    try {
      const platforms = await fetchPlatformsStatusAsync(user._id);
      if (platforms) {
        setLinkedPlatforms(platforms);
        if (platforms.whatsapp?.qrDataUrl) {
          setWaQrDataUrl(platforms.whatsapp.qrDataUrl);
        }
        if (platforms.telegram?.qrDataUrl) {
          setTgQrDataUrl(platforms.telegram.qrDataUrl);
        }
        if (platforms.telegram?.status === "password_needed") {
          setIsTgPasswordNeeded(true);
          setTgPasswordHint(platforms.telegram.passwordHint || "");
        }
      }
      if (!platforms?.whatsapp?.connected && !platforms?.whatsapp?.qrDataUrl) {
        handleStartWhatsApp();
      }
      if (!platforms?.telegram?.connected && !platforms?.telegram?.qrDataUrl && !platforms?.telegram?.passwordHint) {
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

  // Listen to live WebSocket Bridge events
  useEffect(() => {
    if (!socket) return;

    const onWaQr = (data) => {
      if (data?.qrDataUrl) setWaQrDataUrl(data.qrDataUrl);
      if (data?.pairingCode) setWaPairingCode(data.pairingCode);
    };

    const onWaConnected = (data) => {
      setLinkedPlatforms((prev) => ({
        ...prev,
        whatsapp: { connected: true, phone: data.phone, name: data.name },
      }));
      setWaQrDataUrl(null);
      syncBridgeChats();
      toast({
        title: "WhatsApp Connected! 🟢",
        description: `Linked ${data.phone || data.name}`,
        status: "success",
        duration: 4000,
        isClosable: true,
      });
    };

    const onTgQr = (data) => {
      if (data?.qrDataUrl) setTgQrDataUrl(data.qrDataUrl);
    };

    const onTgPasswordNeeded = (data) => {
      setIsTgPasswordNeeded(true);
      setTgPasswordHint(data?.hint || "");
      toast({
        title: "Telegram 2FA Password Required 🔐",
        description: data?.hint ? `Hint: ${data.hint}` : "Please enter your Telegram Two-Step Verification password.",
        status: "warning",
        duration: 6000,
        isClosable: true,
      });
    };

    const onTgConnected = (data) => {
      setLinkedPlatforms((prev) => ({
        ...prev,
        telegram: { connected: true, username: data.username, name: data.name },
      }));
      setTgQrDataUrl(null);
      setIsTgPasswordNeeded(false);
      setTgPassword("");
      syncBridgeChats();
      toast({
        title: "Telegram Connected! 🔵",
        description: `Linked ${data.username || data.name}`,
        status: "success",
        duration: 4000,
        isClosable: true,
      });
    };

    socket.on("bridge_whatsapp_qr", onWaQr);
    socket.on("bridge_whatsapp_connected", onWaConnected);
    socket.on("bridge_telegram_qr", onTgQr);
    socket.on("bridge_telegram_password_needed", onTgPasswordNeeded);
    socket.on("bridge_telegram_connected", onTgConnected);

    return () => {
      socket.off("bridge_whatsapp_qr", onWaQr);
      socket.off("bridge_whatsapp_connected", onWaConnected);
      socket.off("bridge_telegram_qr", onTgQr);
      socket.off("bridge_telegram_password_needed", onTgPasswordNeeded);
      socket.off("bridge_telegram_connected", onTgConnected);
    };
  }, [socket, setLinkedPlatforms, syncBridgeChats, toast]);

  const handleConfirmWhatsApp = async () => {
    if (!user?._id) return;
    setWaLoading(true);
    try {
      const res = await confirmWhatsAppBridgeAsync(user._id);
      if (res?.connected) {
        setLinkedPlatforms((prev) => ({
          ...prev,
          whatsapp: { connected: true, phone: res.phone || "Active", name: res.name || "WhatsApp Account" },
        }));
        await syncBridgeChats();
        toast({
          title: "WhatsApp Connected! 🟢",
          description: `Linked ${res.phone || "successfully"}.`,
          status: "success",
          duration: 4000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Waiting for WhatsApp Scan 🟡",
          description: "Please scan the QR code using WhatsApp on your phone (Settings > Linked Devices > Link a Device).",
          status: "info",
          duration: 4000,
          isClosable: true,
        });
      }
    } catch (err) {
      toast({ title: "Connection check failed", status: "error", duration: 3000 });
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
      setWaQrDataUrl(null);
      handleStartWhatsApp();
      await syncBridgeChats();
      toast({
        title: "WhatsApp Disconnected",
        description: "WhatsApp session unlinked.",
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
      const res = await confirmTelegramBridgeAsync(user._id);
      if (res?.connected) {
        setLinkedPlatforms((prev) => ({
          ...prev,
          telegram: { connected: true, username: res.username || "@user", name: res.name || "Telegram Account" },
        }));
        setIsTgPasswordNeeded(false);
        await syncBridgeChats();
        toast({
          title: "Telegram Connected! 🔵",
          description: `Linked ${res.username || "successfully"}.`,
          status: "success",
          duration: 4000,
          isClosable: true,
        });
      } else if (res?.status === "password_needed") {
        setIsTgPasswordNeeded(true);
        setTgPasswordHint(res.passwordHint || "");
      } else {
        toast({
          title: "Waiting for Telegram Scan 🟡",
          description: "Please scan the QR code using Telegram on your phone (Settings > Devices > Link Desktop Device).",
          status: "info",
          duration: 4000,
          isClosable: true,
        });
      }
    } catch (err) {
      toast({ title: "Connection check failed", status: "error", duration: 3000 });
    } finally {
      setTgLoading(false);
    }
  };

  const handleSubmitTelegramPassword = async () => {
    if (!user?._id || !tgPassword.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter your Telegram 2FA cloud password.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setTgPassLoading(true);
    try {
      const res = await submitTelegramPasswordAsync(user._id, tgPassword.trim());
      if (res?.success) {
        setLinkedPlatforms((prev) => ({
          ...prev,
          telegram: {
            connected: true,
            username: res.user?.username || "@user",
            name: res.user?.name || "Telegram Account",
          },
        }));
        setIsTgPasswordNeeded(false);
        setTgPassword("");
        await syncBridgeChats();
        toast({
          title: "Telegram Connected! 🔵",
          description: `Logged in as ${res.user?.username || res.user?.name || "Telegram User"}`,
          status: "success",
          duration: 4000,
          isClosable: true,
        });
      }
    } catch (err) {
      toast({
        title: "Telegram 2FA Error",
        description: err.message || "Incorrect Telegram 2FA password. Please check and re-enter.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setTgPassLoading(false);
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
      setTgQrDataUrl(null);
      setIsTgPasswordNeeded(false);
      setTgPassword("");
      handleStartTelegram();
      await syncBridgeChats();
      toast({
        title: "Telegram Disconnected",
        description: "Telegram session unlinked.",
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
              Live Omnichannel
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
                  <Text>🟢 WhatsApp (Live)</Text>
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
                  <Text>🔵 Telegram (Live)</Text>
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
                              Connected: {linkedPlatforms.whatsapp.phone || "Active"}
                            </Text>
                          </VStack>
                        </HStack>
                        <Badge colorScheme="green" px={3} py={1} borderRadius="full">
                          ACTIVE
                        </Badge>
                      </Flex>
                      <Text fontSize="xs" color="gray.400" mt={3}>
                        ✓ Real-time 2-way message synchronization is active. Messages and voice notes from your WhatsApp
                        contacts appear in your Agni Inbox.
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
                      Scan the live QR Code with WhatsApp on your phone:
                    </Text>

                    {/* Live WhatsApp QR Code */}
                    <Box
                      p={3}
                      bg="white"
                      borderRadius="16px"
                      boxShadow="0 8px 30px rgba(37, 211, 102, 0.3)"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      minW="200px"
                      minH="200px"
                    >
                      {waLoading && !waQrDataUrl ? (
                        <VStack spacing={2}>
                          <Spinner color="#25D366" size="lg" />
                          <Text fontSize="xs" color="gray.600">
                            Connecting to WhatsApp...
                          </Text>
                        </VStack>
                      ) : waQrDataUrl ? (
                        <Image src={waQrDataUrl} alt="WhatsApp QR Code" boxSize="190px" objectFit="contain" />
                      ) : (
                        <VStack spacing={2}>
                          <Spinner color="#25D366" size="md" />
                          <Text fontSize="xs" color="gray.600">
                            Generating QR Code...
                          </Text>
                        </VStack>
                      )}
                    </Box>

                    {waPairingCode && (
                      <Box bg="rgba(37, 211, 102, 0.15)" px={4} py={2} borderRadius="10px" border="1px solid #25D366">
                        <Text fontSize="xs" color="green.300" fontWeight="bold">
                          Pairing Code: <span style={{ fontSize: "16px", color: "white" }}>{waPairingCode}</span>
                        </Text>
                      </Box>
                    )}

                    <Text fontSize="xs" color="gray.400" textAlign="center">
                      1. Open WhatsApp on your phone ➔ <b>Settings ➔ Linked Devices ➔ Link a Device</b>
                      <br />
                      2. Point phone camera at this QR code to connect instantly.
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
                        ⚡ Check Link Status
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
                              Connected: {linkedPlatforms.telegram.username || "Active"}
                            </Text>
                          </VStack>
                        </HStack>
                        <Badge colorScheme="blue" px={3} py={1} borderRadius="full">
                          ACTIVE
                        </Badge>
                      </Flex>
                      <Text fontSize="xs" color="gray.400" mt={3}>
                        ✓ Real-time Telegram DMs, channels, and supergroups synced into Agni Messenger.
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
                ) : isTgPasswordNeeded ? (
                  /* --- 2FA PASSWORD INPUT FORM --- */
                  <VStack spacing={4} align="stretch" p={5} bg="rgba(34, 158, 217, 0.12)" borderRadius="16px" border="1px solid #229ED9">
                    <HStack spacing={2} justify="center">
                      <Text fontSize="24px">🔐</Text>
                      <Text fontWeight="700" fontSize="md" color="white">
                        Telegram Two-Step Verification (2FA)
                      </Text>
                    </HStack>
                    <Text fontSize="xs" color="gray.300" textAlign="center">
                      Your Telegram account is protected with a 2FA Cloud Password. Enter your password to complete linking.
                    </Text>
                    {tgPasswordHint && (
                      <Flex justify="center">
                        <Badge colorScheme="blue" fontSize="xs" px={2.5} py={0.5} borderRadius="full">
                          Hint: {tgPasswordHint}
                        </Badge>
                      </Flex>
                    )}
                    <Input
                      type="password"
                      placeholder="Enter your Telegram 2FA Cloud Password"
                      value={tgPassword}
                      onChange={(e) => setTgPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSubmitTelegramPassword();
                      }}
                      bg="rgba(0,0,0,0.5)"
                      color="white"
                      borderColor="rgba(34, 158, 217, 0.5)"
                      _focus={{ borderColor: "#229ED9", boxShadow: "0 0 0 1px #229ED9" }}
                    />
                    <HStack spacing={3}>
                      <Button
                        flex={1}
                        colorScheme="blue"
                        bg="#229ED9"
                        _hover={{ bg: "#1E8EC5" }}
                        isLoading={tgPassLoading}
                        onClick={handleSubmitTelegramPassword}
                      >
                        Submit 2FA Password 🔐
                      </Button>
                      <Button
                        variant="ghost"
                        color="gray.400"
                        size="sm"
                        onClick={() => {
                          setIsTgPasswordNeeded(false);
                          handleStartTelegram();
                        }}
                      >
                        Back to QR
                      </Button>
                    </HStack>
                  </VStack>
                ) : (
                  <VStack spacing={4} align="center">
                    <Text fontSize="sm" color="gray.300" textAlign="center">
                      Scan the live MTProto QR Code with Telegram on your phone:
                    </Text>

                    {/* Live Telegram QR Code */}
                    <Box
                      p={3}
                      bg="white"
                      borderRadius="16px"
                      boxShadow="0 8px 30px rgba(34, 158, 217, 0.3)"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      minW="200px"
                      minH="200px"
                    >
                      {tgLoading && !tgQrDataUrl ? (
                        <VStack spacing={2}>
                          <Spinner color="#229ED9" size="lg" />
                          <Text fontSize="xs" color="gray.600">
                            Connecting to Telegram MTProto...
                          </Text>
                        </VStack>
                      ) : tgQrDataUrl ? (
                        <Image src={tgQrDataUrl} alt="Telegram QR Code" boxSize="190px" objectFit="contain" />
                      ) : (
                        <VStack spacing={2}>
                          <Spinner color="#229ED9" size="md" />
                          <Text fontSize="xs" color="gray.600">
                            Generating MTProto QR...
                          </Text>
                        </VStack>
                      )}
                    </Box>

                    <Text fontSize="xs" color="gray.400" textAlign="center">
                      1. Open Telegram ➔ <b>Settings ➔ Devices ➔ Link Desktop Device</b>
                      <br />
                      2. Point phone camera at this QR code to authorize your session.
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
                        ⚡ Check Link Status
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
