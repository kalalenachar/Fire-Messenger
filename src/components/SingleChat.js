import React, { useState, useRef, useEffect, useCallback } from "react";
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
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Flex,
} from "@chakra-ui/react";
import {
  PhoneIcon,
  ViewIcon,
  AttachmentIcon,
  ArrowBackIcon,
  SearchIcon,
  CloseIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@chakra-ui/icons";
import { ChatState } from "../Context/ChatProvider";
import ProfileModal from "./miscellaneous/ProfileModal";
import VoicePlayer from "./VoicePlayer";
import PollComposerModal from "./miscellaneous/PollComposerModal";
import LocationShareModal from "./miscellaneous/LocationShareModal";
import ForwardModal from "./miscellaneous/ForwardModal";
import EditMessageModal from "./miscellaneous/EditMessageModal";
import DisappearingTimerModal from "./miscellaneous/DisappearingTimerModal";
import MediaLightboxModal from "./miscellaneous/MediaLightboxModal";
import FormattedMarkdown from "./FormattedMarkdown";
import VerifiedBadge from "./common/VerifiedBadge";
import ReportModal from "./miscellaneous/ReportModal";

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
    setSelectedChat,
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
    togglePinChat,
    isChatPinned,
    pinChatMessage,
    unpinChatMessage,
    toggleStarMessage,
    saveToSavedMessages,
    deleteMessage,
    hideChat,
    unhideChat,
    isChatHidden,
    blockUser,
    unblockUser,
    isUserBlocked,
    draftsMap,
    setDraftForChat,
    sendBridgeMessage,
  } = ChatState();

  const [textInput, setTextInput] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [newOptionInputs, setNewOptionInputs] = useState({}); // messageId -> string
  const [isRecording, setIsRecording] = useState(false);
  const [recordingState, setRecordingState] = useState("idle"); // "idle" | "recording" | "preview"
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevels, setAudioLevels] = useState([15, 25, 10, 35, 20, 30, 12, 40, 22, 18, 28, 15]);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState(null);
  const [voicePreviewBase64, setVoicePreviewBase64] = useState(null);
  const [voicePreviewBlob, setVoicePreviewBlob] = useState(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, msg: null });
  const [forwardModal, setForwardModal] = useState({ isOpen: false, msg: null });
  const [editModal, setEditModal] = useState({ isOpen: false, msg: null });
  const [disappearingModal, setDisappearingModal] = useState(false);
  const [lightboxData, setLightboxData] = useState({ isOpen: false, url: "", type: "image", name: "" });

  // In-Chat Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);

  // Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    fileUrl: null,
    fileName: null,
    content: null,
    msgId: null,
    msgObj: null,
  });

  // Attachment Preview Modal State
  const [attachmentModal, setAttachmentModal] = useState({
    isOpen: false,
    file: null,
    dataUrl: null,
    category: null,
    caption: "",
  });

  const timerRef = useRef(null);
  const typingTimerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messageRefs = useRef({});
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);

  const activeMessages = React.useMemo(() => {
    return selectedChat && typeof selectedChat === "object" ? messagesMap[selectedChat._id] || [] : [];
  }, [selectedChat, messagesMap]);

  const activeTypingText = selectedChat && typeof selectedChat === "object" ? isTypingMap[selectedChat._id] : null;

  // Restore draft when switching chats
  useEffect(() => {
    if (selectedChat && selectedChat._id) {
      const savedDraft = draftsMap?.[selectedChat._id] || "";
      setTextInput(savedDraft);
      setReplyingTo(null);
      setIsSearchOpen(false);
      setSearchQuery("");
    } else {
      setTextInput("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat?._id]);

  // Scroll to bottom when messages update (unless searching)
  useEffect(() => {
    if (!isSearchOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeMessages.length, selectedChat, activeTypingText, isSearchOpen]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) setContextMenu((prev) => ({ ...prev, visible: false }));
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [contextMenu.visible]);

  // In-Chat Search Matches
  const searchMatches = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const indices = [];
    activeMessages.forEach((msg, idx) => {
      if (msg.content && msg.content.toLowerCase().includes(q) && !msg.isDeleted) {
        indices.push(idx);
      }
    });
    return indices;
  }, [searchQuery, activeMessages]);

  const scrollToMessage = useCallback((msgId) => {
    if (!msgId) return;
    const el = messageRefs.current[msgId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("highlight-flash");
      setTimeout(() => el.classList.remove("highlight-flash"), 2000);
    }
  }, []);

  const handleNextSearchMatch = () => {
    if (searchMatches.length === 0) return;
    const nextIdx = (searchMatchIndex + 1) % searchMatches.length;
    setSearchMatchIndex(nextIdx);
    const targetMsg = activeMessages[searchMatches[nextIdx]];
    if (targetMsg) scrollToMessage(targetMsg._id);
  };

  const handlePrevSearchMatch = () => {
    if (searchMatches.length === 0) return;
    const prevIdx = (searchMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setSearchMatchIndex(prevIdx);
    const targetMsg = activeMessages[searchMatches[prevIdx]];
    if (targetMsg) scrollToMessage(targetMsg._id);
  };

  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    e.stopPropagation();
    const fileUrl = msg.fileUrl || msg.audioUrl;
    const fileName = msg.fileName || (msg.type === "voice" ? `voice_note_${Date.now()}.webm` : "attachment");
    setContextMenu({
      visible: true,
      x: Math.min(e.clientX, window.innerWidth - 220),
      y: Math.min(e.clientY, window.innerHeight - 280),
      fileUrl,
      fileName,
      content: msg.content,
      msgId: msg._id,
      msgObj: msg,
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
      setDraftForChat?.(selectedChat._id, val);
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
        console.warn("AudioContext visualizer notice:", e);
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
      { fileName: `voice_note_${Date.now()}.webm`, fileSize: blobSize, fileType: "audio/webm", replyTo: replyingTo }
    );

    setReplyingTo(null);
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
            `🎤 Voice Note (${recordingSeconds || 1}s)`,
            "voice",
            audioBase64,
            { fileName: `voice_note_${Date.now()}.webm`, fileSize: audioBlob.size, fileType: "audio/webm", replyTo: replyingTo }
          );
        };
        reader.readAsDataURL(audioBlob);
        mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current.stop();
    }
    setReplyingTo(null);
    setIsRecording(false);
    setRecordingState("idle");
    setRecordingSeconds(0);
    setVoicePreviewUrl(null);
    setVoicePreviewBase64(null);
  };

  const cancelVoiceRecording = () => {
    stopAudioAnalyzer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingState("idle");
    setRecordingSeconds(0);
    setVoicePreviewUrl(null);
    setVoicePreviewBase64(null);
    setVoicePreviewBlob(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.relatedTarget === null || !e.currentTarget.contains(e.relatedTarget)) {
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
      replyTo: replyingTo,
    };

    sendMessage(
      selectedChat._id,
      caption.trim() || (category === "image" ? `📷 Photo` : category === "video" ? `🎥 Video` : file.name),
      msgType,
      dataUrl,
      fileMeta
    );

    setReplyingTo(null);
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
          Agni Messenger Web
        </Text>
        <Text fontSize="sm" color="var(--text-secondary)" maxW="400px">
          Real-time WebSockets messaging, live WebRTC Audio/Video calling, drag & drop file sharing, voice notes, and media attachments.
        </Text>
      </Box>
    );
  }

  const getHeaderInfo = () => {
    if (selectedChat.isSavedMessages || selectedChat._id?.startsWith("chat_saved_")) {
      return {
        title: "Saved Messages",
        avatar: null,
        isSavedMessages: true,
        status: "Your personal cloud storage 🔖",
      };
    }
    if (selectedChat.isGroupChat) {
      const groupStatus = selectedChat.platform === "whatsapp"
        ? "🟢 WhatsApp Group (E2EE Active)"
        : selectedChat.platform === "telegram"
        ? "🔵 Telegram Supergroup"
        : activeTypingText || `${selectedChat.users?.length || 3} members`;

      return {
        title: selectedChat.chatName,
        avatar: selectedChat.groupPic || selectedChat.pic || null,
        status: groupStatus,
      };
    }
    const otherUser = selectedChat.users?.find((u) => u._id !== user?._id) || selectedChat.users?.[0];
    const isBlocked = otherUser ? isUserBlocked?.(otherUser._id) : false;
    const directStatus = isBlocked
      ? "🚫 Blocked"
      : selectedChat.platform === "whatsapp"
      ? "🟢 Online via WhatsApp (Noise E2EE)"
      : selectedChat.platform === "telegram"
      ? "🔵 Synced via Telegram Client"
      : activeTypingText || otherUser?.status || "Online";

    return {
      title: otherUser?.name || selectedChat.chatName,
      avatar: otherUser?.pic || selectedChat.pic || null,
      status: directStatus,
      userObj: otherUser,
      isBlocked,
    };
  };

  const header = getHeaderInfo();

  const handleSend = () => {
    if (!textInput.trim()) return;
    if (selectedChat) {
      sendTypingStatus(selectedChat._id, false);
      setDraftForChat?.(selectedChat._id, "");
    }
    if (selectedChat?.platform === "whatsapp" || selectedChat?.platform === "telegram") {
      sendBridgeMessage(selectedChat.platform, {
        chatId: selectedChat._id,
        content: textInput,
        replyTo: replyingTo,
      });
    } else {
      sendMessage(selectedChat._id, textInput, "text", null, { replyTo: replyingTo });
    }
    setTextInput("");
    setReplyingTo(null);
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

  const availableEmojis = ["🔥", "❤️", "👍", "😂", "👏", "🚀", "💻", "✨", "🎉", "😮", "🙏", "💯"];

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
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton
            display={{ base: "flex", md: "none" }}
            icon={<ArrowBackIcon fontSize="20px" />}
            onClick={() => setSelectedChat(null)}
            aria-label="Back to chat list"
            variant="ghost"
            color="var(--text-header)"
            size="sm"
            mr={1}
          />
          {header.isSavedMessages ? (
            <Box
              w="40px"
              h="40px"
              borderRadius="50%"
              bg="linear-gradient(135deg, #2AABEE, #229ED9)"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="20px"
              boxShadow="0 2px 8px rgba(42, 171, 238, 0.4)"
              color="white"
            >
              🔖
            </Box>
          ) : (
            <Avatar size="md" name={header.title} src={header.avatar} border="2px solid var(--text-header)" />
          )}
          <Box>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Text fontWeight="600" fontSize="md" color="var(--text-header)" lineHeight="1.2">
                {header.title}
              </Text>
              {header.userObj && <VerifiedBadge user={header.userObj} size="sm" />}
              {isChatPinned?.(selectedChat._id) && (
                <Text fontSize="xs" title="Pinned Chat" opacity={0.85}>
                  📌
                </Text>
              )}
              {selectedChat.disappearingTimer > 0 && (
                <Text fontSize="xs" title={`Disappearing messages: ${selectedChat.disappearingTimer === 86400 ? "24h" : selectedChat.disappearingTimer === 604800 ? "7d" : "90d"}`}>
                  ⏳
                </Text>
              )}
            </Box>
            <Text
              fontSize="xs"
              color={activeTypingText ? "#38bdf8" : theme === "light" ? "#e0f2fe" : "var(--color-online)"}
              fontWeight={activeTypingText ? "bold" : "normal"}
            >
              {header.status}
            </Text>
          </Box>
        </Box>

        <Box display="flex" gap={1.5} alignItems="center">
          {/* In-Chat Search Button */}
          <Tooltip label="Search in Chat" placement="bottom">
            <IconButton
              icon={<SearchIcon />}
              size="sm"
              variant="ghost"
              color="var(--text-header)"
              _hover={{ bg: "rgba(255,255,255,0.15)" }}
              onClick={() => {
                setIsSearchOpen((prev) => !prev);
                if (isSearchOpen) setSearchQuery("");
              }}
            />
          </Tooltip>

          {/* Pin / Unpin Button */}
          <Tooltip label={isChatPinned?.(selectedChat._id) ? "Unpin Chat" : "Pin Chat"} placement="bottom">
            <IconButton
              icon={<span style={{ fontSize: "16px" }}>{isChatPinned?.(selectedChat._id) ? "📌" : "📍"}</span>}
              size="sm"
              variant="ghost"
              color="var(--text-header)"
              _hover={{ bg: "rgba(255,255,255,0.15)" }}
              onClick={() => togglePinChat?.(selectedChat._id)}
            />
          </Tooltip>

          {header.userObj && (
            <>
              <Tooltip label="HD Voice Call" placement="bottom">
                <IconButton
                  icon={<PhoneIcon />}
                  size="sm"
                  variant="ghost"
                  color="var(--text-header)"
                  _hover={{ bg: "rgba(255,255,255,0.15)" }}
                  onClick={() => startCall(header.userObj, "audio", selectedChat._id)}
                />
              </Tooltip>
              <Tooltip label="HD Video Call" placement="bottom">
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

          {/* Chat More Options Menu */}
          <Menu placement="bottom-end">
            <MenuButton
              as={IconButton}
              icon={<span style={{ fontSize: "18px" }}>⋮</span>}
              size="sm"
              variant="ghost"
              color="var(--text-header)"
              _hover={{ bg: "rgba(255,255,255,0.15)" }}
            />
            <MenuList bg="var(--bg-menu)" borderColor="var(--color-border)" color="var(--text-primary)" zIndex={3000}>
              <MenuItem
                icon={<span>⏳</span>}
                bg="transparent"
                _hover={{ bg: "var(--bg-hover)" }}
                onClick={() => setDisappearingModal(true)}
              >
                Disappearing Messages
              </MenuItem>
              <MenuItem
                icon={<span>🔍</span>}
                bg="transparent"
                _hover={{ bg: "var(--bg-hover)" }}
                onClick={() => setIsSearchOpen(true)}
              >
                Search Messages
              </MenuItem>
              <MenuDivider borderColor="var(--color-border)" />
              <MenuItem
                icon={<span>⚠️</span>}
                bg="transparent"
                _hover={{ bg: "var(--bg-hover)" }}
                color="#ffb74d"
                onClick={() => setReportTarget(header.userObj || selectedChat)}
              >
                Report Chat
              </MenuItem>
            </MenuList>
          </Menu>
        </Box>
      </Box>

      {/* In-Chat Search Bar Overlay */}
      {isSearchOpen && (
        <Flex
          bg="var(--bg-header)"
          p={2.5}
          borderBottom="1px solid var(--color-border)"
          align="center"
          gap={2}
          zIndex={5}
          animation="fadeIn 0.2s ease"
        >
          <InputGroup size="sm" flex="1">
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="var(--text-secondary)" />
            </InputLeftElement>
            <Input
              placeholder="Search in this chat..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchMatchIndex(0);
              }}
              bg="var(--bg-search)"
              borderColor="var(--color-border)"
              borderRadius="full"
              autoFocus
            />
            {searchQuery && (
              <InputRightElement>
                <IconButton
                  icon={<CloseIcon boxSize={2.5} />}
                  size="xs"
                  variant="ghost"
                  onClick={() => setSearchQuery("")}
                />
              </InputRightElement>
            )}
          </InputGroup>

          {searchMatches.length > 0 && (
            <Flex align="center" gap={1}>
              <Text fontSize="xs" color="var(--text-secondary)" whiteSpace="nowrap">
                {searchMatchIndex + 1} of {searchMatches.length}
              </Text>
              <IconButton
                icon={<ChevronUpIcon fontSize="18px" />}
                size="xs"
                variant="ghost"
                onClick={handlePrevSearchMatch}
                title="Previous Match"
              />
              <IconButton
                icon={<ChevronDownIcon fontSize="18px" />}
                size="xs"
                variant="ghost"
                onClick={handleNextSearchMatch}
                title="Next Match"
              />
            </Flex>
          )}

          {searchQuery && searchMatches.length === 0 && (
            <Text fontSize="xs" color="var(--text-muted)" whiteSpace="nowrap">
              No results
            </Text>
          )}

          <IconButton
            icon={<CloseIcon boxSize={3} />}
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsSearchOpen(false);
              setSearchQuery("");
            }}
          />
        </Flex>
      )}

      {/* Pinned Message Sticky Banner */}
      {selectedChat.pinnedMessage && (
        <Flex
          bg="var(--bg-header)"
          px={4}
          py={2}
          borderBottom="1px solid var(--color-border)"
          align="center"
          justify="space-between"
          cursor="pointer"
          _hover={{ bg: "var(--bg-hover)" }}
          onClick={() => scrollToMessage(selectedChat.pinnedMessage._id)}
          zIndex={4}
        >
          <Flex align="center" gap={3} overflow="hidden">
            <Text fontSize="md">📌</Text>
            <Box overflow="hidden">
              <Text fontSize="xs" fontWeight="bold" color="var(--color-primary)" lineHeight="1.1">
                Pinned Message • {selectedChat.pinnedMessage.sender?.name || "Sender"}
              </Text>
              <Text fontSize="xs" color="var(--text-secondary)" noOfLines={1}>
                {selectedChat.pinnedMessage.content || "Attachment"}
              </Text>
            </Box>
          </Flex>
          <IconButton
            icon={<CloseIcon boxSize={2.5} />}
            size="xs"
            variant="ghost"
            title="Unpin Message"
            onClick={(e) => {
              e.stopPropagation();
              unpinChatMessage(selectedChat._id);
            }}
          />
        </Flex>
      )}

      {/* Messages Scroll Area */}
      <Box flex="1" overflowY="auto" p={4} display="flex" flexDirection="column" gap={2.5}>
        <Box alignSelf="center" my={2} px={3} py={1} borderRadius="12px" bg="var(--bg-header)" color="var(--text-muted)" fontSize="11px" fontWeight="600">
          TODAY
        </Box>

        {activeMessages.map((msg, index) => {
          const isMe = msg.sender?._id === user?._id;
          const showHoverReactions = hoveredMsgId === msg._id;
          const category = getFileCategory(msg.fileType, msg.fileName || msg.content);
          const hasFileUrl = Boolean(msg.fileUrl);
          const isStarred = Array.isArray(msg.isStarredBy) && msg.isStarredBy.includes(user?._id);
          const isSearchMatch = searchMatches.includes(index);

          return (
            <Box
              key={msg._id}
              ref={(el) => (messageRefs.current[msg._id] = el)}
              display="flex"
              flexDirection="column"
              alignItems={isMe ? "flex-end" : "flex-start"}
              position="relative"
              onMouseEnter={() => setHoveredMsgId(msg._id)}
              onMouseLeave={() => setHoveredMsgId(null)}
              className={isSearchMatch ? "search-highlight-row" : ""}
            >
              {/* Floating Reaction & Action Bar on Hover */}
              {showHoverReactions && !msg.isDeleted && (
                <Box className="reaction-bar">
                  {["👍", "❤️", "🔥", "😂", "👏", "🎉"].map((emoji) => (
                    <button
                      key={emoji}
                      className="reaction-btn"
                      onClick={() => toggleReaction(selectedChat._id, msg._id, emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    className="reaction-btn"
                    title="Reply / Quote 💬"
                    onClick={() => setReplyingTo(msg)}
                  >
                    💬
                  </button>
                  <button
                    className="reaction-btn"
                    title={isStarred ? "Unstar Message ⭐" : "Star Message ⭐"}
                    onClick={() => toggleStarMessage(selectedChat._id, msg._id)}
                  >
                    {isStarred ? "★" : "☆"}
                  </button>
                  <button
                    className="reaction-btn"
                    title="Forward Message ↗️"
                    onClick={() => setForwardModal({ isOpen: true, msg })}
                  >
                    ↗️
                  </button>
                  <button
                    className="reaction-btn"
                    title="Save to Cloud 🔖"
                    onClick={() => saveToSavedMessages?.(msg)}
                  >
                    🔖
                  </button>
                  <button
                    className="reaction-btn"
                    title="Delete Message 🗑️"
                    onClick={(e) => {
                      e.stopPropagation();
                      const isSavedChat = selectedChat.isSavedMessages || selectedChat._id?.startsWith("chat_saved_");
                      if (isSavedChat) {
                        deleteMessage(selectedChat._id, msg._id, true);
                      } else {
                        setDeleteModal({ isOpen: true, msg });
                      }
                    }}
                  >
                    🗑️
                  </button>
                </Box>
              )}

              {/* Message Bubble */}
              <Box
                className={`message-bubble ${isMe ? "sent" : "received"}`}
                onContextMenu={(e) => !msg.isDeleted && handleContextMenu(e, msg)}
              >
                {msg.isDeleted ? (
                  <Box display="flex" alignItems="center" gap={1.5} color="var(--text-muted)" fontStyle="italic" fontSize="13px" py={0.5}>
                    <span style={{ fontSize: "14px" }}>🚫</span>
                    <span>This message was deleted</span>
                  </Box>
                ) : (
                  <>
                    {/* Forwarded Header */}
                    {msg.isForwarded && (
                      <Text fontSize="11px" fontWeight="600" color="var(--color-primary)" mb={1} display="flex" alignItems="center" gap={1}>
                        <span>↗️ Forwarded</span>
                        {msg.forwardedFrom && <span>from {msg.forwardedFrom}</span>}
                      </Text>
                    )}

                    {/* Quoted Message Box */}
                    {msg.replyTo && (
                      <Box
                        p={2}
                        mb={1.5}
                        borderRadius="md"
                        bg="rgba(0,0,0,0.18)"
                        borderLeft="3px solid var(--color-primary)"
                        cursor="pointer"
                        _hover={{ opacity: 0.85 }}
                        onClick={() => scrollToMessage(msg.replyTo._id)}
                      >
                        <Text fontSize="11px" fontWeight="bold" color="var(--color-primary)">
                          {msg.replyTo.sender?.name || "Reply"}
                        </Text>
                        <Text fontSize="xs" color="var(--text-primary)" noOfLines={1}>
                          {msg.replyTo.content || "Attachment"}
                        </Text>
                      </Box>
                    )}

                    {!isMe && selectedChat.isGroupChat && (
                      <Text fontSize="xs" fontWeight="bold" color="var(--color-primary)" mb={0.5}>
                        {msg.sender?.name}
                      </Text>
                    )}

                    {/* --- RENDER IMAGE ATTACHMENT --- */}
                    {msg.type === "image" && hasFileUrl ? (
                      <Box mb={1} position="relative">
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
                            onClick={() =>
                              setLightboxData({
                                isOpen: true,
                                url: msg.fileUrl,
                                type: "image",
                                name: msg.fileName || "Photo",
                              })
                            }
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
                            onClick={(e) => {
                              if (e.detail === 2) {
                                setLightboxData({
                                  isOpen: true,
                                  url: msg.fileUrl,
                                  type: "video",
                                  name: msg.fileName || "Video",
                                });
                              }
                            }}
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

                                  {/* Voter Avatars */}
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

                        {/* Inline Add Option */}
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
                          <Box mt={1}>
                            <FormattedMarkdown content={msg.content} />
                          </Box>
                        )}
                      </Box>
                    ) : (
                      /* --- RENDER REGULAR TEXT MESSAGE --- */
                      <FormattedMarkdown content={msg.content} />
                    )}
                  </>
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

                {/* Meta Time, Star, Edited & Checkmarks */}
                <Box className="message-meta">
                  {msg.isEdited && (
                    <Text as="span" fontSize="10px" opacity={0.8} mr={1}>
                      (edited)
                    </Text>
                  )}
                  {isStarred && (
                    <Text as="span" color="#fbbf24" fontSize="10px" mr={1}>
                      ★
                    </Text>
                  )}
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

      {/* Quoted Message Preview Bar (when replying) */}
      {replyingTo && (
        <Flex
          bg="var(--bg-header)"
          px={4}
          py={2}
          borderTop="1px solid var(--color-border)"
          align="center"
          justify="space-between"
          borderLeft="4px solid var(--color-primary)"
        >
          <Box overflow="hidden">
            <Text fontSize="xs" fontWeight="bold" color="var(--color-primary)">
              Replying to {replyingTo.sender?.name || "Sender"}
            </Text>
            <Text fontSize="xs" color="var(--text-secondary)" noOfLines={1}>
              {replyingTo.content || (replyingTo.type === "voice" ? "🎤 Voice Note" : "Attachment")}
            </Text>
          </Box>
          <IconButton
            icon={<CloseIcon boxSize={2.5} />}
            size="xs"
            variant="ghost"
            onClick={() => setReplyingTo(null)}
          />
        </Flex>
      )}

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

        {/* Attachment Button */}
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
        {header.isBlocked ? (
          <Box flex="1" py={2.5} px={4} bg="rgba(244, 67, 54, 0.12)" borderRadius="16px" border="1px solid rgba(244, 67, 54, 0.3)" display="flex" alignItems="center" justifyContent="space-between">
            <Text fontSize="xs" fontWeight="bold" color="#f44336">
              🚫 You have blocked {header.title}. Unblock to send messages.
            </Text>
            <Button size="xs" colorScheme="blue" variant="solid" onClick={() => unblockUser?.(header.userObj?._id)}>
              🔓 Unblock Contact
            </Button>
          </Box>
        ) : recordingState === "recording" ? (
          <Box flex="1" bg="var(--bg-search)" borderRadius="20px" px={4} py={2} display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={3}>
              <Box className="recording-dot" />
              <Text fontSize="xs" color="#f44336" fontWeight="bold" minW="60px">
                00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}s
              </Text>
              
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
        {!header.isBlocked && (textInput.trim() ? (
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
        ))}
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

      {/* Fullscreen Media Lightbox Modal */}
      <MediaLightboxModal
        isOpen={lightboxData.isOpen}
        onClose={() => setLightboxData({ isOpen: false, url: "", type: "image", name: "" })}
        mediaUrl={lightboxData.url}
        mediaType={lightboxData.type}
        mediaName={lightboxData.name}
      />

      {/* Forward Modal */}
      <ForwardModal
        isOpen={forwardModal.isOpen}
        onClose={() => setForwardModal({ isOpen: false, msg: null })}
        messageToForward={forwardModal.msg}
      />

      {/* Edit Message Modal */}
      <EditMessageModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, msg: null })}
        messageToEdit={editModal.msg}
        chatId={selectedChat._id}
      />

      {/* Disappearing Messages Settings Modal */}
      <DisappearingTimerModal
        isOpen={disappearingModal}
        onClose={() => setDisappearingModal(false)}
        chatId={selectedChat._id}
        currentTimer={selectedChat.disappearingTimer || 0}
      />

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
          minW="200px"
          backdropFilter="blur(12px)"
        >
          {/* Reply / Quote Action */}
          {contextMenu.msgObj && !contextMenu.msgObj.isDeleted && (
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
                setReplyingTo(contextMenu.msgObj);
                setContextMenu((prev) => ({ ...prev, visible: false }));
              }}
            >
              <span>💬</span>
              <span>Reply</span>
            </Box>
          )}

          {/* Edit Message Option (Only for sent text messages) */}
          {contextMenu.msgObj &&
            contextMenu.msgObj.sender?._id === user?._id &&
            contextMenu.msgObj.type === "text" &&
            !contextMenu.msgObj.isDeleted && (
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
                  setEditModal({ isOpen: true, msg: contextMenu.msgObj });
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
              >
                <span>✏️</span>
                <span>Edit Message</span>
              </Box>
            )}

          {/* Star / Unstar Option */}
          {contextMenu.msgObj && !contextMenu.msgObj.isDeleted && (
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
                toggleStarMessage(selectedChat._id, contextMenu.msgObj._id);
                setContextMenu((prev) => ({ ...prev, visible: false }));
              }}
            >
              <span>⭐</span>
              <span>
                {Array.isArray(contextMenu.msgObj.isStarredBy) && contextMenu.msgObj.isStarredBy.includes(user?._id)
                  ? "Unstar Message"
                  : "Star Message"}
              </span>
            </Box>
          )}

          {/* Pin Message Option */}
          {contextMenu.msgObj && !contextMenu.msgObj.isDeleted && (
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
                if (selectedChat.pinnedMessage?._id === contextMenu.msgObj._id) {
                  unpinChatMessage(selectedChat._id);
                } else {
                  pinChatMessage(selectedChat._id, contextMenu.msgObj);
                }
                setContextMenu((prev) => ({ ...prev, visible: false }));
              }}
            >
              <span>📌</span>
              <span>
                {selectedChat.pinnedMessage?._id === contextMenu.msgObj._id ? "Unpin from Top" : "Pin to Top"}
              </span>
            </Box>
          )}

          {/* Forward Message Option */}
          {contextMenu.msgObj && !contextMenu.msgObj.isDeleted && (
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
                setForwardModal({ isOpen: true, msg: contextMenu.msgObj });
                setContextMenu((prev) => ({ ...prev, visible: false }));
              }}
            >
              <span>↗️</span>
              <span>Forward Message</span>
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

          {contextMenu.msgObj && (
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
                saveToSavedMessages?.(contextMenu.msgObj);
                setContextMenu((prev) => ({ ...prev, visible: false }));
              }}
            >
              <span>🔖</span>
              <span>Save to Cloud</span>
            </Box>
          )}

          {/* Delete Message Option */}
          {contextMenu.msgObj && !contextMenu.msgObj.isDeleted && (
            <Box
              display="flex"
              alignItems="center"
              gap={2.5}
              px={3}
              py={2}
              borderRadius="10px"
              cursor="pointer"
              color="#f44336"
              fontSize="13px"
              fontWeight="500"
              _hover={{ bg: "rgba(244, 67, 54, 0.15)" }}
              onClick={() => {
                const targetMsg = contextMenu.msgObj;
                setContextMenu((prev) => ({ ...prev, visible: false }));
                const isSavedChat = selectedChat.isSavedMessages || selectedChat._id?.startsWith("chat_saved_");
                if (isSavedChat) {
                  deleteMessage(selectedChat._id, targetMsg._id, true);
                } else {
                  setDeleteModal({ isOpen: true, msg: targetMsg });
                }
              }}
            >
              <span>🗑️</span>
              <span>Delete Message</span>
            </Box>
          )}

          {/* Hide / Unhide Option */}
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
              if (isChatHidden?.(selectedChat._id)) {
                unhideChat?.(selectedChat._id);
              } else {
                hideChat?.(selectedChat._id);
              }
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
          >
            <span>{isChatHidden?.(selectedChat._id) ? "👁️" : "🙈"}</span>
            <span>{isChatHidden?.(selectedChat._id) ? "Unhide Chat" : "Hide Chat"}</span>
          </Box>

          {/* Block / Unblock Option for Contacts */}
          {header.userObj && (
            <Box
              display="flex"
              alignItems="center"
              gap={2.5}
              px={3}
              py={2}
              borderRadius="10px"
              cursor="pointer"
              color={header.isBlocked ? "#38bdf8" : "#f44336"}
              fontSize="13px"
              fontWeight="500"
              _hover={{ bg: "var(--bg-hover)" }}
              onClick={() => {
                if (header.isBlocked) {
                  unblockUser?.(header.userObj._id);
                } else {
                  blockUser?.(header.userObj._id);
                }
                setContextMenu((prev) => ({ ...prev, visible: false }));
              }}
            >
              <span>{header.isBlocked ? "🔓" : "🚫"}</span>
              <span>{header.isBlocked ? "Unblock Contact" : "Block Contact"}</span>
            </Box>
          )}

          {/* Report User Option */}
          <Box
            display="flex"
            alignItems="center"
            gap={2.5}
            px={3}
            py={2}
            borderRadius="10px"
            cursor="pointer"
            color="#ffb74d"
            fontSize="13px"
            fontWeight="500"
            _hover={{ bg: "var(--bg-hover)" }}
            onClick={() => {
              setReportTarget(header.userObj || selectedChat);
              setContextMenu((prev) => ({ ...prev, visible: false }));
            }}
          >
            <span>⚠️</span>
            <span>Report {header.userObj ? "User" : "Chat"}</span>
          </Box>
        </Box>
      )}

      {/* Interactive Poll Composer Modal */}
      <PollComposerModal
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
        isGroupChat={Boolean(selectedChat?.isGroupChat)}
        onSendPoll={(pollData) => {
          if (selectedChat) {
            sendMessage(selectedChat._id, `📊 ${pollData.question}`, "poll", pollData, { replyTo: replyingTo });
            setReplyingTo(null);
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
              locationData,
              { replyTo: replyingTo }
            );
            setReplyingTo(null);
          }
        }}
      />

      {/* Global Report Modal */}
      <ReportModal
        isOpen={Boolean(reportTarget)}
        onClose={() => setReportTarget(null)}
        targetObj={reportTarget}
      />

      {/* Delete Message Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, msg: null })}
        isCentered
        size="sm"
      >
        <ModalOverlay bg="rgba(0,0,0,0.65)" backdropFilter="blur(6px)" />
        <ModalContent
          bg="var(--bg-card)"
          color="var(--text-primary)"
          borderRadius="18px"
          p={3}
          border="1px solid var(--color-border)"
          boxShadow="0 20px 40px rgba(0,0,0,0.5)"
        >
          <ModalHeader fontSize="lg" fontWeight="bold" pb={1}>
            Delete Message?
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={2}>
            <Text fontSize="sm" color="var(--text-secondary)">
              {deleteModal.msg?.sender?._id === user?._id
                ? "Are you sure you want to delete this message? You can delete it for everyone or only for yourself."
                : "Are you sure you want to delete this message for yourself?"}
            </Text>
          </ModalBody>
          <ModalFooter display="flex" flexDirection="column" gap={2} pt={2}>
            {deleteModal.msg?.sender?._id === user?._id && (
              <Button
                w="100%"
                colorScheme="red"
                borderRadius="10px"
                onClick={() => {
                  deleteMessage(selectedChat._id, deleteModal.msg._id, true);
                  setDeleteModal({ isOpen: false, msg: null });
                }}
              >
                Delete for Everyone
              </Button>
            )}
            <Button
              w="100%"
              variant="outline"
              borderColor="var(--color-border)"
              borderRadius="10px"
              onClick={() => {
                deleteMessage(selectedChat._id, deleteModal.msg._id, false);
                setDeleteModal({ isOpen: false, msg: null });
              }}
            >
              Delete for Me
            </Button>
            <Button
              w="100%"
              variant="ghost"
              borderRadius="10px"
              onClick={() => setDeleteModal({ isOpen: false, msg: null })}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default SingleChat;
