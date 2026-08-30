import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  Box,
  Text,
  Flex,
  Avatar,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Button,
  Image,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  Stack,
  useToast,
  Badge,
} from "@chakra-ui/react";
import { CloseIcon, DeleteIcon } from "@chakra-ui/icons";
import { ChatState } from "../../Context/ChatProvider";
import VerifiedBadge from "../common/VerifiedBadge";

const EMOJI_REACTIONS = ["🔥", "❤️", "😂", "😮", "👏", "🎉"];

const StatusViewerModal = ({ isOpen, onClose, userStatusStack }) => {
  const { viewStatusSlide, deleteStatusSlide, sendMessage, chats, setSelectedChat, addOrSelectChat, user } = ChatState();
  const toast = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const [replyText, setReplyText] = useState("");
  const [isViewersDrawerOpen, setIsViewersDrawerOpen] = useState(false);

  const posts = userStatusStack?.posts || [];
  const currentPost = posts[currentIndex] || null;
  const isOwnStatus = userStatusStack?.isOwn || false;

  const timerRef = useRef(null);

  // When post opens, record view if viewing someone else's status
  useEffect(() => {
    if (isOpen && currentPost && !isOwnStatus) {
      viewStatusSlide(currentPost._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentIndex, currentPost?._id]);

  // Reset index when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setProgress(0);
    }
  }, [isOpen]);

  // Auto advance timer
  useEffect(() => {
    if (!isOpen || !currentPost || isPaused || isViewersDrawerOpen) return;

    const duration = 5000; // 5 seconds per slide
    const interval = 50;
    const step = (interval / duration) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNextSlide();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentIndex, isPaused, isViewersDrawerOpen, posts.length]);

  const handleNextSlide = () => {
    if (currentIndex < posts.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrevSlide = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  const handleDeleteCurrentPost = async () => {
    if (!currentPost) return;
    try {
      await deleteStatusSlide(currentPost._id);
      toast({ title: "Status slide deleted", status: "info", duration: 2000 });
      if (posts.length <= 1) {
        onClose();
      } else if (currentIndex >= posts.length - 1) {
        setCurrentIndex(posts.length - 2);
      }
    } catch (err) {
      toast({ title: "Failed to delete status", status: "error", duration: 2000 });
    }
  };

  const handleSendReply = async (contentToSend) => {
    const text = contentToSend || replyText;
    if (!text.trim() || !userStatusStack?.user?._id) return;

    try {
      const authorUser = userStatusStack.user;
      const authorId = authorUser._id;

      // Find or create chat with author
      let targetChat = (chats || []).find(
        (c) => !c.isGroupChat && c.users?.some((u) => u._id === authorId)
      );

      const statusSnippet =
        currentPost.type === "text"
          ? currentPost.content
          : `📷 Status Photo/Video: ${currentPost.caption || ""}`;

      const fullMessage = `Replying to status: "${statusSnippet}"\n💬 ${text}`;

      if (!targetChat && user) {
        const newChat = {
          _id: `chat_${user._id}_${authorId}`,
          chatName: authorUser.name || "Chat",
          isGroupChat: false,
          users: [user, authorUser],
          latestMessage: { content: fullMessage, createdAt: new Date().toISOString() },
          unread: 0,
          category: "Personal",
        };
        addOrSelectChat(newChat);
        targetChat = newChat;
      }

      if (targetChat) {
        setSelectedChat(targetChat);
        await sendMessage(targetChat._id, fullMessage, "text");
      }

      toast({ title: "Reply sent as message!", status: "success", duration: 2000 });
      setReplyText("");
    } catch (err) {
      console.error(err);
      toast({ title: "Could not send reply", status: "error", duration: 2000 });
    }
  };

  if (!isOpen || !userStatusStack || posts.length === 0) return null;

  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" isCentered>
      <ModalOverlay bg="rgba(0, 0, 0, 0.95)" backdropFilter="blur(15px)" />
      <ModalContent bg="transparent" boxShadow="none" color="white" h="100vh" m={0} p={0}>
        <Box
          position="relative"
          w="100%"
          h="100%"
          maxW="500px"
          mx="auto"
          display="flex"
          flexDirection="column"
          justifyContent="space-between"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* TOP HEADER: PROGRESS BARS & AUTHOR INFO */}
          <Box p={4} zIndex={10} bgGradient="linear(to-b, rgba(0,0,0,0.8), transparent)">
            {/* SEGMENTED PROGRESS BARS */}
            <Flex gap={1} mb={3}>
              {posts.map((post, idx) => (
                <Box
                  key={post._id || idx}
                  flex={1}
                  h="3px"
                  bg="rgba(255, 255, 255, 0.3)"
                  borderRadius="full"
                  overflow="hidden"
                >
                  <Box
                    h="100%"
                    bg="white"
                    transition="width 0.05s linear"
                    w={
                      idx < currentIndex
                        ? "100%"
                        : idx === currentIndex
                        ? `${progress}%`
                        : "0%"
                    }
                  />
                </Box>
              ))}
            </Flex>

            {/* AUTHOR DETAILS & ACTION BUTTONS */}
            <Flex align="center" justify="space-between">
              <Flex align="center" gap={3}>
                <Avatar size="sm" name={userStatusStack.user?.name} src={userStatusStack.user?.pic} />
                <Box>
                  <Flex align="center">
                    <Text fontWeight="bold" fontSize="sm" color="white">
                      {isOwnStatus ? "My Status" : userStatusStack.user?.name}
                    </Text>
                    <VerifiedBadge user={userStatusStack?.user} size="xs" />
                  </Flex>
                  <Text fontSize="xs" color="rgba(255,255,255,0.7)">
                    {formatTime(currentPost?.createdAt)}
                  </Text>
                </Box>
              </Flex>

              <Flex align="center" gap={2}>
                {isOwnStatus && (
                  <IconButton
                    icon={<DeleteIcon />}
                    size="sm"
                    colorScheme="red"
                    variant="ghost"
                    onClick={handleDeleteCurrentPost}
                    aria-label="Delete Slide"
                  />
                )}
                <IconButton
                  icon={<CloseIcon />}
                  size="sm"
                  colorScheme="whiteAlpha"
                  variant="ghost"
                  onClick={onClose}
                  aria-label="Close Viewer"
                />
              </Flex>
            </Flex>
          </Box>

          {/* MAIN SLIDE CONTENT AREA */}
          <Box
            flex={1}
            display="flex"
            alignItems="center"
            justifyContent="center"
            position="relative"
            overflow="hidden"
            px={4}
          >
            {/* LEFT / RIGHT TOUCH NAVIGATION TARGETS */}
            <Box
              position="absolute"
              top={0}
              left={0}
              w="35%"
              h="100%"
              zIndex={5}
              cursor="pointer"
              onClick={handlePrevSlide}
            />
            <Box
              position="absolute"
              top={0}
              right={0}
              w="65%"
              h="100%"
              zIndex={5}
              cursor="pointer"
              onClick={handleNextSlide}
            />

            {/* CONTENT DISPLAYER */}
            {currentPost?.type === "text" ? (
              <Box
                w="100%"
                h="100%"
                maxH="650px"
                borderRadius="2xl"
                bg={currentPost.bgColor}
                display="flex"
                alignItems="center"
                justifyContent="center"
                p={8}
                boxShadow="2xl"
              >
                <Text
                  color="white"
                  fontFamily={currentPost.fontStyle || "sans-serif"}
                  fontSize="24px"
                  fontWeight="bold"
                  textAlign="center"
                  wordBreak="break-word"
                >
                  {currentPost.content}
                </Text>
              </Box>
            ) : (
              <Box
                w="100%"
                h="100%"
                maxH="650px"
                borderRadius="2xl"
                overflow="hidden"
                bg="black"
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                position="relative"
              >
                {currentPost?.type === "video" ? (
                  <video
                    src={currentPost.content}
                    autoPlay
                    playsInline
                    style={{ maxHeight: "100%", maxWidth: "100%" }}
                  />
                ) : (
                  <Image
                    src={currentPost?.content}
                    alt="Status image"
                    maxH="100%"
                    maxW="100%"
                    objectFit="contain"
                  />
                )}

                {currentPost?.caption && (
                  <Box
                    position="absolute"
                    bottom={0}
                    w="100%"
                    p={4}
                    bgGradient="linear(to-t, rgba(0,0,0,0.9), transparent)"
                    textAlign="center"
                  >
                    <Text color="white" fontSize="md" fontWeight="medium">
                      {currentPost.caption}
                    </Text>
                  </Box>
                )}
              </Box>
            )}
          </Box>

          {/* BOTTOM BAR: REPLIES (OTHER) OR VIEWER COUNT (OWN) */}
          <Box p={4} zIndex={10} bgGradient="linear(to-t, rgba(0,0,0,0.8), transparent)">
            {isOwnStatus ? (
              /* OWN STATUS VIEWER ANALYTICS (EXPLICIT USER REQUIREMENT) */
              <Flex align="center" justify="center" direction="column">
                <Button
                  size="sm"
                  borderRadius="full"
                  bg="rgba(255, 255, 255, 0.2)"
                  color="white"
                  _hover={{ bg: "rgba(255, 255, 255, 0.3)" }}
                  onClick={() => setIsViewersDrawerOpen(true)}
                  px={5}
                >
                  👁️ {currentPost?.viewers?.length || 0} Views • Swipe up
                </Button>
              </Flex>
            ) : (
              /* CONTACT STATUS QUICK REPLY & EMOJI REACTIONS */
              <Stack spacing={2}>
                <Flex justify="center" gap={2}>
                  {EMOJI_REACTIONS.map((emoji) => (
                    <Button
                      key={emoji}
                      size="sm"
                      borderRadius="full"
                      bg="rgba(255, 255, 255, 0.15)"
                      _hover={{ bg: "rgba(255, 255, 255, 0.3)", transform: "scale(1.2)" }}
                      onClick={() => handleSendReply(emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </Flex>

                <InputGroup size="md">
                  <Input
                    placeholder={`Reply to ${userStatusStack.user?.name}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    bg="rgba(255, 255, 255, 0.15)"
                    border="none"
                    color="white"
                    borderRadius="full"
                    _placeholder={{ color: "rgba(255,255,255,0.6)" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendReply();
                    }}
                  />
                  <InputRightElement width="4.5rem">
                    <Button
                      h="1.75rem"
                      size="xs"
                      colorScheme="orange"
                      borderRadius="full"
                      onClick={() => handleSendReply()}
                    >
                      Send
                    </Button>
                  </InputRightElement>
                </InputGroup>
              </Stack>
            )}
          </Box>
        </Box>

        {/* SLIDE-UP VIEWERS DRAWER FOR OWN STATUS */}
        <Drawer
          isOpen={isViewersDrawerOpen}
          placement="bottom"
          onClose={() => setIsViewersDrawerOpen(false)}
        >
          <DrawerOverlay />
          <DrawerContent bg="var(--bg-card)" color="var(--text-main)" borderTopRadius="2xl">
            <DrawerHeader borderBottom="1px solid var(--border-color)">
              <Flex align="center" justify="space-between">
                <Flex align="center" gap={2}>
                  <Text fontSize="lg" fontWeight="bold">
                    Viewed by {currentPost?.viewers?.length || 0}
                  </Text>
                  <Badge colorScheme="orange" borderRadius="full">
                    Live Analytics
                  </Badge>
                </Flex>
                <IconButton
                  icon={<CloseIcon />}
                  size="xs"
                  variant="ghost"
                  onClick={() => setIsViewersDrawerOpen(false)}
                  aria-label="Close Viewers"
                />
              </Flex>
            </DrawerHeader>

            <DrawerBody py={4} maxH="300px">
              {!currentPost?.viewers || currentPost.viewers.length === 0 ? (
                <Text color="var(--text-muted)" textAlign="center" py={6}>
                  No views yet. Share your status to contacts!
                </Text>
              ) : (
                <Stack spacing={3}>
                  {currentPost.viewers.map((viewer, idx) => (
                    <Flex
                      key={viewer.userId || idx}
                      align="center"
                      justify="space-between"
                      p={2}
                      borderRadius="lg"
                      _hover={{ bg: "var(--bg-hover)" }}
                    >
                      <Flex align="center" gap={3}>
                        <Avatar size="sm" name={viewer.name} src={viewer.pic} />
                        <Box>
                          <Text fontWeight="bold" fontSize="sm">
                            {viewer.name}
                          </Text>
                          <Text fontSize="xs" color="var(--text-muted)">
                            {formatTime(viewer.viewedAt)}
                          </Text>
                        </Box>
                      </Flex>
                      <Badge colorScheme="green" fontSize="xs" borderRadius="md">
                        Viewed
                      </Badge>
                    </Flex>
                  ))}
                </Stack>
              )}
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      </ModalContent>
    </Modal>
  );
};

export default StatusViewerModal;
