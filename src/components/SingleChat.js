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
  Badge,
  useDisclosure,
} from "@chakra-ui/react";
import { PhoneIcon, ViewIcon, AttachmentIcon } from "@chakra-ui/icons";
import { ChatState } from "../Context/ChatProvider";
import ProfileModal from "./miscellaneous/ProfileModal";
import VoicePlayer from "./VoicePlayer";
import PollComposerModal from "./miscellaneous/PollComposerModal";
import LocationShareModal from "./miscellaneous/LocationShareModal";

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
    votePoll,
    addPollOption,
    stopLiveLocation,
  } = ChatState();

  const [textInput, setTextInput] = useState("");
  const [newOptionInputs, setNewOptionInputs] = useState({}); // messageId -> string
  const [isRecording, setIsRecording] = useState(false);
  const [recordingState, setRecordingState] = useState("idle"); // "idle" | "recording" | "preview"
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevels, setAudioLevels] = useState([15, 25, 10, 35, 20, 30, 12, 40, 22, 18, 28, 15]);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState(null);
  const [voicePreviewBase64, setVoicePreviewBase64] = useState(null);
  const [voicePreviewBlob, setVoicePreviewBlob] = useState(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    fileUrl: null,
    fileName: null,
    content: null,
    msgId: null,
  });

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
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);

  const activeMessages = selectedChat && typeof selectedChat === "object" ? messagesMap[selectedChat._id] || [] : [];
  const activeTypingText = selectedChat && typeof selectedChat === "object" ? isTypingMap[selectedChat._id] : null;

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length, selectedChat, activeTypingText]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) setContextMenu((prev) => ({ ...prev, visible: false }));
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [contextMenu.visible]);

  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    e.stopPropagation();
    const fileUrl = msg.fileUrl || msg.audioUrl;
    const fileName = msg.fileName || (msg.type === "voice" ? `voice_note_${Date.now()}.webm` : "attachment");
    setContextMenu({
      visible: true,
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 150),
      fileUrl,
      fileName,
      content: msg.content,
      msgId: msg._id,
    });
  };

  const triggerDownload = (fileUrl, fileName) => {
    if (!fileUrl) return;
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = fileName || "download";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  // Handle Real Audio Recording Timer & Recorder
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      if (recordingState === "idle") setRecordingSeconds(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording, recordingState]);

  const stopAudioAnalyzer = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

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

      // Setup Web Audio API Analyzer for dynamic spectrum visualizer
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const analyzeMic = () => {
            if (analyser) {
              analyser.getByteFrequencyData(dataArray);
              const levels = [];
              const step = Math.floor(dataArray.length / 12);
              for (let i = 0; i < 12; i++) {
                const val = dataArray[i * step] || 0;
                levels.push(Math.max(15, Math.min(100, Math.round((val / 255) * 100))));
              }
              setAudioLevels(levels);
            }
            animFrameRef.current = requestAnimationFrame(analyzeMic);
          };
          analyzeMic();
        }
      } catch (e) {
        console.warn("AudioContext visualizer not supported", e);
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingState("recording");
    } catch (err) {
      setIsRecording(true);
      setRecordingState("recording");
    }
  };

  const pauseAndPreviewVoiceRecording = () => {
    stopAudioAnalyzer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const previewUrl = URL.createObjectURL(audioBlob);
        setVoicePreviewUrl(previewUrl);
        setVoicePreviewBlob(audioBlob);

        const reader = new FileReader();
        reader.onloadend = () => {
          setVoicePreviewBase64(reader.result);
        };
        reader.readAsDataURL(audioBlob);

        mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingState("preview");
  };

  const sendVoicePreview = () => {
    if (!selectedChat) return;

    const base64Data = voicePreviewBase64;
    const blobSize = voicePreviewBlob ? voicePreviewBlob.size : 0;
    const durationSec = recordingSeconds || 1;

    sendMessage(
      selectedChat._id,
      `🎤 Voice Note (${durationSec}s)`,
      "voice",
      base64Data,
      { fileName: `voice_note_${Date.now()}.webm`, fileSize: blobSize, fileType: "audio/webm" }
    );

    cancelVoiceRecording();
  };

  const stopAndSendVoiceRecording = () => {
    stopAudioAnalyzer();
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
    setRecordingState("idle");
    setRecordingSeconds(0);
  };

  const cancelVoiceRecording = () => {
    stopAudioAnalyzer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
    }
    if (voicePreviewUrl) {
      URL.revokeObjectURL(voicePreviewUrl);
    }
    setIsRecording(false);
    setRecordingState("idle");
    setRecordingSeconds(0);
    setVoicePreviewUrl(null);
    setVoicePreviewBase64(null);
    setVoicePreviewBlob(null);
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
              <Box
                className={`message-bubble ${isMe ? "sent" : "received"}`}
                onContextMenu={(e) => handleContextMenu(e, msg)}
              >
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
                    </Box>
                    {msg.content && !msg.content.startsWith("🎥 Video") && (
                      <Text fontSize="sm" mt={1.5} whiteSpace="pre-wrap">
                        {msg.content}
                      </Text>
                    )}
                  </Box>
                ) : msg.type === "voice" ? (
                  /* --- RENDER VOICE NOTE WITH CUSTOM AUDIO PLAYER --- */
                  <Box display="flex" flexDirection="column" gap={1}>
                    <VoicePlayer audioUrl={msg.audioUrl || msg.fileUrl} fileName={msg.fileName} isMe={isMe} />
                    {msg.content && !msg.content.startsWith("🎤 Voice Note") && (
                      <Text fontSize="xs" mt={0.5} opacity={0.85} whiteSpace="pre-wrap">
                        {msg.content}
                      </Text>
                    )}
                  </Box>
                ) : msg.type === "poll" && msg.pollData ? (
                  /* --- RENDER ADVANCED INTERACTIVE POLL CARD --- */
                  <Box minW="270px" maxW="330px" py={1}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Text fontSize="md">📊</Text>
                        <Text fontWeight="bold" fontSize="sm" color="var(--text-primary)">
                          {msg.pollData.question}
                        </Text>
                      </Box>
                      {msg.pollData.settings?.isQuizMode && (
                        <Badge colorScheme="purple" fontSize="9px" borderRadius="6px" px={2}>
                          🎯 QUIZ
                        </Badge>
                      )}
                    </Box>

                    <Box display="flex" flexDirection="column" gap={2}>
                      {(() => {
                        const settings = msg.pollData.settings || {};
                        const totalVotes = msg.pollData.options.reduce(
                          (acc, opt) => acc + (opt.voters?.length || 0),
                          0
                        );
                        const hasUserVotedInPoll = msg.pollData.options.some((opt) =>
                          (opt.voters || []).some(
                            (v) => (typeof v === "object" ? v.userId : v) === user?._id
                          )
                        );
                        const isExpired = settings.expiresAt && new Date(settings.expiresAt) < new Date();
                        const isResultsHidden = settings.hideResults && !hasUserVotedInPoll && !isExpired;
                        const isRevotingDisabled = settings.allowRevoting === false && hasUserVotedInPoll;

                        return msg.pollData.options.map((opt) => {
                          const voteCount = opt.voters?.length || 0;
                          const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                          const hasVoted = opt.voters?.some(
                            (v) => (typeof v === "object" ? v.userId : v) === user?._id
                          );
                          const isQuizCorrect = settings.isQuizMode && opt.isCorrect;
                          const isQuizUserChoice = settings.isQuizMode && hasVoted;

                          let bgStyle = hasVoted ? "rgba(249, 115, 22, 0.15)" : "var(--bg-search)";
                          let borderStyle = hasVoted ? "1px solid var(--color-primary)" : "1px solid var(--color-border)";

                          if (settings.isQuizMode && hasUserVotedInPoll) {
                            if (isQuizCorrect) {
                              bgStyle = "rgba(34, 197, 94, 0.2)";
                              borderStyle = "1px solid #22c55e";
                            } else if (isQuizUserChoice && !isQuizCorrect) {
                              bgStyle = "rgba(239, 68, 68, 0.2)";
                              borderStyle = "1px solid #ef4444";
                            }
                          }

                          return (
                            <Box
                              key={opt.id}
                              onClick={() => {
                                if (isRevotingDisabled && !hasVoted) return;
                                if (!isExpired) {
                                  votePoll(selectedChat._id, msg._id, opt.id);
                                }
                              }}
                              p={2.5}
                              borderRadius="12px"
                              bg={bgStyle}
                              border={borderStyle}
                              cursor={isExpired || isRevotingDisabled ? "default" : "pointer"}
                              position="relative"
                              overflow="hidden"
                              transition="all 0.2s ease"
                              _hover={!isExpired && !isRevotingDisabled ? { transform: "scale(1.01)" } : {}}
                            >
                              {/* Animated Progress Bar */}
                              {!isResultsHidden && (
                                <Box
                                  position="absolute"
                                  top="0"
                                  left="0"
                                  bottom="0"
                                  w={`${percent}%`}
                                  bg={
                                    settings.isQuizMode && isQuizCorrect
                                      ? "rgba(34, 197, 94, 0.3)"
                                      : hasVoted
                                      ? "rgba(249, 115, 22, 0.3)"
                                      : "rgba(255, 255, 255, 0.08)"
                                  }
                                  transition="width 0.4s ease"
                                  pointerEvents="none"
                                />
                              )}

                              <Box
                                display="flex"
                                alignItems="center"
                                justifyContent="space-between"
                                position="relative"
                                zIndex="1"
                              >
                                <Box display="flex" alignItems="center" gap={2.5}>
                                  <Box
                                    w="16px"
                                    h="16px"
                                    borderRadius={settings.allowMultiple ? "4px" : "50%"}
                                    border={
                                      hasVoted
                                        ? "5px solid var(--color-primary)"
                                        : "2px solid var(--text-secondary)"
                                    }
                                    bg={hasVoted ? "white" : "transparent"}
                                  />
                                  <Text fontSize="sm" fontWeight={hasVoted ? "bold" : "normal"}>
                                    {opt.text}
                                  </Text>
                                  {settings.isQuizMode && hasUserVotedInPoll && isQuizCorrect && (
                                    <Text fontSize="xs">🎉 Correct</Text>
                                  )}
                                  {settings.isQuizMode && hasUserVotedInPoll && isQuizUserChoice && !isQuizCorrect && (
                                    <Text fontSize="xs">❌</Text>
                                  )}
                                </Box>

                                <Text fontSize="xs" fontWeight="bold" opacity={0.9}>
                                  {isResultsHidden ? "• • •" : `${percent}% (${voteCount})`}
                                </Text>
                              </Box>

                              {/* Show Voter Avatars based on Privacy Settings */}
                              {(settings.voterPrivacyMode === "public" ||
                                (settings.voterPrivacyMode === "creator_only" && msg.sender?._id === user?._id)) &&
                                opt.voters?.length > 0 && (
                                  <Box display="flex" alignItems="center" gap={1} mt={1.5} pl={6}>
                                    {opt.voters.slice(0, 4).map((voter, vIdx) => (
                                      <Avatar
                                        key={vIdx}
                                        size="2xs"
                                        name={typeof voter === "object" ? voter.name : "User"}
                                        src={typeof voter === "object" ? voter.pic : ""}
                                      />
                                    ))}
                                    {opt.voters.length > 4 && (
                                      <Text fontSize="10px" color="var(--text-secondary)">
                                        +{opt.voters.length - 4}
                                      </Text>
                                    )}
                                  </Box>
                                )}
                            </Box>
                          );
                        });
                      })()}
                    </Box>

                    {/* Quiz Explanation Card (revealed after voting) */}
                    {msg.pollData.settings?.isQuizMode &&
                      msg.pollData.options.some((o) => (o.voters || []).some((v) => (typeof v === "object" ? v.userId : v) === user?._id)) &&
                      msg.pollData.settings?.quizExplanation && (
                        <Box mt={2.5} p={2.5} bg="rgba(59, 130, 246, 0.12)" borderRadius="12px" border="1px solid rgba(59, 130, 246, 0.3)">
                          <Text fontSize="xs" fontWeight="bold" color="#3b82f6" mb={0.5}>
                            💡 Explanation:
                          </Text>
                          <Text fontSize="xs" color="var(--text-primary)" lineHeight="1.3">
                            {msg.pollData.settings.quizExplanation}
                          </Text>
                        </Box>
                      )}

                    {/* Inline "+ Add Option" Input if allowAddingOptions is ON */}
                    {msg.pollData.settings?.allowAddingOptions && (
                      <Box mt={2.5} display="flex" gap={2}>
                        <Input
                          placeholder="Suggest a new option..."
                          size="xs"
                          borderRadius="10px"
                          bg="var(--bg-search)"
                          border="1px solid var(--color-border)"
                          value={newOptionInputs[msg._id] || ""}
                          onChange={(e) =>
                            setNewOptionInputs((prev) => ({ ...prev, [msg._id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newOptionInputs[msg._id]?.trim()) {
                              addPollOption(selectedChat._id, msg._id, newOptionInputs[msg._id]);
                              setNewOptionInputs((prev) => ({ ...prev, [msg._id]: "" }));
                            }
                          }}
                        />
                        <Button
                          size="xs"
                          colorScheme="orange"
                          variant="solid"
                          borderRadius="10px"
                          onClick={() => {
                            if (newOptionInputs[msg._id]?.trim()) {
                              addPollOption(selectedChat._id, msg._id, newOptionInputs[msg._id]);
                              setNewOptionInputs((prev) => ({ ...prev, [msg._id]: "" }));
                            }
                          }}
                        >
                          Add
                        </Button>
                      </Box>
                    )}

                    {/* Poll Card Footer Badges */}
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      mt={2.5}
                      pt={1.5}
                      borderTop="1px solid var(--color-border)"
                      fontSize="10px"
                      color="var(--text-muted)"
                    >
                      <span>
                        {msg.pollData.options.reduce((acc, opt) => acc + (opt.voters?.length || 0), 0)} votes
                        {msg.pollData.settings?.voterPrivacyMode === "anonymous"
                          ? " • 🔒 Anonymous"
                          : msg.pollData.settings?.voterPrivacyMode === "creator_only"
                          ? " • 🔒 Visible to creator"
                          : ""}
                        {msg.pollData.settings?.allowMultiple
                          ? msg.pollData.settings?.maxChoices && msg.pollData.settings?.maxChoices !== "unlimited"
                            ? ` • Select up to ${msg.pollData.settings.maxChoices}`
                            : " • Multi-select"
                          : ""}
                      </span>

                      {msg.pollData.settings?.expiresAt && (
                        <Badge
                          colorScheme={
                            new Date(msg.pollData.settings.expiresAt) < new Date() ? "gray" : "green"
                          }
                          fontSize="9px"
                          borderRadius="6px"
                        >
                          {new Date(msg.pollData.settings.expiresAt) < new Date() ? "Closed" : "Active"}
                        </Badge>
                      )}
                    </Box>
                  </Box>
                ) : (msg.type === "location" || msg.type === "live_location") && msg.locationData ? (
                  /* --- RENDER LOCATION / LIVE LOCATION CARD --- */
                  <Box minW="260px" maxW="300px" py={1}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Text fontSize="sm">{msg.type === "live_location" ? "🛰️" : "📍"}</Text>
                        <Text fontWeight="bold" fontSize="xs" color="var(--color-primary)">
                          {msg.type === "live_location" ? "Live Location" : "Shared Location"}
                        </Text>
                      </Box>
                      {msg.type === "live_location" && (
                        <Badge
                          colorScheme={msg.locationData.isLive ? "green" : "gray"}
                          borderRadius="6px"
                          fontSize="9px"
                          px={1.5}
                        >
                          {msg.locationData.isLive ? "LIVE NOW" : "ENDED"}
                        </Badge>
                      )}
                    </Box>

                    {/* Interactive OpenStreetMap Embed Frame */}
                    <Box w="100%" h="130px" borderRadius="12px" overflow="hidden" position="relative" bg="#1e293b" mb={2}>
                      <iframe
                        title="Map View"
                        width="100%"
                        height="130"
                        frameBorder="0"
                        scrolling="no"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${msg.locationData.lng - 0.005}%2C${msg.locationData.lat - 0.005}%2C${msg.locationData.lng + 0.005}%2C${msg.locationData.lat + 0.005}&layer=mapnik&marker=${msg.locationData.lat}%2C${msg.locationData.lng}`}
                        style={{ filter: "brightness(0.9) contrast(1.1)", pointerEvents: "none" }}
                      />
                    </Box>

                    <Text fontSize="xs" fontWeight="600" mb={1} whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
                      {msg.locationData.name || `Lat: ${msg.locationData.lat.toFixed(4)}, Lng: ${msg.locationData.lng.toFixed(4)}`}
                    </Text>

                    <Box display="flex" gap={2} mt={2}>
                      <Button
                        as="a"
                        href={msg.locationData.mapUrl || `https://www.openstreetmap.org/?mlat=${msg.locationData.lat}&mlon=${msg.locationData.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="xs"
                        variant="solid"
                        bg="var(--bg-search)"
                        color="var(--text-primary)"
                        _hover={{ bg: "var(--bg-hover)" }}
                        flex="1"
                      >
                        🗺️ Open Map
                      </Button>

                      {msg.type === "live_location" && msg.locationData.isLive && msg.sender?._id === user?._id && (
                        <Button
                          size="xs"
                          colorScheme="red"
                          variant="outline"
                          onClick={() => stopLiveLocation(selectedChat._id, msg._id)}
                        >
                          ⏹️ Stop
                        </Button>
                      )}
                    </Box>
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

        {/* File & Media Attachment Button with Expanded Rich Menu */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileUpload}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip,.rar,.txt,.js,.py"
        />

        <Popover placement="top-start">
          <PopoverTrigger>
            <IconButton
              icon={<AttachmentIcon fontSize="19px" />}
              size="md"
              variant="ghost"
              color="var(--text-header)"
              _hover={{ bg: "rgba(255,255,255,0.15)" }}
            />
          </PopoverTrigger>
          <PopoverContent bg="var(--bg-card)" borderColor="var(--color-border)" w="220px" p={2} borderRadius="16px" boxShadow="var(--shadow-xl)" zIndex="2000">
            <PopoverBody p={1} display="flex" flexDirection="column" gap={1}>
              <Box
                display="flex"
                alignItems="center"
                gap={3}
                p={2.5}
                borderRadius="12px"
                cursor="pointer"
                _hover={{ bg: "var(--bg-search)" }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Text fontSize="18px">📷</Text>
                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="var(--text-primary)">
                    Photo / Video / File
                  </Text>
                  <Text fontSize="10px" color="var(--text-secondary)">
                    Images, PDFs & documents
                  </Text>
                </Box>
              </Box>

              <Box
                display="flex"
                alignItems="center"
                gap={3}
                p={2.5}
                borderRadius="12px"
                cursor="pointer"
                _hover={{ bg: "var(--bg-search)" }}
                onClick={() => setIsPollModalOpen(true)}
              >
                <Text fontSize="18px">📊</Text>
                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="var(--text-primary)">
                    Create Poll
                  </Text>
                  <Text fontSize="10px" color="var(--text-secondary)">
                    Interactive voting card
                  </Text>
                </Box>
              </Box>

              <Box
                display="flex"
                alignItems="center"
                gap={3}
                p={2.5}
                borderRadius="12px"
                cursor="pointer"
                _hover={{ bg: "var(--bg-search)" }}
                onClick={() => setIsLocationModalOpen(true)}
              >
                <Text fontSize="18px">📍</Text>
                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="var(--text-primary)">
                    Share Location
                  </Text>
                  <Text fontSize="10px" color="var(--text-secondary)">
                    Static map or Live tracking
                  </Text>
                </Box>
              </Box>
            </PopoverBody>
          </PopoverContent>
        </Popover>

        {/* Main Text Input or Voice Recorder / Audio Preview */}
        {recordingState === "recording" ? (
          <Box flex="1" bg="var(--bg-search)" borderRadius="20px" px={4} py={2} display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={3}>
              <Box className="recording-dot" />
              <Text fontSize="xs" color="#f44336" fontWeight="bold" minW="60px">
                00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}s
              </Text>
              
              {/* Dynamic Live Mic Spectrum Visualizer */}
              <Box display="flex" alignItems="center" gap="3px" h="24px" px={2}>
                {audioLevels.map((lvl, idx) => (
                  <span
                    key={idx}
                    className="live-mic-bar"
                    style={{ height: `${lvl}%` }}
                  />
                ))}
              </Box>
            </Box>

            <Box display="flex" gap={2} alignItems="center">
              <Button size="xs" colorScheme="red" variant="ghost" onClick={cancelVoiceRecording}>
                Discard
              </Button>
              <Button size="xs" colorScheme="yellow" variant="solid" onClick={pauseAndPreviewVoiceRecording}>
                ⏸️ Preview
              </Button>
              <Button size="xs" bg="var(--color-primary)" color="white" _hover={{ bg: "var(--color-primary-hover)" }} onClick={stopAndSendVoiceRecording}>
                🚀 Send
              </Button>
            </Box>
          </Box>
        ) : recordingState === "preview" ? (
          <Box flex="1" bg="var(--bg-search)" borderRadius="20px" px={3} py={1.5} display="flex" alignItems="center" justifyContent="space-between" gap={2}>
            <Box display="flex" alignItems="center" gap={2} flex="1">
              <Text fontSize="xs" fontWeight="bold" color="var(--color-primary)" whiteSpace="nowrap">
                Preview ({recordingSeconds}s):
              </Text>
              {voicePreviewUrl && <VoicePlayer audioUrl={voicePreviewUrl} isMe={false} />}
            </Box>
            <Box display="flex" gap={2}>
              <Button size="xs" colorScheme="red" variant="ghost" onClick={cancelVoiceRecording}>
                Discard
              </Button>
              <Button size="xs" bg="var(--color-primary)" color="white" _hover={{ bg: "var(--color-primary-hover)" }} onClick={sendVoicePreview}>
                🚀 Send Voice
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

      {/* Floating Custom Right-Click Context Menu */}
      {contextMenu.visible && (
        <Box
          position="fixed"
          top={`${contextMenu.y}px`}
          left={`${contextMenu.x}px`}
          bg="var(--bg-header)"
          border="1px solid var(--color-border)"
          borderRadius="14px"
          boxShadow="0 10px 30px rgba(0,0,0,0.4)"
          zIndex="9999"
          py={1.5}
          px={1.5}
          minW="180px"
          backdropFilter="blur(12px)"
        >
          {contextMenu.fileUrl && (
            <Box
              display="flex"
              alignItems="center"
              gap={2.5}
              px={3}
              py={2}
              borderRadius="10px"
              cursor="pointer"
              color="var(--text-primary)"
              fontSize="13px"
              fontWeight="600"
              _hover={{ bg: "var(--color-primary)", color: "white" }}
              onClick={() => triggerDownload(contextMenu.fileUrl, contextMenu.fileName)}
            >
              <DownloadIcon />
              <span>Download File</span>
            </Box>
          )}

          {contextMenu.content && (
            <Box
              display="flex"
              alignItems="center"
              gap={2.5}
              px={3}
              py={2}
              borderRadius="10px"
              cursor="pointer"
              color="var(--text-primary)"
              fontSize="13px"
              fontWeight="500"
              _hover={{ bg: "var(--bg-hover)" }}
              onClick={() => {
                navigator.clipboard.writeText(contextMenu.content);
                setContextMenu((prev) => ({ ...prev, visible: false }));
              }}
            >
              <span>📋</span>
              <span>Copy Message</span>
            </Box>
          )}

          {contextMenu.fileUrl && (
            <Box
              display="flex"
              alignItems="center"
              gap={2.5}
              px={3}
              py={2}
              borderRadius="10px"
              cursor="pointer"
              color="var(--text-primary)"
              fontSize="13px"
              fontWeight="500"
              _hover={{ bg: "var(--bg-hover)" }}
              onClick={() => {
                navigator.clipboard.writeText(contextMenu.fileUrl);
                setContextMenu((prev) => ({ ...prev, visible: false }));
              }}
            >
              <span>🔗</span>
              <span>Copy Link</span>
            </Box>
          )}
        </Box>
      )}

      {/* Interactive Poll Composer Modal */}
      <PollComposerModal
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
        onSendPoll={(pollData) => {
          if (selectedChat) {
            sendMessage(selectedChat._id, `📊 ${pollData.question}`, "poll", pollData);
          }
        }}
      />

      {/* Interactive Location Share Modal */}
      <LocationShareModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSendLocation={({ type, locationData }) => {
          if (selectedChat) {
            sendMessage(
              selectedChat._id,
              type === "live_location" ? "🛰️ Live Location" : `📍 ${locationData.name || "Location"}`,
              type,
              locationData
            );
          }
        }}
      />
    </Box>
  );
};

export default SingleChat;
