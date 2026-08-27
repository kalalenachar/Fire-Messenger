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
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
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

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const getFileCategory = (mimeType = "", fileName = "") => {
  const ext = fileName ? fileName.split(".").pop().toLowerCase() : "";
  if (mimeType?.startsWith("image/")) return "image";
  if (mimeType?.startsWith("video/")) return "video";
  if (mimeType?.startsWith("audio/")) return "audio";
  if (ext === "pdf" || mimeType?.includes("pdf")) return "pdf";
  if (["doc", "docx", "txt", "rtf", "odt"].includes(ext) || mimeType?.includes("word") || mimeType?.includes("document")) return "doc";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext) || mimeType?.includes("zip") || mimeType?.includes("compressed")) return "zip";
  if (["js", "ts", "jsx", "tsx", "html", "css", "json", "py", "java", "cpp", "c", "cs"].includes(ext)) return "code";
  return "file";
};

const getFileCategoryIcon = (category) => {
  switch (category) {
    case "pdf": return "📄";
    case "doc": return "📝";
    case "zip": return "📦";
    case "code": return "💻";
    case "video": return "🎥";
    case "audio": return "🎵";
    default: return "📎";
  }
};

const getFileBadgeClass = (category) => {
  switch (category) {
    case "pdf": return "file-icon-pdf";
    case "doc": return "file-icon-doc";
    case "zip": return "file-icon-zip";
    case "code": return "file-icon-code";
    case "video": return "file-icon-video";
    case "audio": return "file-icon-audio";
    default: return "file-icon-generic";
  }
};

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
  const [isDragging, setIsDragging] = useState(false);

  // Attachment Preview Modal State
  const [attachmentModal, setAttachmentModal] = useState({
    isOpen: false,
    file: null,
    dataUrl: null,
    category: null,
    caption: "",
  });

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
          sendMessage(
            selectedChat._id,
            `🎤 Voice Note (${recordingSeconds}s)`,
            "voice",
            audioBase64,
            { fileName: `voice_note_${Date.now()}.webm`, fileSize: audioBlob.size, fileType: "audio/webm" }
          );
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

  // Drag & Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget && !e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // Attachment Upload Handler
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    processSelectedFile(file);
    e.target.value = "";
  };

  const processSelectedFile = (file) => {
    if (!file) return;
    const category = getFileCategory(file.type, file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachmentModal({
        isOpen: true,
        file: file,
        dataUrl: reader.result,
        category: category,
        caption: "",
      });
    };
    reader.readAsDataURL(file);
  };

  const confirmSendAttachment = () => {
    if (!attachmentModal.file || !attachmentModal.dataUrl || !selectedChat) return;

    const { file, dataUrl, category, caption } = attachmentModal;
    const msgType = category === "image" ? "image" : category === "video" ? "video" : category === "audio" ? "voice" : "file";
    const fileMeta = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    };

    sendMessage(
      selectedChat._id,
      caption.trim() || (category === "image" ? `📷 Photo` : category === "video" ? `🎥 Video` : file.name),
      msgType,
      dataUrl,
      fileMeta
    );

    setAttachmentModal({ isOpen: false, file: null, dataUrl: null, category: null, caption: "" });
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
          Real-time WebSockets messaging, live WebRTC Audio/Video calling, drag & drop file sharing, voice notes, and media attachments.
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
    <Box
      flex="1"
      h="100%"
      display="flex"
      flexDirection="column"
      bg="var(--bg-chat)"
      className="chat-wallpaper"
      position="relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <Box className="drag-drop-overlay">
          <Text fontSize="4xl" mb={2}>📁</Text>
          <Text fontSize="xl" fontWeight="bold">Drop File Here to Share</Text>
          <Text fontSize="sm" opacity={0.8}>Supports Images, PDFs, Videos, Documents, Archives & Code</Text>
        </Box>
      )}

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
          const category = getFileCategory(msg.fileType, msg.fileName || msg.content);
          const hasFileUrl = Boolean(msg.fileUrl);

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

                {/* --- RENDER IMAGE ATTACHMENT --- */}
                {msg.type === "image" && hasFileUrl ? (
                  <Box mb={1} position="relative" group="true">
                    <Box position="relative" display="inline-block" overflow="hidden" borderRadius="12px">
                      <Image
                        src={msg.fileUrl}
                        alt="Photo Attachment"
                        maxW="280px"
                        maxH="300px"
                        objectFit="cover"
                        borderRadius="12px"
                        cursor="pointer"
                        transition="transform 0.2s ease"
                        _hover={{ transform: "scale(1.02)" }}
                        onClick={() => {
                          setPreviewImage(msg.fileUrl);
                          onImageOpen();
                        }}
                      />
                      <a
                        href={msg.fileUrl}
                        download={msg.fileName || "photo.png"}
                        className="file-download-btn"
                        style={{ position: "absolute", bottom: "8px", right: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
                        title="Download Photo"
                      >
                        <DownloadIcon />
                      </a>
                    </Box>
                    {msg.content && !msg.content.startsWith("📷 Photo") && (
                      <Text fontSize="sm" mt={1.5} whiteSpace="pre-wrap">
                        {msg.content}
                      </Text>
                    )}
                  </Box>
                ) : msg.type === "video" && hasFileUrl ? (
                  /* --- RENDER VIDEO ATTACHMENT --- */
                  <Box mb={1}>
                    <Box position="relative" maxW="290px" borderRadius="12px" overflow="hidden">
                      <video
                        controls
                        src={msg.fileUrl}
                        style={{ width: "100%", maxHeight: "280px", borderRadius: "12px", background: "#000" }}
                      />
                      <a
                        href={msg.fileUrl}
                        download={msg.fileName || "video.mp4"}
                        className="file-download-btn"
                        style={{ position: "absolute", top: "8px", right: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
                        title="Download Video"
                      >
                        <DownloadIcon />
                      </a>
                    </Box>
                    {msg.content && !msg.content.startsWith("🎥 Video") && (
                      <Text fontSize="sm" mt={1.5} whiteSpace="pre-wrap">
                        {msg.content}
                      </Text>
                    )}
                  </Box>
                ) : msg.type === "voice" ? (
                  /* --- RENDER VOICE NOTE --- */
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Text fontSize="xs" fontWeight="bold" color="var(--color-primary)">
                      {msg.content}
                    </Text>
                    {msg.audioUrl || msg.fileUrl ? (
                      <Box display="flex" alignItems="center" gap={2}>
                        <audio controls src={msg.audioUrl || msg.fileUrl} style={{ height: "36px", width: "230px" }} />
                        <a
                          href={msg.audioUrl || msg.fileUrl}
                          download={msg.fileName || "voice_note.webm"}
                          className="file-download-btn"
                          title="Download Voice Note"
                        >
                          <DownloadIcon />
                        </a>
                      </Box>
                    ) : (
                      <Box display="flex" alignItems="center" gap={2} bg="rgba(0,0,0,0.2)" p={2} borderRadius="md">
                        <span>🔊</span>
                        <Text fontSize="xs" color="var(--text-primary)">Recorded Voice Note</Text>
                      </Box>
                    )}
                  </Box>
                ) : msg.type === "file" || msg.fileName ? (
                  /* --- RENDER FILE / PDF / DOCUMENT / ZIP CARD --- */
                  <Box mb={1}>
                    <Box className="file-attachment-card">
                      <Box className={`file-icon-badge ${getFileBadgeClass(category)}`}>
                        {getFileCategoryIcon(category)}
                      </Box>
                      <Box className="file-info">
                        <Text className="file-name" title={msg.fileName || msg.content}>
                          {msg.fileName || msg.content}
                        </Text>
                        <Text className="file-size">
                          {formatBytes(msg.fileSize)} • {category.toUpperCase()}
                        </Text>
                      </Box>
                      {hasFileUrl && (
                        <a
                          href={msg.fileUrl}
                          download={msg.fileName || "attachment"}
                          className="file-download-btn"
                          title={`Download ${msg.fileName || "File"}`}
                        >
                          <DownloadIcon />
                        </a>
                      )}
                    </Box>
                    {msg.content && msg.content !== msg.fileName && !msg.content.startsWith("📄") && (
                      <Text fontSize="sm" mt={1} whiteSpace="pre-wrap">
                        {msg.content}
                      </Text>
                    )}
                  </Box>
                ) : (
                  /* --- RENDER REGULAR TEXT MESSAGE --- */
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
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip,.rar,.txt,.js,.py"
        />
        <Tooltip label="Attach Photo, Video, PDF, or Document" placement="top">
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
            placeholder="Type a message or drop files to send..."
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

      {/* Attachment Preview & Caption Modal */}
      <Modal isOpen={attachmentModal.isOpen} onClose={() => setAttachmentModal({ isOpen: false, file: null, dataUrl: null, category: null, caption: "" })} isCentered size="lg">
        <ModalOverlay backdropFilter="blur(6px)" />
        <ModalContent bg="var(--bg-card)" color="var(--text-primary)" borderRadius="20px" border="1px solid var(--color-border)">
          <ModalHeader borderBottom="1px solid var(--color-border)" fontSize="lg" fontWeight="bold">
            Send Attachment
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody p={6} display="flex" flexDirection="column" alignItems="center" gap={4}>
            {attachmentModal.category === "image" ? (
              <Image src={attachmentModal.dataUrl} maxH="280px" borderRadius="14px" objectFit="contain" boxShadow="var(--shadow-md)" />
            ) : attachmentModal.category === "video" ? (
              <video controls src={attachmentModal.dataUrl} style={{ maxHeight: "280px", width: "100%", borderRadius: "14px" }} />
            ) : (
              <Box className="file-attachment-card" w="100%" maxW="100%" p={4}>
                <Box className={`file-icon-badge ${getFileBadgeClass(attachmentModal.category)}`} w="48px" h="48px" fontSize="24px">
                  {getFileCategoryIcon(attachmentModal.category)}
                </Box>
                <Box className="file-info">
                  <Text className="file-name" fontSize="sm">{attachmentModal.file?.name}</Text>
                  <Text className="file-size">{formatBytes(attachmentModal.file?.size)} • {attachmentModal.file?.type || "File"}</Text>
                </Box>
              </Box>
            )}

            <Input
              placeholder="Add an optional caption..."
              value={attachmentModal.caption}
              onChange={(e) => setAttachmentModal((prev) => ({ ...prev, caption: e.target.value }))}
              bg="var(--bg-search)"
              border="none"
              borderRadius="14px"
              color="var(--text-primary)"
              _placeholder={{ color: "var(--text-secondary)" }}
            />
          </ModalBody>
          <ModalFooter borderTop="1px solid var(--color-border)" gap={3}>
            <Button variant="ghost" color="var(--text-secondary)" onClick={() => setAttachmentModal({ isOpen: false, file: null, dataUrl: null, category: null, caption: "" })}>
              Cancel
            </Button>
            <Button bg="var(--color-primary)" color="white" _hover={{ bg: "var(--color-primary-hover)" }} onClick={confirmSendAttachment} px={6}>
              Send Attachment
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Image Lightbox Modal */}
      <Modal isOpen={isImageOpen} onClose={onImageClose} size="xl" isCentered>
        <ModalOverlay backdropFilter="blur(8px)" />
        <ModalContent bg="transparent" boxShadow="none">
          <ModalBody p={0} display="flex" justifyContent="center" alignItems="center">
            <Image src={previewImage} maxH="85vh" maxW="90vw" borderRadius="lg" boxShadow="var(--shadow-xl)" />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default SingleChat;
