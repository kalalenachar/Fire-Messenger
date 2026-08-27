import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import io from "socket.io-client";
import {
  getCurrentSessionUser,
  setCurrentSessionUser,
  updateUserProfileInDb,
  fetchUserChatsAsync,
  saveChatAsync,
  fetchChatMessagesAsync,
  saveMessageAsync,
  toggleReactionAsync,
  notifySyncEvent,
  subscribeSyncEvent,
  fireBotUser,
} from "../data/fireStorage";
import { getBotReply } from "../data/fireMockData";
import CallModal from "../components/miscellaneous/CallModal";

const ChatContext = createContext();
const ENDPOINT = "http://localhost:5000";

let socket = null;

const ChatProvider = ({ children }) => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [user, setUser] = useState(() => getCurrentSessionUser());
  const [notification, setNotification] = useState([]);
  const [chats, setChats] = useState([]);
  const [messagesMap, setMessagesMap] = useState({});
  const [theme, setTheme] = useState(() => localStorage.getItem("fire_messenger_theme") || "dark");
  const [activeFilter, setActiveFilter] = useState("All");
  const [isTypingMap, setIsTypingMap] = useState({});

  // WebRTC Audio / Video Call States
  const [callData, setCallData] = useState(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const selectedChatRef = useRef(selectedChat);
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // Sync theme to DOM
  useEffect(() => {
    const activeTheme = localStorage.getItem("fire_messenger_theme") || theme || "dark";
    document.documentElement.setAttribute("data-theme", activeTheme);
  }, [theme]);

  // Load chats for user from backend server DB
  const loadUserData = useCallback(async (currentUser) => {
    if (!currentUser) return;
    const userChats = await fetchUserChatsAsync(currentUser._id);
    setChats(userChats);

    if (userChats.length > 0 && !selectedChatRef.current) {
      setSelectedChat(userChats[0]);
    }
  }, []);

  // When selectedChat changes, load its messages from backend server DB & join socket room
  useEffect(() => {
    if (!selectedChat || typeof selectedChat !== "object" || !selectedChat._id) return;

    if (socket) {
      socket.emit("join chat", selectedChat._id);
    }

    // Fetch messages for selected chat from persistent DB
    fetchChatMessagesAsync(selectedChat._id).then((msgs) => {
      setMessagesMap((prev) => ({ ...prev, [selectedChat._id]: msgs }));
    });

    // Reset unread count for this chat
    setChats((prevChats) =>
      prevChats.map((c) => (c._id === selectedChat._id && c.unread > 0 ? { ...c, unread: 0 } : c))
    );

    // Remove any notifications corresponding to selectedChat
    setNotification((prevNotifs) =>
      prevNotifs.filter((n) => {
        const notifChatId = n.chatObj?._id || (typeof n.chat === "object" ? n.chat?._id : n.chat);
        return notifChatId !== selectedChat._id;
      })
    );
  }, [selectedChat]);

  // Handle user profile updates across local state, chats, and messages
  const handleUserProfileUpdated = useCallback((updatedUser) => {
    if (!updatedUser || !updatedUser._id) return;

    setUser((currentUser) => {
      if (currentUser && currentUser._id === updatedUser._id) {
        const merged = { ...currentUser, ...updatedUser };
        setCurrentSessionUser(merged);
        return merged;
      }
      return currentUser;
    });

    setChats((prevChats) =>
      prevChats.map((c) => {
        const updatedUsers = c.users?.map((u) => (u._id === updatedUser._id ? { ...u, ...updatedUser } : u));
        return {
          ...c,
          users: updatedUsers,
          latestMessage: c.latestMessage?.sender?._id === updatedUser._id
            ? { ...c.latestMessage, sender: { ...c.latestMessage.sender, ...updatedUser } }
            : c.latestMessage,
        };
      })
    );

    setSelectedChat((prevSelected) => {
      if (!prevSelected) return prevSelected;
      const isUserInChat = prevSelected.users?.some((u) => u._id === updatedUser._id);
      if (!isUserInChat) return prevSelected;
      return {
        ...prevSelected,
        users: prevSelected.users?.map((u) => (u._id === updatedUser._id ? { ...u, ...updatedUser } : u)),
      };
    });

    setMessagesMap((prevMap) => {
      const newMap = { ...prevMap };
      let changed = false;
      for (const chatId in newMap) {
        const msgs = newMap[chatId];
        if (msgs?.some((m) => m.sender?._id === updatedUser._id)) {
          changed = true;
          newMap[chatId] = msgs.map((m) =>
            m.sender?._id === updatedUser._id ? { ...m, sender: { ...m.sender, ...updatedUser } } : m
          );
        }
      }
      return changed ? newMap : prevMap;
    });
  }, []);

  // Handle Socket.IO connection and real-time events
  useEffect(() => {
    if (!user) return;

    loadUserData(user);

    socket = io(ENDPOINT, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });

    socket.emit("setup", user);

    socket.on("connected", () => {
      console.log("🔥 Connected to Socket.IO Server & Persistent Database!");
    });

    socket.on("user profile updated", (updatedUser) => {
      handleUserProfileUpdated(updatedUser);
    });

    socket.on("message received", (newMessage) => {
      const chatId = newMessage.chatObj?._id || (typeof newMessage.chat === "object" ? newMessage.chat?._id : newMessage.chat);
      if (!chatId) return;

      setMessagesMap((prev) => {
        const chatMsgs = prev[chatId] || [];
        if (chatMsgs.some((m) => m._id === newMessage._id)) return prev;
        return { ...prev, [chatId]: [...chatMsgs, newMessage] };
      });

      setChats((prevChats) => {
        const activeChat = selectedChatRef.current;
        const chatExists = prevChats.some((c) => c._id === chatId);
        const isCurrentActive = activeChat && typeof activeChat === "object" && activeChat._id === chatId;
        const latestMsgObj = {
          content: newMessage.type === "voice" ? "🎤 Voice Note" : newMessage.type === "image" ? "📷 Photo" : newMessage.type === "file" ? `📄 ${newMessage.content || "File"}` : newMessage.content,
          sender: newMessage.sender,
          createdAt: newMessage.createdAt,
        };

        if (chatExists) {
          return prevChats.map((c) => {
            if (c._id === chatId) {
              return {
                ...c,
                latestMessage: latestMsgObj,
                unread: isCurrentActive ? 0 : (c.unread || 0) + 1,
              };
            }
            return c;
          });
        } else {
          const newChat = newMessage.chatObj || {
            _id: chatId,
            chatName: newMessage.sender?.name || "Chat",
            isGroupChat: false,
            users: [user, newMessage.sender],
            latestMessage: latestMsgObj,
            unread: isCurrentActive ? 0 : 1,
            category: "Personal",
          };
          return [{ ...newChat, latestMessage: latestMsgObj, unread: isCurrentActive ? 0 : 1 }, ...prevChats];
        }
      });

      const activeChat = selectedChatRef.current;
      if (!activeChat || typeof activeChat !== "object" || activeChat._id !== chatId) {
        const notifItem = {
          ...newMessage,
          chatObj: newMessage.chatObj || (typeof newMessage.chat === "object" ? newMessage.chat : null),
        };
        setNotification((prev) => [notifItem, ...prev.filter((n) => n._id !== newMessage._id)]);
      }
    });

    socket.on("typing", ({ room, user: typingUser }) => {
      if (typingUser._id !== user._id) {
        setIsTypingMap((prev) => ({ ...prev, [room]: `${typingUser.name} is typing...` }));
      }
    });

    socket.on("stop typing", ({ room }) => {
      setIsTypingMap((prev) => ({ ...prev, [room]: null }));
    });

    // WebRTC Signaling Handlers
    socket.on("incoming-call", ({ caller, signalData, callType, chatId, fromSocketId }) => {
      setCallData({
        caller,
        signalData,
        callType,
        chatId,
        fromSocketId,
        status: "incoming",
      });
      setIsCallModalOpen(true);
    });

    socket.on("call-accepted", ({ signalData }) => {
      setCallData((prev) => (prev ? { ...prev, status: "connected" } : null));
    });

    socket.on("call-rejected", () => {
      cleanupCall();
    });

    socket.on("call-ended", () => {
      cleanupCall();
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Listen to multi-tab sync fallback events
  useEffect(() => {
    const unsubscribe = subscribeSyncEvent((event) => {
      const { type, payload } = event;
      if (!user) return;

      if (type === "NEW_MESSAGE") {
        const { chatId, message } = payload;
        setMessagesMap((prev) => {
          const chatMsgs = prev[chatId] || [];
          if (chatMsgs.some((m) => m._id === message._id)) return prev;
          return { ...prev, [chatId]: [...chatMsgs, message] };
        });
      } else if (type === "NEW_CHAT") {
        setChats((prev) => {
          if (prev.some((c) => c._id === payload._id)) return prev;
          return [payload, ...prev];
        });
      } else if (type === "TOGGLE_REACTION") {
        const { chatId, messageId, emoji } = payload;
        setMessagesMap((prev) => {
          const chatMsgs = prev[chatId] || [];
          const updatedMsgs = chatMsgs.map((m) => {
            if (m._id === messageId) {
              const currentReactions = { ...(m.reactions || {}) };
              const count = currentReactions[emoji] || 0;
              if (count > 0) {
                delete currentReactions[emoji];
              } else {
                currentReactions[emoji] = 1;
              }
              return { ...m, reactions: currentReactions };
            }
            return m;
          });
          return { ...prev, [chatId]: updatedMsgs };
        });
      } else if (type === "USER_UPDATED") {
        handleUserProfileUpdated(payload);
      }
    });

    return () => unsubscribe();
  }, [user, handleUserProfileUpdated]);

  // Send message function
  const sendMessage = (chatId, content, type = "text", attachmentData = null, fileMeta = {}) => {
    if (!content?.trim() && type === "text" && !attachmentData) return;
    if (!user || !chatId) return;

    const currentChatObj =
      selectedChat && typeof selectedChat === "object" && selectedChat._id === chatId
        ? selectedChat
        : chats.find((c) => c._id === chatId) || null;

    const fileName = fileMeta.fileName || (type === "file" ? content : null);
    const fileSize = fileMeta.fileSize || null;
    const fileType = fileMeta.fileType || null;

    const displayContent =
      type === "voice"
        ? "🎤 Voice Note"
        : type === "video"
        ? "🎥 Video"
        : type === "image"
        ? "📷 Photo"
        : type === "file"
        ? `📄 ${fileName || "File"}`
        : content;

    const newMessage = {
      _id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      sender: user,
      content,
      type,
      audioUrl: type === "voice" ? attachmentData : null,
      fileUrl: type === "image" || type === "file" || type === "video" ? attachmentData : null,
      fileName,
      fileSize,
      fileType,
      chat: chatId,
      chatObj: currentChatObj,
      createdAt: new Date().toISOString(),
      reactions: {},
    };

    // Save locally into state & send REST POST to backend DB
    setMessagesMap((prev) => {
      const chatMsgs = prev[chatId] || [];
      return { ...prev, [chatId]: [...chatMsgs, newMessage] };
    });

    saveMessageAsync(newMessage);

    const latestMsgObj = {
      content: displayContent,
      sender: user,
      createdAt: newMessage.createdAt,
    };

    setChats((prevChats) => {
      const chatExists = prevChats.some((c) => c._id === chatId);
      if (chatExists) {
        return prevChats.map((c) => (c._id === chatId ? { ...c, latestMessage: latestMsgObj } : c));
      } else if (currentChatObj) {
        return [{ ...currentChatObj, latestMessage: latestMsgObj }, ...prevChats];
      }
      return prevChats;
    });

    if (socket) {
      socket.emit("new message", newMessage);
    }
    notifySyncEvent("NEW_MESSAGE", { chatId, message: newMessage });

    // AI Bot Reply Handler
    if (chatId.includes("bot")) {
      setTimeout(() => {
        const botText = getBotReply(content);
        const botMessage = {
          _id: `msg_bot_${Date.now()}`,
          sender: fireBotUser,
          content: botText,
          chat: chatId,
          createdAt: new Date().toISOString(),
          reactions: { "🔥": 1 },
        };

        setMessagesMap((prev) => {
          const chatMsgs = prev[chatId] || [];
          return { ...prev, [chatId]: [...chatMsgs, botMessage] };
        });

        saveMessageAsync(botMessage);

        setChats((prevChats) =>
          prevChats.map((c) =>
            c._id === chatId
              ? {
                  ...c,
                  latestMessage: {
                    content: botText,
                    sender: fireBotUser,
                    createdAt: botMessage.createdAt,
                  },
                }
              : c
          )
        );

        notifySyncEvent("NEW_MESSAGE", { chatId, message: botMessage });
      }, 700);
    }
  };

  // Send typing notifications
  const sendTypingStatus = (chatId, isTyping) => {
    if (!socket || !user) return;
    if (isTyping) {
      socket.emit("typing", { room: chatId, user });
    } else {
      socket.emit("stop typing", { room: chatId, user });
    }
  };

  // Toggle Reactions
  const toggleReaction = (chatId, messageId, emoji) => {
    if (!user) return;
    setMessagesMap((prev) => {
      const chatMsgs = prev[chatId] || [];
      const updatedMsgs = chatMsgs.map((m) => {
        if (m._id === messageId) {
          const currentReactions = { ...(m.reactions || {}) };
          const count = currentReactions[emoji] || 0;
          if (count > 0) {
            delete currentReactions[emoji];
          } else {
            currentReactions[emoji] = 1;
          }
          return { ...m, reactions: currentReactions };
        }
        return m;
      });
      return { ...prev, [chatId]: updatedMsgs };
    });

    toggleReactionAsync(chatId, messageId, emoji);

    if (socket) {
      const otherUser = selectedChat?.users?.find((u) => u._id !== user._id);
      socket.emit("toggle reaction", { chatId, messageId, emoji, userId: user._id, targetUserId: otherUser?._id });
    }
    notifySyncEvent("TOGGLE_REACTION", { chatId, messageId, emoji });
  };

  // WebRTC Calling Engine
  const startCall = async (targetUser, callType = "audio", chatId) => {
    try {
      const constraints = {
        audio: true,
        video: callType === "video",
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      setCallData({
        caller: targetUser,
        callType,
        chatId,
        targetUserId: targetUser._id,
        status: "calling",
      });
      setIsCallModalOpen(true);

      if (socket) {
        socket.emit("call-user", {
          targetUserId: targetUser._id,
          signalData: null,
          caller: user,
          callType,
          chatId,
        });
      }
    } catch (err) {
      console.warn("Camera/Microphone access error:", err);
      // Fallback simulated call modal if hardware unavailable
      setCallData({
        caller: targetUser,
        callType,
        chatId,
        targetUserId: targetUser._id,
        status: "calling",
      });
      setIsCallModalOpen(true);
      setTimeout(() => {
        setCallData((prev) => (prev ? { ...prev, status: "connected" } : null));
      }, 2000);
    }
  };

  const acceptCall = async () => {
    try {
      const constraints = {
        audio: true,
        video: callData?.callType === "video",
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      setCallData((prev) => (prev ? { ...prev, status: "connected" } : null));

      if (socket && callData) {
        socket.emit("answer-call", {
          toSocketId: callData.fromSocketId,
          toUserId: callData.caller._id,
          signalData: null,
        });
      }
    } catch (err) {
      setCallData((prev) => (prev ? { ...prev, status: "connected" } : null));
    }
  };

  const rejectCall = () => {
    if (socket && callData) {
      socket.emit("reject-call", {
        toSocketId: callData.fromSocketId,
        targetUserId: callData.caller._id,
      });
    }
    cleanupCall();
  };

  const endCall = () => {
    if (socket && callData) {
      socket.emit("end-call", {
        toSocketId: callData.fromSocketId,
        targetUserId: callData.caller?._id || callData.targetUserId,
      });
    }
    cleanupCall();
  };

  const cleanupCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }
    setIsCallModalOpen(false);
    setCallData(null);
  };

  const updateUserProfile = (updates) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    setCurrentSessionUser(updatedUser);
    updateUserProfileInDb(user._id, updates);
    if (socket) {
      socket.emit("update user profile", updatedUser);
    }
    notifySyncEvent("USER_UPDATED", updatedUser);
    handleUserProfileUpdated(updatedUser);
  };

  const addOrSelectChat = (newChat) => {
    if (!user) return;
    setChats((prev) => {
      const existing = prev.find((c) => c._id === newChat._id);
      if (existing) return prev;
      return [newChat, ...prev];
    });
    saveChatAsync({ chat: newChat });
    setSelectedChat(newChat);
    notifySyncEvent("NEW_CHAT", newChat);
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("fire_messenger_theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  return (
    <ChatContext.Provider
      value={{
        selectedChat,
        setSelectedChat,
        user,
        setUser,
        notification,
        setNotification,
        chats,
        setChats,
        messagesMap,
        sendMessage,
        sendTypingStatus,
        isTypingMap,
        toggleReaction,
        theme,
        toggleTheme,
        activeFilter,
        setActiveFilter,
        updateUserProfile,
        addOrSelectChat,
        loadUserData,
        startCall,
      }}
    >
      {children}
      {/* Global WebRTC Audio / Video Call Overlay Modal */}
      <CallModal
        isOpen={isCallModalOpen}
        onClose={cleanupCall}
        callData={callData}
        localStream={localStream}
        remoteStream={remoteStream}
        onAcceptCall={acceptCall}
        onRejectCall={rejectCall}
        onEndCall={endCall}
      />
    </ChatContext.Provider>
  );
};

export const ChatState = () => {
  return useContext(ChatContext);
};

export default ChatProvider;
