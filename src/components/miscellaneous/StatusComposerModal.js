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
  Box,
  Text,
  Textarea,
  Input,
  Stack,
  Flex,
  Select,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  Image,
} from "@chakra-ui/react";
import { AttachmentIcon, LockIcon, SettingsIcon } from "@chakra-ui/icons";
import { ChatState } from "../../Context/ChatProvider";

const BACKGROUND_PRESETS = [
  "linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)",
  "linear-gradient(135deg, #8A2387 0%, #E94057 50%, #F27121 100%)",
  "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
  "linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)",
  "linear-gradient(135deg, #7F00FF 0%, #E100FF 100%)",
  "linear-gradient(135deg, #f12711 0%, #f5af19 100%)",
];

const FONTS = [
  { label: "Sans Serif", value: "sans-serif" },
  { label: "Serif", value: "serif" },
  { label: "Monospace", value: "monospace" },
  { label: "Cursive", value: "cursive" },
];

const StatusComposerModal = ({ isOpen, onClose, onOpenAudienceManager }) => {
  const { postNewStatus, audienceProfiles } = ChatState();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState(0); // 0 = Text, 1 = Media
  const [textContent, setTextContent] = useState("");
  const [selectedBg, setSelectedBg] = useState(BACKGROUND_PRESETS[0]);
  const [selectedFont, setSelectedFont] = useState("sans-serif");

  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("image"); // 'image' | 'video'
  const [caption, setCaption] = useState("");

  const [selectedAudienceProfileId, setSelectedAudienceProfileId] = useState("ALL");
  const [publishing, setPublishing] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("video/")) {
      setMediaType("video");
    } else {
      setMediaType("image");
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setMediaUrl(uploadEvent.target?.result || "");
    };
    reader.readAsDataURL(file);
  };

  const handlePublish = async () => {
    if (activeTab === 0 && !textContent.trim()) {
      toast({ title: "Please enter text for your status", status: "warning", duration: 2000 });
      return;
    }
    if (activeTab === 1 && !mediaUrl) {
      toast({ title: "Please upload an image or video", status: "warning", duration: 2000 });
      return;
    }

    setPublishing(true);
    try {
      const postData = {
        type: activeTab === 0 ? "text" : mediaType,
        content: activeTab === 0 ? textContent.trim() : mediaUrl,
        caption: activeTab === 1 ? caption.trim() : "",
        bgColor: selectedBg,
        fontStyle: selectedFont,
        audienceProfileIds: [selectedAudienceProfileId],
      };

      await postNewStatus(postData);
      toast({ title: "Status published successfully! 🔥", status: "success", duration: 2000 });
      
      // Reset form
      setTextContent("");
      setMediaUrl("");
      setCaption("");
      onClose();
    } catch (err) {
      toast({ title: "Failed to publish status", status: "error", duration: 2000 });
    }
    setPublishing(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay backdropFilter="blur(5px)" />
      <ModalContent bg="var(--bg-card)" color="var(--text-main)" borderRadius="xl" border="1px solid var(--border-color)">
        <ModalHeader borderBottom="1px solid var(--border-color)">
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={2}>
              <Text fontSize="lg" fontWeight="bold">
                Add New Status
              </Text>
              <Badge colorScheme="orange" px={2} borderRadius="full">
                24 Hours
              </Badge>
            </Flex>
            <ModalCloseButton position="relative" top={0} right={0} />
          </Flex>
        </ModalHeader>

        <ModalBody py={4}>
          <Tabs index={activeTab} onChange={(i) => setActiveTab(i)} colorScheme="orange" isFitted mb={4}>
            <TabList>
              <Tab fontWeight="bold">✏️ Text Slide</Tab>
              <Tab fontWeight="bold">📷 Photo / Video</Tab>
            </TabList>
            <TabPanels pt={4}>
              {/* TEXT SLIDE PANEL */}
              <TabPanel p={0}>
                <Box
                  h="260px"
                  borderRadius="xl"
                  bg={selectedBg}
                  p={6}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  position="relative"
                  boxShadow="md"
                >
                  <Textarea
                    placeholder="Type a status update..."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    color="#ffffff"
                    fontFamily={selectedFont}
                    fontSize="22px"
                    fontWeight="bold"
                    textAlign="center"
                    variant="unstyled"
                    resize="none"
                    h="100%"
                    w="100%"
                    _placeholder={{ color: "rgba(255,255,255,0.7)" }}
                  />
                </Box>

                {/* BACKGROUND & FONT PICKERS */}
                <Flex align="center" justify="space-between" mt={4} flexWrap="wrap" gap={3}>
                  <Flex align="center" gap={2}>
                    <Text fontSize="xs" fontWeight="bold" color="var(--text-muted)">
                      BACKGROUND
                    </Text>
                    <Flex gap={1.5}>
                      {BACKGROUND_PRESETS.map((bg, idx) => (
                        <Box
                          key={idx}
                          w="24px"
                          h="24px"
                          borderRadius="full"
                          bg={bg}
                          cursor="pointer"
                          border={selectedBg === bg ? "2px solid white" : "none"}
                          boxShadow={selectedBg === bg ? "0 0 0 2px orange" : "none"}
                          onClick={() => setSelectedBg(bg)}
                        />
                      ))}
                    </Flex>
                  </Flex>

                  <Flex align="center" gap={2}>
                    <Text fontSize="xs" fontWeight="bold" color="var(--text-muted)">
                      FONT
                    </Text>
                    <Select
                      size="xs"
                      w="120px"
                      value={selectedFont}
                      onChange={(e) => setSelectedFont(e.target.value)}
                      borderRadius="md"
                    >
                      {FONTS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </Select>
                  </Flex>
                </Flex>
              </TabPanel>

              {/* MEDIA SLIDE PANEL */}
              <TabPanel p={0}>
                <Stack spacing={3}>
                  {mediaUrl ? (
                    <Box h="220px" borderRadius="xl" overflow="hidden" bg="black" position="relative" display="flex" alignItems="center" justifyContent="center">
                      {mediaType === "video" ? (
                        <video src={mediaUrl} controls style={{ maxHeight: "100%", maxWidth: "100%" }} />
                      ) : (
                        <Image src={mediaUrl} alt="Status upload preview" maxH="100%" maxW="100%" objectFit="contain" />
                      )}
                      <Button
                        size="xs"
                        colorScheme="red"
                        position="absolute"
                        top={2}
                        right={2}
                        onClick={() => setMediaUrl("")}
                      >
                        Change Media
                      </Button>
                    </Box>
                  ) : (
                    <Box
                      h="180px"
                      border="2px dashed var(--border-color)"
                      borderRadius="xl"
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                      justifyContent="center"
                      cursor="pointer"
                      onClick={() => document.getElementById("status-file-input").click()}
                      _hover={{ bg: "var(--bg-hover)" }}
                    >
                      <AttachmentIcon boxSize={8} color="orange.400" mb={2} />
                      <Text fontWeight="bold" fontSize="sm">
                        Click to upload Photo or Video
                      </Text>
                      <Text fontSize="xs" color="var(--text-muted)">
                        Supports PNG, JPG, GIF, MP4
                      </Text>
                      <input
                        id="status-file-input"
                        type="file"
                        accept="image/*,video/*"
                        style={{ display: "none" }}
                        onChange={handleFileUpload}
                      />
                    </Box>
                  )}

                  <Input
                    placeholder="Add a caption..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    bg="var(--bg-input)"
                    borderColor="var(--border-color)"
                  />
                </Stack>
              </TabPanel>
            </TabPanels>
          </Tabs>

          {/* AUDIENCE SELECTOR SECTION */}
          <Box pt={3} borderTop="1px solid var(--border-color)">
            <Flex align="center" justify="space-between" mb={2}>
              <Flex align="center" gap={1.5}>
                <LockIcon color="orange.400" boxSize={3.5} />
                <Text fontSize="xs" fontWeight="bold" color="var(--text-muted)">
                  TARGET AUDIENCE PROFILE
                </Text>
              </Flex>
              <Button
                size="xs"
                variant="ghost"
                colorScheme="orange"
                leftIcon={<SettingsIcon />}
                onClick={() => {
                  onClose();
                  if (onOpenAudienceManager) onOpenAudienceManager();
                }}
              >
                Manage Profiles
              </Button>
            </Flex>

            <Select
              value={selectedAudienceProfileId}
              onChange={(e) => setSelectedAudienceProfileId(e.target.value)}
              bg="var(--bg-input)"
              borderColor="var(--border-color)"
              borderRadius="lg"
            >
              <option value="ALL">🌐 All Contacts (Everyone)</option>
              {audienceProfiles
                .filter((p) => !p.isDefault)
                .map((prof) => (
                  <option key={prof._id} value={prof._id}>
                    {prof.mode === "blacklist" ? "🔴 Exclude Mode: " : "🟢 Whitelist Mode: "}
                    {prof.name} ({prof.memberIds?.length || 0} contacts)
                  </option>
                ))}
            </Select>
          </Box>
        </ModalBody>

        <ModalFooter borderTop="1px solid var(--border-color)">
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="orange"
            onClick={handlePublish}
            isLoading={publishing}
            borderRadius="lg"
            px={6}
          >
            Share Status
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default StatusComposerModal;
