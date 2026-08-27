import React, { useState, useRef, useEffect } from "react";
import { Box, Text } from "@chakra-ui/layout";
import { Avatar, IconButton, Input, Button, Tooltip, Popover, PopoverTrigger, PopoverContent, PopoverBody } from "@chakra-ui/react";
import { PhoneIcon, ViewIcon, AttachmentIcon } from "@chakra-ui/icons";
import { ChatState } from "../Context/ChatProvider";

const SingleChat = () => {
  const { selectedChat, user, messagesMap, sendMessage, toggleReaction } = ChatState();
  const [textInput, setTextInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const timerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const activeMessages = selectedChat ? messagesMap[selectedChat._id] || [] : [];

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages, selectedChat]);

  // Voice Recording Simulator Timer
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

  if (!selectedChat) {
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
          Send and receive real-time messages with WhatsApp emerald styling, emoji reactions, voice notes, and AI bot assistance.
        </Text>
      </Box>
    );
  }

  const getHeaderInfo = () => {
    if (selectedChat.isGroupChat) {
      return {
        title: selectedChat.chatName,
        avatar: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80",
        status: `${selectedChat.users?.length || 3} members`,
      };
    }
    const otherUser = selectedChat.users?.find((u) => u._id !== user?._id);
    return {
      title: otherUser?.name || selectedChat.chatName,
      avatar: otherUser?.pic || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      status: otherUser?.status || "Online",
    };
  };

  const header = getHeaderInfo();

  const handleSend = () => {
    if (!textInput.trim()) return;
    sendMessage(selectedChat._id, textInput, "text");
    setTextInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSendVoiceNote = () => {
    setIsRecording(false);
    sendMessage(selectedChat._id, `🎤 Voice Note (${recordingSeconds}s)`, "voice");
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
        zIndex="5"
      >
        <Box display="flex" alignItems="center" gap={3}>
          <Avatar size="md" name={header.title} src={header.avatar} />
          <Box>
            <Text fontWeight="600" fontSize="md" color="var(--text-primary)" lineHeight="1.2">
              {header.title}
            </Text>
            <Text fontSize="xs" color="var(--color-online)">
              {header.status}
            </Text>
          </Box>
        </Box>

        <Box display="flex" gap={2}>
          <Tooltip label="Start Voice Call" placement="bottom">
            <IconButton icon={<PhoneIcon />} size="sm" variant="ghost" color="var(--text-secondary)" _hover={{ bg: "var(--bg-hover)", color: "var(--color-primary)" }} />
          </Tooltip>
          <Tooltip label="View Info" placement="bottom">
            <IconButton icon={<ViewIcon />} size="sm" variant="ghost" color="var(--text-secondary)" _hover={{ bg: "var(--bg-hover)", color: "var(--color-primary)" }} />
          </Tooltip>
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

                <Text fontSize="sm" whiteSpace="pre-wrap">
                  {msg.content}
                </Text>

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
                  {isMe && <span className="status-ticks">✓✓</span>}
                </Box>
              </Box>
            </Box>
          );
        })}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input Toolbar */}
      <Box p={3} bg="var(--bg-header)" borderTop="1px solid var(--color-border)" display="flex" alignItems="center" gap={2}>
        {/* Emoji Selector Popover */}
        <Popover placement="top-start">
          <PopoverTrigger>
            <IconButton icon={<span style={{ fontSize: "18px" }}>😀</span>} size="md" variant="ghost" color="var(--text-secondary)" _hover={{ bg: "var(--bg-hover)" }} />
          </PopoverTrigger>
          <PopoverContent bg="var(--bg-header)" borderColor="var(--color-border)" w="auto" p={2}>
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

        {/* Attachment Mock Button */}
        <IconButton icon={<AttachmentIcon />} size="md" variant="ghost" color="var(--text-secondary)" _hover={{ bg: "var(--bg-hover)", color: "var(--color-primary)" }} />

        {/* Main Text Input or Voice Recorder */}
        {isRecording ? (
          <Box flex="1" bg="var(--bg-search)" borderRadius="20px" px={4} py={2} display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={3}>
              <Box className="recording-dot" />
              <Text fontSize="sm" color="#f44336" fontWeight="bold">
                Recording... 00:0{recordingSeconds}s
              </Text>
            </Box>
            <Box display="flex" gap={2}>
              <Button size="xs" colorScheme="red" variant="ghost" onClick={() => setIsRecording(false)}>
                Cancel
              </Button>
              <Button size="xs" bg="var(--color-primary)" color="white" _hover={{ bg: "var(--color-primary-hover)" }} onClick={handleSendVoiceNote}>
                Send Voice
              </Button>
            </Box>
          </Box>
        ) : (
          <Input
            flex="1"
            placeholder="Type a message..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
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
            color="var(--text-secondary)"
            _hover={{ bg: "var(--bg-hover)", color: "var(--color-primary)" }}
            onClick={() => setIsRecording(true)}
          />
        )}
      </Box>
    </Box>
  );
};

export default SingleChat;
