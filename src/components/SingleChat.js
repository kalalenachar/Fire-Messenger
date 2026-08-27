import React, { useState, useRef, useEffect } from "react";
import { Box, Text } from "@chakra-ui/layout";
import {
  Avatar,
  IconButton,
  Input,
  Button,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Image,
  useDisclosure,
} from "@chakra-ui/react";
import { PhoneIcon, ViewIcon, AttachmentIcon } from "@chakra-ui/icons";
import { ChatState } from "../Context/ChatProvider";
import ProfileModal from "./miscellaneous/ProfileModal";

const DoubleTickIcon = () => (
  <svg viewBox="0 0 16 11" width="16" height="11" fill="currentColor" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M15.01 3.316l-6.88 6.88-3.13-3.13 1.06-1.06 2.07 2.07 5.82-5.82 1.06 1.06zm-4.32 0l-1.06-1.06-4.76 4.76-2.07-2.07-1.06 1.06 3.13 3.13 5.82-5.82z" />
  </svg>
);

const SingleChat = () => {
  const {
    selectedChat,
    user,
    messagesMap,
    sendMessage,
    sendTypingStatus,
    isTypingMap,
    toggleReaction,
    theme,
    startCall,
  } = ChatState();

  const [textInput, setTextInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const { isOpen: isImageOpen, onOpen: onImageOpen, onClose: onImageClose } = useDisclosure();

  const timerRef = useRef(null);
  const typingTimerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);

  const activeMessages = selectedChat && typeof selectedChat === "object" ? messagesMap[selectedChat._id] || [] : [];
  const activeTypingText = selectedChat && typeof selectedChat === "object" ? isTypingMap[selectedChat._id] : null;

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length, selectedChat, activeTypingText]);

  // Handle Real Audio Recording Timer & Recorder
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setTextInput(val);

    if (selectedChat) {
      sendTypingStatus(selectedChat._id, true);

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        sendTypingStatus(selectedChat._id, false);
      }, 2500);
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setIsRecording(true);
    }
  };

  const stopAndSendVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const audioBase64 = reader.result;
          sendMessage(selectedChat._id, `🎤 Voice Note (${recordingSeconds}s)`, "voice", audioBase64);
        };
        reader.readAsDataURL(audioBlob);

        mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current.stop();
    } else {
      sendMessage(selectedChat._id, `🎤 Voice Note (${recordingSeconds || 3}s)`, "voice", null);
    }
    setIsRecording(false);
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
  };

  // Attachment Upload Handler
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.onloadend = () => {
      const fileData = reader.result;
      if (isImage) {
        sendMessage(selectedChat._id, `📷 Photo (${file.name})`, "image", fileData);
      } else {
        sendMessage(selectedChat._id, `📄 File: ${file.name}`, "file", fileData);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  if (!selectedChat || typeof selectedChat !== "object" || !selectedChat._id) {
    return (
      <Box
        flex="1"
        h="100%"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        bg="var(--bg-chat)"
        className="chat-wallpaper"
        p={8}
        textAlign="center"
      >
        <Box
          w="80px"
          h="80px"
          borderRadius="50%"
          bg="var(--bg-header)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="40px"
          mb={4}
          boxShadow="var(--shadow-md)"
        >
          🔥
        </Box>
        <Text fontSize="2xl" fontWeight="bold" color="var(--text-primary)" mb={2}>
          Fire Messenger Web
        </Text>
        <Text fontSize="sm" color="var(--text-secondary)" maxW="400px">
          Real-time WebSockets messaging, live WebRTC Audio/Video calling, typing status, voice notes, and media attachments.
        </Text>
      </Box>
    );
  }

  const getHeaderInfo = () => {
    if (selectedChat.isGroupChat) {
      return {
        title: selectedChat.chatName,
        avatar: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80",
        status: activeTypingText || `${selectedChat.users?.length || 3} members`,
      };
    }
    const otherUser = selectedChat.users?.find((u) => u._id !== user?._id) || selectedChat.users?.[0];
    return {
      title: otherUser?.name || selectedChat.chatName,
      avatar: otherUser?.pic || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      status: activeTypingText || otherUser?.status || "Online",
      userObj: otherUser,
    };
  };

  const header = getHeaderInfo();

  const handleSend = () => {
    if (!textInput.trim()) return;
    if (selectedChat) {
      sendTypingStatus(selectedChat._id, false);
    }
    sendMessage(selectedChat._id, textInput, "text");
    setTextInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji) => {
    setTextInput((prev) => prev + emoji);
  };

  const availableEmojis = ["🔥", "❤️", "👍", "😂", "👏", "🚀", "💻", "✨"];

  return (
    <Box flex="1" h="100%" display="flex" flexDirection="column" bg="var(--bg-chat)" className="chat-wallpaper">
      {/* Header Bar */}
      <Box
        px={4}
        py={2.5}
        bg="var(--bg-header)"
        borderBottom="1px solid var(--color-border)"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        position="relative"
        zIndex="2"
        boxShadow="var(--shadow-sm)"
      >
        <Box display="flex" alignItems="center" gap={3}>
          <Avatar size="md" name={header.title} src={header.avatar} border="2px solid var(--text-header)" />
          <Box>
            <Text fontWeight="600" fontSize="md" color="var(--text-header)" lineHeight="1.2">
              {header.title}
            </Text>
            <Text
              fontSize="xs"
              color={activeTypingText ? "#38bdf8" : theme === "light" ? "#e0f2fe" : "var(--color-online)"}
              fontWeight={activeTypingText ? "bold" : "normal"}
            >
              {header.status}
            </Text>
          </Box>
        </Box>

        <Box display="flex" gap={2}>
          {header.userObj && (
            <>
              <Tooltip label="Real HD Voice Call" placement="bottom">
                <IconButton
                  icon={<PhoneIcon />}
                  size="sm"
                  variant="ghost"
                  color="var(--text-header)"
                  _hover={{ bg: "rgba(255,255,255,0.15)" }}
                  onClick={() => startCall(header.userObj, "audio", selectedChat._id)}
                />
              </Tooltip>
              <Tooltip label="Real HD Video Call" placement="bottom">
                <IconButton
                  icon={<span style={{ fontSize: "16px" }}>📹</span>}
                  size="sm"
                  variant="ghost"
                  color="var(--text-header)"
                  _hover={{ bg: "rgba(255,255,255,0.15)" }}
                  onClick={() => startCall(header.userObj, "video", selectedChat._id)}
                />
              </Tooltip>
              <ProfileModal user={header.userObj}>
                <IconButton
                  icon={<ViewIcon />}
                  size="sm"
                  variant="ghost"
                  color="var(--text-header)"
                  _hover={{ bg: "rgba(255,255,255,0.15)" }}
                />
              </ProfileModal>
            </>
          )}
        </Box>
      </Box>

      {/* Messages Scroll Area */}
      <Box flex="1" overflowY="auto" p={4} display="flex" flexDirection="column" gap={2.5}>
        <Box alignSelf="center" my={2} px={3} py={1} borderRadius="12px" bg="var(--bg-header)" color="var(--text-muted)" fontSize="11px" fontWeight="600">
          TODAY
        </Box>

        {activeMessages.map((msg) => {
          const isMe = msg.sender?._id === user?._id;
          const showHoverReactions = hoveredMsgId === msg._id;

          return (
            <Box
              key={msg._id}
              display="flex"
              flexDirection="column"
              alignItems={isMe ? "flex-end" : "flex-start"}
              position="relative"
              onMouseEnter={() => setHoveredMsgId(msg._id)}
              onMouseLeave={() => setHoveredMsgId(null)}
            >
              {/* Floating Reaction Bar on Hover */}
              {showHoverReactions && (
                <Box className="reaction-bar">
                  {["👍", "❤️", "🔥", "😂", "👏", "💩"].map((emoji) => (
                    <button
                      key={emoji}
                      className="reaction-btn"
                      onClick={() => toggleReaction(selectedChat._id, msg._id, emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </Box>
              )}

              {/* Message Bubble */}
              <Box className={`message-bubble ${isMe ? "sent" : "received"}`}>
                {!isMe && selectedChat.isGroupChat && (
                  <Text fontSize="xs" fontWeight="bold" color="var(--color-primary)" mb={0.5}>
                    {msg.sender?.name}
                  </Text>
                )}

                {/* Render Text, Voice, or Image Attachment */}
                {msg.type === "image" && (msg.fileUrl || msg.content) ? (
                  <Box mb={1}>
                    <Image
                      src={msg.fileUrl || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300&auto=format&fit=crop&q=80"}
                      alt="Attachment"
                      maxW="260px"
                      borderRadius="md"
                      cursor="pointer"
                      onClick={() => {
                        setPreviewImage(msg.fileUrl);
                        onImageOpen();
                      }}
                    />
                    <Text fontSize="xs" mt={1} color="var(--text-secondary)">{msg.content}</Text>
                  </Box>
                ) : msg.type === "voice" ? (
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Text fontSize="sm" fontWeight="bold" color="var(--color-primary)">
                      {msg.content}
                    </Text>
                    {msg.audioUrl ? (
                      <audio controls src={msg.audioUrl} style={{ height: "32px", width: "220px" }} />
                    ) : (
                      <Box display="flex" alignItems="center" gap={2} bg="rgba(0,0,0,0.2)" p={2} borderRadius="md">
                        <span>🔊</span>
                        <Text fontSize="xs" color="var(--text-primary)">Recorded Voice Note</Text>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Text fontSize="sm" whiteSpace="pre-wrap">
                    {msg.content}
                  </Text>
                )}

                {/* Reaction Badges */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <Box display="flex" gap={1} mt={1}>
                    {Object.entries(msg.reactions).map(([emoji, count]) => (
                      <Box
                        key={emoji}
                        px={1.5}
                        py={0.5}
                        borderRadius="10px"
                        bg="rgba(0,0,0,0.25)"
                        fontSize="11px"
                        display="inline-flex"
                        alignItems="center"
                        gap={1}
                      >
                        <span>{emoji}</span>
                        {count > 1 && <span>{count}</span>}
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Meta Time & Checkmarks */}
                <Box className="message-meta">
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {isMe && (
                    <span className="status-ticks">
                      <DoubleTickIcon />
                    </span>
                  )}
                </Box>
              </Box>
            </Box>
          );
        })}

        {/* Live Typing Animation Indicator */}
        {activeTypingText && (
          <Box display="flex" alignItems="center" gap={2} bg="var(--bg-header)" px={3} py={1.5} borderRadius="16px" w="fit-content" my={1}>
            <Box className="recording-dot" />
            <Text fontSize="xs" color="#38bdf8" fontWeight="bold">
              {activeTypingText}
            </Text>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input Toolbar */}
      <Box p={3} bg="var(--bg-header)" borderTop="1px solid var(--color-border)" display="flex" alignItems="center" gap={2}>
        {/* Emoji Selector Popover */}
        <Popover placement="top-start">
          <PopoverTrigger>
            <IconButton
              icon={<span style={{ fontSize: "18px" }}>😀</span>}
              size="md"
              variant="ghost"
              color="var(--text-header)"
              _hover={{ bg: "rgba(255,255,255,0.15)" }}
            />
          </PopoverTrigger>
          <PopoverContent bg="var(--bg-menu)" borderColor="var(--color-border)" w="auto" p={2} zIndex="2000">
            <PopoverBody display="flex" gap={2}>
              {availableEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}
                >
                  {emoji}
                </button>
              ))}
            </PopoverBody>
          </PopoverContent>
        </Popover>

        {/* File & Media Attachment Button */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileUpload}
          accept="image/*,audio/*,.pdf,.doc,.docx"
        />
        <Tooltip label="Attach Media / Photo / File" placement="top">
          <IconButton
            icon={<AttachmentIcon fontSize="19px" />}
            size="md"
            variant="ghost"
            color="var(--text-header)"
            _hover={{ bg: "rgba(255,255,255,0.15)" }}
            onClick={() => fileInputRef.current?.click()}
          />
        </Tooltip>

        {/* Main Text Input or Voice Recorder */}
        {isRecording ? (
          <Box flex="1" bg="var(--bg-search)" borderRadius="20px" px={4} py={2} display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={3}>
              <Box className="recording-dot" />
              <Text fontSize="sm" color="#f44336" fontWeight="bold">
                Recording Voice... 00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}s
              </Text>
            </Box>
            <Box display="flex" gap={2}>
              <Button size="xs" colorScheme="red" variant="ghost" onClick={cancelVoiceRecording}>
                Cancel
              </Button>
              <Button size="xs" bg="var(--color-primary)" color="white" _hover={{ bg: "var(--color-primary-hover)" }} onClick={stopAndSendVoiceRecording}>
                Send Voice
              </Button>
            </Box>
          </Box>
        ) : (
          <Input
            flex="1"
            placeholder="Type a message..."
            value={textInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            bg="var(--bg-search)"
            border="none"
            borderRadius="20px"
            color="var(--text-primary)"
            _placeholder={{ color: "var(--text-secondary)" }}
            _focus={{ bg: "var(--bg-input)", boxShadow: "0 0 0 1px var(--color-primary)" }}
          />
        )}

        {/* Voice Recorder or Send Button */}
        {textInput.trim() ? (
          <IconButton
            icon={<span style={{ fontSize: "16px" }}>🚀</span>}
            size="md"
            bg="var(--color-primary)"
            color="white"
            _hover={{ bg: "var(--color-primary-hover)" }}
            borderRadius="50%"
            onClick={handleSend}
          />
        ) : (
          <IconButton
            icon={<span style={{ fontSize: "18px" }}>🎙️</span>}
            size="md"
            variant="ghost"
            color="var(--text-header)"
            _hover={{ bg: "rgba(255,255,255,0.15)" }}
            onClick={startVoiceRecording}
          />
        )}
      </Box>

      {/* Image Preview Lightbox Modal */}
      <Modal isOpen={isImageOpen} onClose={onImageClose} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent bg="transparent" boxShadow="none">
          <ModalBody p={0} display="flex" justifyContent="center" alignItems="center">
            <Image src={previewImage} maxH="80vh" maxW="90vw" borderRadius="lg" />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default SingleChat;
