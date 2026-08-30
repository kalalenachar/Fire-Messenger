import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import io from "socket.io-client";
import {
  getCurrentSessionUser,
  setCurrentSessionUser,
  updateUserProfileInDb,
  submitVerificationApplicationAsync,
  reviewVerificationApplicationAsync,
  fetchUserChatsAsync,
  saveChatAsync,
  fetchChatMessagesAsync,
  saveMessageAsync,
  deleteMessageAsync,
  toggleReactionAsync,
  notifySyncEvent,
  subscribeSyncEvent,
  fireBotUser,
  fetchStatusFeedAsync,
  createStatusPostAsync,
  recordStatusViewAsync,
  deleteStatusPostAsync,
  fetchAudienceProfilesAsync,
  saveAudienceProfileAsync,
  deleteAudienceProfileAsync,
  votePollAsync,
  addPollOptionAsync,
  updateLiveLocationAsync,
  stopLiveLocationAsync,
  fetchUserFoldersAsync,
  saveUserFoldersAsync,
  safeLocalStorageSetItem,
  editMessageAsync,
  toggleStarMessageAsync,
  pinChatMessageAsync,
  unpinChatMessageAsync,
  forwardMessagesAsync,
  setChatDisappearingTimerAsync,
  fetchPlatformsStatusAsync,
  fetchSyncedBridgeChatsAsync,
  createDirectBridgeChatAsync,
  sendBridgeMessageAsync,
} from "../data/fireStorage";
import { getBotReplyAsync } from "../data/fireMockData";
import { useColorMode, useToast } from "@chakra-ui/react";
import CallModal from "../components/miscellaneous/CallModal";
import LinkedPlatformsModal from "../components/miscellaneous/LinkedPlatformsModal";
import { soundEngine } from "../config/soundEngine";

const ChatContext = createContext();
const ENDPOINT =
  window.location.port === "3000"
    ? `http://${window.location.hostname}:5000`
    : `${window.location.protocol}//${window.location.host}`;

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:global.stun.twilio.com:3478" },
  ],
  iceCandidatePoolSize: 10,
};

let socket = null;

const ChatProvider = ({ children }) => {
  const { colorMode, setColorMode } = useColorMode();
  const toast = useToast();
  const [selectedChat, setSelectedChat] = useState(null);
  const [user, setUser] = useState(() => getCurrentSessionUser());
  const [notification, setNotification] = useState([]);
  const [chats, setChats] = useState([]);
  const [messagesMap, setMessagesMap] = useState({});
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("fire_messenger_theme") || localStorage.getItem("chakra-ui-color-mode") || "dark";
    return saved;
  });
  const [activeFilter, setActiveFilter] = useState("All");
  const [isTypingMap, setIsTypingMap] = useState({});
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => soundEngine.isEnabled);
  const [draftsMap, setDraftsMap] = useState(() => {
    try {
      const saved = localStorage.getItem("fire_drafts_map");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const toggleSound = useCallback(() => {
    const next = soundEngine.toggleSound();
    setIsSoundEnabled(next);
    return next;
  }, []);

  const setDraftForChat = useCallback((chatId, draftText) => {
    if (!chatId) return;
    setDraftsMap((prev) => {
      const updated = { ...prev };
      if (!draftText || !draftText.trim()) {
        delete updated[chatId];
      } else {
        updated[chatId] = draftText;
      }
      try {
        localStorage.setItem("fire_drafts_map", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  // Omnichannel WhatsApp & Telegram Bridge State
  const [linkedPlatforms, setLinkedPlatforms] = useState({
    whatsapp: { connected: false },
    telegram: { connected: false },
  });
  const [platformFilter, setPlatformFilter] = useState("all");
  const [isLinkedPlatformsModalOpen, setIsLinkedPlatformsModalOpen] = useState(false);

  const syncBridgeChats = useCallback(async () => {
    if (!user?._id) return;
    try {
      const bridgeChats = await fetchSyncedBridgeChatsAsync(user._id, user);
      if (bridgeChats && bridgeChats.length > 0) {
        setChats((prev) => {
          const existingIds = new Set(prev.map((c) => c._id));
          const toAdd = bridgeChats.filter((bc) => !existingIds.has(bc._id));
          return [...toAdd, ...prev];
        });
      }
    } catch (err) {
      console.warn("Failed to sync bridge chats:", err);
    }
  }, [user]);

  const createDirectBridgeChat = useCallback(
    async (platform, targetIdentifier) => {
      if (!user?._id || !targetIdentifier) return null;
      try {
        const chat = await createDirectBridgeChatAsync(platform, user._id, targetIdentifier, user);
        if (chat) {
          setChats((prev) => {
            if (prev.some((c) => c._id === chat._id)) return prev;
            return [chat, ...prev];
          });
          setSelectedChat(chat);
          return chat;
        }
      } catch (e) {
        console.error("createDirectBridgeChat error:", e);
      }
      return null;
    },
    [user]
  );

  const sendBridgeMessage = useCallback(
    async (platform, { chatId, content, mediaUrl, audioUrl, replyTo }) => {
      if (!user?._id || !chatId) return null;
      try {
        const msg = await sendBridgeMessageAsync(platform, {
          chatId,
          content,
          sender: user,
          mediaUrl,
          audioUrl,
          replyTo,
        });
        if (msg) {
          soundEngine.playMessageSent();
          setMessagesMap((prev) => {
            const currentMsgs = prev[chatId] || [];
            return {
              ...prev,
              [chatId]: [...currentMsgs, msg],
            };
          });
          if (socket) {
            socket.emit("bridge_send_message", {
              platform,
              chatId,
              content,
              sender: user,
              mediaUrl,
              audioUrl,
              replyTo,
            });
          }
        }
        return msg;
      } catch (err) {
        console.error("Error sending bridge message:", err);
        return null;
      }
    },
    [user]
  );

  useEffect(() => {
    if (user?._id) {
      fetchPlatformsStatusAsync(user._id)
        .then((status) => {
          if (status) setLinkedPlatforms(status);
        })
        .catch(() => {});
    }
  }, [user?._id]);

  // Folder Settings State
  const [folders, setFolders] = useState([]);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);

  // Hidden Chats State
  const [hiddenChatIds, setHiddenChatIds] = useState(() => {
    if (!user || !user._id) return [];
    const local = localStorage.getItem(`fire_hidden_chats_${user._id}`);
    return local ? JSON.parse(local) : [];
  });

  const hideChat = useCallback((chatId) => {
    if (!chatId) return;
    setHiddenChatIds((prev) => {
      if (prev.includes(chatId)) return prev;
      const updated = [...prev, chatId];
      if (user && user._id) {
        safeLocalStorageSetItem(`fire_hidden_chats_${user._id}`, JSON.stringify(updated));
      }
      return updated;
    });
  }, [user]);

  const unhideChat = useCallback((chatId) => {
    if (!chatId) return;
    setHiddenChatIds((prev) => {
      const updated = prev.filter((id) => id !== chatId);
      if (user && user._id) {
        safeLocalStorageSetItem(`fire_hidden_chats_${user._id}`, JSON.stringify(updated));
      }
      return updated;
    });
  }, [user]);

  const isChatHidden = useCallback((chatId) => {
    return hiddenChatIds.includes(chatId);
  }, [hiddenChatIds]);

  // Blocked Users State
  const [blockedUserIds, setBlockedUserIds] = useState(() => {
    if (!user || !user._id) return [];
    const local = localStorage.getItem(`fire_blocked_users_${user._id}`);
    return local ? JSON.parse(local) : [];
  });

  const blockUser = useCallback((userId) => {
    if (!userId) return;
    setBlockedUserIds((prev) => {
      if (prev.includes(userId)) return prev;
      const updated = [...prev, userId];
      if (user && user._id) {
        safeLocalStorageSetItem(`fire_blocked_users_${user._id}`, JSON.stringify(updated));
      }
      return updated;
    });
  }, [user]);

  const unblockUser = useCallback((userId) => {
    if (!userId) return;
    setBlockedUserIds((prev) => {
      const updated = prev.filter((id) => id !== userId);
      if (user && user._id) {
        safeLocalStorageSetItem(`fire_blocked_users_${user._id}`, JSON.stringify(updated));
      }
      return updated;
    });
  }, [user]);

  const isUserBlocked = useCallback((userId) => {
    return blockedUserIds.includes(userId);
  }, [blockedUserIds]);

  // Pinned Chats State
  const [pinnedChatIds, setPinnedChatIds] = useState(() => {
    if (!user || !user._id) return ["chat_fire_bot"];
    const local = localStorage.getItem(`fire_pinned_chats_${user._id}`);
    return local ? JSON.parse(local) : ["chat_fire_bot", `chat_saved_${user._id}`];
  });

  const togglePinChat = useCallback((chatId) => {
    if (!chatId) return;
    // Auto-unhide if pinning a hidden chat
    unhideChat(chatId);

    setPinnedChatIds((prev) => {
      const isPinned = prev.includes(chatId);
      const updated = isPinned ? prev.filter((id) => id !== chatId) : [...prev, chatId];
      if (user && user._id) {
        safeLocalStorageSetItem(`fire_pinned_chats_${user._id}`, JSON.stringify(updated));
      }
      return updated;
    });
  }, [unhideChat, user]);

  const isChatPinned = useCallback((chatId) => {
    return pinnedChatIds.includes(chatId);
  }, [pinnedChatIds]);

  // Saved Messages Concept
  const getSavedMessagesChatId = (userId) => `chat_saved_${userId}`;

  const ensureSavedMessagesChat = useCallback((currentUser, currentChats) => {
    if (!currentUser || !currentUser._id) return currentChats || [];
    const savedId = getSavedMessagesChatId(currentUser._id);
    const exists = currentChats.some((c) => c._id === savedId || c.isSavedMessages);
    if (!exists) {
      const savedChat = {
        _id: savedId,
        chatName: "Saved Messages",
        isGroupChat: false,
        isSavedMessages: true,
        users: [currentUser],
        category: "Personal",
        latestMessage: {
          content: "Your personal cloud storage for notes, files, & forwarded messages 🔖",
          sender: currentUser,
          createdAt: new Date().toISOString(),
        },
        unread: 0,
      };
      saveChatAsync({ chat: savedChat });
      return [savedChat, ...currentChats];
    }
    return currentChats;
  }, []);

  const openSavedMessages = useCallback(() => {
    if (!user || !user._id) return;
    const savedId = getSavedMessagesChatId(user._id);
    let savedChat = chats.find((c) => c._id === savedId || c.isSavedMessages);
    if (!savedChat) {
      savedChat = {
        _id: savedId,
        chatName: "Saved Messages",
        isGroupChat: false,
        isSavedMessages: true,
        users: [user],
        category: "Personal",
        latestMessage: {
          content: "Your personal cloud storage for notes, files, & forwarded messages 🔖",
          sender: user,
          createdAt: new Date().toISOString(),
        },
        unread: 0,
      };
      saveChatAsync({ chat: savedChat });
      setChats((prev) => [savedChat, ...prev]);
    }
    setSelectedChat(savedChat);
  }, [user, chats]);

  const saveToSavedMessages = useCallback(
    async (msg) => {
      if (!user || !user._id || !msg) return;
      const savedId = getSavedMessagesChatId(user._id);
      let savedChat = chats.find((c) => c._id === savedId || c.isSavedMessages);
      if (!savedChat) {
        savedChat = {
          _id: savedId,
          chatName: "Saved Messages",
          isGroupChat: false,
          isSavedMessages: true,
          users: [user],
          category: "Personal",
          latestMessage: {
            content: "Your personal cloud storage for notes, files, & forwarded messages 🔖",
            sender: user,
            createdAt: new Date().toISOString(),
          },
          unread: 0,
        };
        await saveChatAsync({ chat: savedChat });
        setChats((prev) => [savedChat, ...prev]);
      }

      const senderName = msg.sender?.name || (msg.sender?._id === user._id ? user.name : "Contact");
      const sourceChatName = selectedChatRef.current?.chatName || "Chat";

      const forwardedMsg = {
        ...msg,
        _id: `msg_saved_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        chat: savedId,
        sender: user,
        forwardedFrom: {
          senderName,
          sourceChatName,
        },
        fileUrl: msg.fileUrl || null,
        audioUrl: msg.audioUrl || null,
        fileName: msg.fileName || null,
        fileSize: msg.fileSize || null,
        fileType: msg.fileType || null,
        pollData: msg.pollData || null,
        locationData: msg.locationData || null,
        createdAt: new Date().toISOString(),
      };

      const savedMessage = await saveMessageAsync(forwardedMsg);
      setMessagesMap((prev) => ({
        ...prev,
        [savedId]: [...(prev[savedId] || []), savedMessage],
      }));

      const latestText =
        msg.type === "voice"
          ? "🎤 Voice Note"
          : msg.type === "image"
          ? "📷 Photo"
          : msg.type === "video"
          ? "🎥 Video"
          : msg.type === "file"
          ? `📄 ${msg.fileName || msg.content || "File"}`
          : msg.content || "Saved Message";

      setChats((prev) =>
        prev.map((c) =>
          c._id === savedId || c.isSavedMessages
            ? {
                ...c,
                latestMessage: {
                  content: `Saved: ${latestText}`,
                  sender: user,
                  createdAt: new Date().toISOString(),
                },
              }
            : c
        )
      );

      notifySyncEvent("NEW_MESSAGE", { chatId: savedId, message: savedMessage });
      toast({
        title: "Saved to Saved Messages 🔖",
        description: "Message saved to your private cloud storage.",
        status: "success",
        duration: 2500,
        isClosable: true,
        position: "top-right",
      });
    },
    [user, chats, toast]
  );

  // Status & Story States
  const [statusFeed, setStatusFeed] = useState([]);
  const [audienceProfiles, setAudienceProfiles] = useState([]);
  const [activeStatusUser, setActiveStatusUser] = useState(null);
  const [isStatusComposerOpen, setIsStatusComposerOpen] = useState(false);
  const [isAudienceModalOpen, setIsAudienceModalOpen] = useState(false);

  // WebRTC Audio / Video Call States & Refs
  const [callData, setCallData] = useState(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const originalVideoTrackRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const remoteStreamRef = useRef(null);
  const callDataRef = useRef(callData);

  useEffect(() => {
    callDataRef.current = callData;
  }, [callData]);

  const selectedChatRef = useRef(selectedChat);
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // Sync theme to DOM & Chakra UI
  useEffect(() => {
    const activeTheme = localStorage.getItem("fire_messenger_theme") || theme || "dark";
    document.documentElement.setAttribute("data-theme", activeTheme);
    document.documentElement.setAttribute("data-color-mode", activeTheme);
    document.body.setAttribute("data-theme", activeTheme);
    if (setColorMode && colorMode !== activeTheme) {
      setColorMode(activeTheme);
    }
  }, [theme, colorMode, setColorMode]);

  // Load status feed & audience profiles
  const loadStatusData = useCallback(async (currentUser) => {
    if (!currentUser || !currentUser._id) return;
    const feed = await fetchStatusFeedAsync(currentUser._id);
    setStatusFeed(feed);
    const profiles = await fetchAudienceProfilesAsync(currentUser._id);
    setAudienceProfiles(profiles);
  }, []);

  const postNewStatus = async (postData) => {
    if (!user || !user._id) return;
    const newPost = await createStatusPostAsync(user._id, postData);
    await loadStatusData(user);
    return newPost;
  };

  const viewStatusSlide = async (statusId) => {
    if (!user || !user._id) return;
    await recordStatusViewAsync(statusId, user);
    await loadStatusData(user);
  };

  const deleteStatusSlide = async (statusId) => {
    if (!user || !user._id) return;
    await deleteStatusPostAsync(user._id, statusId);
    await loadStatusData(user);
  };

  const saveAudienceProfile = async (profileData) => {
    if (!user || !user._id) return;
    const saved = await saveAudienceProfileAsync(user._id, profileData);
    await loadStatusData(user);
    return saved;
  };

  const removeAudienceProfile = async (profileId) => {
    if (!user || !user._id) return;
    await deleteAudienceProfileAsync(user._id, profileId);
    await loadStatusData(user);
  };

  // Folder Operations & Persistence
  const saveFolders = async (newFolders) => {
    setFolders(newFolders);
    if (user && user._id) {
      await saveUserFoldersAsync(user._id, newFolders);
    }
  };

  const createFolder = async (folderData) => {
    const newFolder = {
      id: `folder_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: folderData.name || "New Folder",
      icon: folderData.icon || "📁",
      includedChatIds: folderData.includedChatIds || [],
      rules: folderData.rules || { groups: false, channels: false, bots: false, unreadOnly: false },
    };
    const updated = [...folders, newFolder];
    await saveFolders(updated);
    return newFolder;
  };

  const updateFolder = async (folderId, updates) => {
    const updated = folders.map((f) => (f.id === folderId ? { ...f, ...updates } : f));
    await saveFolders(updated);
  };

  const deleteFolder = async (folderId) => {
    const updated = folders.filter((f) => f.id !== folderId);
    await saveFolders(updated);
    if (activeFilter === folderId) {
      setActiveFilter("All");
    }
  };

  const addChatToFolder = async (folderId, chatId) => {
    const updated = folders.map((f) => {
      if (f.id === folderId) {
        const included = f.includedChatIds || [];
        if (!included.includes(chatId)) {
          return { ...f, includedChatIds: [...included, chatId] };
        }
      }
      return f;
    });
    await saveFolders(updated);
  };

  const removeChatFromFolder = async (folderId, chatId) => {
    const updated = folders.map((f) => {
      if (f.id === folderId) {
        return { ...f, includedChatIds: (f.includedChatIds || []).filter((id) => id !== chatId) };
      }
      return f;
    });
    await saveFolders(updated);
  };

  const toggleChatFolder = async (folderId, chatId) => {
    const targetFolder = folders.find((f) => f.id === folderId);
    if (!targetFolder) return;
    if (targetFolder.includedChatIds?.includes(chatId)) {
      await removeChatFromFolder(folderId, chatId);
    } else {
      await addChatToFolder(folderId, chatId);
    }
  };

  // Load chats & folders for user from backend server DB
  const loadUserData = useCallback(async (currentUser) => {
    if (!currentUser) return;
    let userChats = await fetchUserChatsAsync(currentUser._id);
    userChats = ensureSavedMessagesChat(currentUser, userChats);
    setChats(userChats);

    const userFolders = await fetchUserFoldersAsync(currentUser._id);
    setFolders(userFolders);

    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (userChats.length > 0 && !selectedChatRef.current && !isMobile) {
      setSelectedChat(userChats[0]);
    }
    loadStatusData(currentUser);
  }, [ensureSavedMessagesChat, loadStatusData]);


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

    socket.on("new_status_posted", () => {
      if (user) loadStatusData(user);
    });

    socket.on("status_viewed", () => {
      if (user) loadStatusData(user);
    });

    socket.on("status_deleted", () => {
      if (user) loadStatusData(user);
    });

    socket.on("message received", (newMessage) => {
      const chatId = newMessage.chatObj?._id || (typeof newMessage.chat === "object" ? newMessage.chat?._id : newMessage.chat);
      if (!chatId) return;

      if (newMessage.sender?._id !== user._id) {
        soundEngine.playMessageReceived();
      }

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

    socket.on("bridge_message_received", ({ platform, chat, message }) => {
      const chatId = chat?._id || message?.chat;
      if (!chatId || !message) return;

      if (message.sender?._id !== user._id) {
        soundEngine.playMessageReceived();
      }

      setMessagesMap((prev) => {
        const chatMsgs = prev[chatId] || [];
        if (chatMsgs.some((m) => m._id === message._id)) return prev;
        return { ...prev, [chatId]: [...chatMsgs, message] };
      });

      setChats((prevChats) => {
        const activeChat = selectedChatRef.current;
        const chatExists = prevChats.some((c) => c._id === chatId);
        const isCurrentActive = activeChat && typeof activeChat === "object" && activeChat._id === chatId;
        const latestMsgObj = {
          content: message.content,
          sender: message.sender,
          createdAt: message.createdAt,
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
          const newChat = chat || {
            _id: chatId,
            chatName: message.sender?.name || "WhatsApp Contact",
            isGroupChat: false,
            platform: platform || "whatsapp",
            users: [user, message.sender],
            latestMessage: latestMsgObj,
            unread: isCurrentActive ? 0 : 1,
            category: "Personal",
          };
          return [{ ...newChat, latestMessage: latestMsgObj, unread: isCurrentActive ? 0 : 1 }, ...prevChats];
        }
      });
    });

    socket.on("message edited", ({ chatId, message }) => {
      if (!chatId || !message) return;
      setMessagesMap((prev) => {
        const chatMsgs = prev[chatId] || [];
        const updated = chatMsgs.map((m) => (m._id === message._id ? { ...m, ...message } : m));
        return { ...prev, [chatId]: updated };
      });
      setChats((prevChats) =>
        prevChats.map((c) => {
          if (c._id === chatId && c.latestMessage && c.latestMessage._id === message._id) {
            return { ...c, latestMessage: { ...c.latestMessage, content: message.content } };
          }
          return c;
        })
      );
    });

    socket.on("message starred", ({ chatId, message }) => {
      if (!chatId || !message) return;
      setMessagesMap((prev) => {
        const chatMsgs = prev[chatId] || [];
        const updated = chatMsgs.map((m) => (m._id === message._id ? { ...m, ...message } : m));
        return { ...prev, [chatId]: updated };
      });
    });

    socket.on("message pinned", ({ chatId, pinnedMessage }) => {
      if (!chatId) return;
      setChats((prevChats) =>
        prevChats.map((c) => (c._id === chatId ? { ...c, pinnedMessage } : c))
      );
      setSelectedChat((prev) => (prev && prev._id === chatId ? { ...prev, pinnedMessage } : prev));
    });

    socket.on("message unpinned", ({ chatId }) => {
      if (!chatId) return;
      setChats((prevChats) =>
        prevChats.map((c) => (c._id === chatId ? { ...c, pinnedMessage: null } : c))
      );
      setSelectedChat((prev) => (prev && prev._id === chatId ? { ...prev, pinnedMessage: null } : prev));
    });

    socket.on("disappearing timer updated", ({ chatId, timerSeconds }) => {
      if (!chatId) return;
      setChats((prevChats) =>
        prevChats.map((c) => (c._id === chatId ? { ...c, disappearingTimer: timerSeconds } : c))
      );
      setSelectedChat((prev) => (prev && prev._id === chatId ? { ...prev, disappearingTimer: timerSeconds } : prev));
    });

    socket.on("typing", ({ room, user: typingUser }) => {
      if (typingUser._id !== user._id) {
        setIsTypingMap((prev) => ({ ...prev, [room]: `${typingUser.name} is typing...` }));
      }
    });

    socket.on("stop typing", ({ room }) => {
      setIsTypingMap((prev) => ({ ...prev, [room]: null }));
    });

    socket.on("poll_voted", ({ chatId, message }) => {
      if (!chatId || !message) return;
      setMessagesMap((prev) => {
        const chatMsgs = prev[chatId] || [];
        const updated = chatMsgs.map((m) => (m._id === message._id ? message : m));
        return { ...prev, [chatId]: updated };
      });
    });

    socket.on("poll_option_added", ({ chatId, message }) => {
      if (!chatId || !message) return;
      setMessagesMap((prev) => {
        const chatMsgs = prev[chatId] || [];
        const updated = chatMsgs.map((m) => (m._id === message._id ? message : m));
        return { ...prev, [chatId]: updated };
      });
    });

    socket.on("live_location_updated", ({ chatId, message }) => {
      if (!chatId || !message) return;
      setMessagesMap((prev) => {
        const chatMsgs = prev[chatId] || [];
        const updated = chatMsgs.map((m) => (m._id === message._id ? message : m));
        return { ...prev, [chatId]: updated };
      });
    });

    socket.on("live_location_stopped", ({ chatId, message }) => {
      if (!chatId || !message) return;
      setMessagesMap((prev) => {
        const chatMsgs = prev[chatId] || [];
        const updated = chatMsgs.map((m) => (m._id === message._id ? message : m));
        return { ...prev, [chatId]: updated };
      });
    });

    socket.on("message deleted", ({ chatId, messageId, deleteForEveryone, userId: delUserId }) => {
      if (!chatId || !messageId) return;
      const isSavedChat = chatId.startsWith("chat_saved_") || chatId.includes("saved");
      setMessagesMap((prev) => {
        const chatMsgs = prev[chatId] || [];
        let updated;
        if (isSavedChat) {
          updated = chatMsgs.filter((m) => m._id !== messageId);
        } else if (deleteForEveryone) {
          updated = chatMsgs.map((m) =>
            m._id === messageId
              ? { ...m, isDeleted: true, content: "This message was deleted", fileUrl: null, audioUrl: null, reactions: {} }
              : m
          );
        } else if (delUserId && delUserId === user?._id) {
          updated = chatMsgs.filter((m) => m._id !== messageId);
        } else {
          return prev;
        }
        return { ...prev, [chatId]: updated };
      });

      setChats((prevChats) => {
        return prevChats.map((c) => {
          if (c._id === chatId) {
            const chatMsgs = (messagesMap[chatId] || []).filter((m) => m._id !== messageId && !m.isDeleted);
            const lastMsg = chatMsgs[chatMsgs.length - 1];
            return {
              ...c,
              latestMessage: lastMsg
                ? {
                    content: lastMsg.content,
                    sender: lastMsg.sender,
                    createdAt: lastMsg.createdAt,
                  }
                : { content: "No messages yet", createdAt: new Date().toISOString() },
            };
          }
          return c;
        });
      });
    });

    // WebRTC Signaling Handlers
    socket.on("incoming-call", ({ caller, signalData, callType, chatId, fromSocketId, fromUserId }) => {
      pendingIceCandidatesRef.current = [];
      setCallData({
        caller,
        signalData,
        callType,
        chatId,
        fromSocketId,
        fromUserId,
        status: "incoming",
      });
      setIsCallModalOpen(true);
    });

    socket.on("call-accepted", async ({ signalData, fromSocketId, fromUserId }) => {
      console.log("📞 Call accepted by remote user");
      try {
        if (peerConnectionRef.current && signalData) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signalData));

          // Flush queued ICE candidates
          while (pendingIceCandidatesRef.current.length > 0) {
            const cand = pendingIceCandidatesRef.current.shift();
            try {
              await peerConnectionRef.current.addIceCandidate(cand);
            } catch (e) {
              console.warn("ICE error on call-accepted:", e);
            }
          }
        }
      } catch (err) {
        console.warn("Error setting remote description on call-accepted:", err);
      }
      setCallData((prev) =>
        prev
          ? {
              ...prev,
              status: "connected",
              fromSocketId: fromSocketId || prev.fromSocketId,
              fromUserId: fromUserId || prev.fromUserId,
            }
          : null
      );
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      if (!candidate) return;
      try {
        const iceCandidate = new RTCIceCandidate(candidate);
        if (
          peerConnectionRef.current &&
          peerConnectionRef.current.remoteDescription &&
          peerConnectionRef.current.remoteDescription.type
        ) {
          await peerConnectionRef.current.addIceCandidate(iceCandidate);
        } else {
          pendingIceCandidatesRef.current.push(iceCandidate);
        }
      } catch (err) {
        console.warn("Error adding ICE candidate:", err);
      }
    });

    socket.on("call-rejected", () => {
      toast({ title: "Call Declined", status: "info", duration: 2500, isClosable: true });
      cleanupCall();
    });

    socket.on("call-ended", () => {
      toast({ title: "Call Ended", status: "info", duration: 2500, isClosable: true });
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
      } else if (type === "DELETE_MESSAGE") {
        const { chatId, messageId, deleteForEveryone, userId: delUserId } = payload;
        const isSavedChat = chatId && (chatId.startsWith("chat_saved_") || chatId.includes("saved"));
        setMessagesMap((prev) => {
          const chatMsgs = prev[chatId] || [];
          let updated;
          if (isSavedChat) {
            updated = chatMsgs.filter((m) => m._id !== messageId);
          } else if (deleteForEveryone) {
            updated = chatMsgs.map((m) =>
              m._id === messageId
                ? { ...m, isDeleted: true, content: "This message was deleted", fileUrl: null, audioUrl: null, reactions: {} }
                : m
            );
          } else if (delUserId && delUserId === user?._id) {
            updated = chatMsgs.filter((m) => m._id !== messageId);
          } else {
            return prev;
          }
          return { ...prev, [chatId]: updated };
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
    const pollData = type === "poll" ? (fileMeta.pollData || attachmentData) : null;
    const locationData = (type === "location" || type === "live_location") ? (fileMeta.locationData || attachmentData) : null;

    const displayContent =
      type === "voice"
        ? "🎤 Voice Note"
        : type === "video"
        ? "🎥 Video"
        : type === "image"
        ? "📷 Photo"
        : type === "file"
        ? `📄 ${fileName || "File"}`
        : type === "poll"
        ? `📊 Poll: ${pollData?.question || content}`
        : type === "location"
        ? `📍 Location: ${locationData?.name || "Shared Location"}`
        : type === "live_location"
        ? `🛰️ Live Location: ${locationData?.name || "Sharing Live Location"}`
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
      pollData,
      locationData,
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

    // Play crisp sent pop sound
    soundEngine.playMessageSent();

    // Outbound WhatsApp / Telegram Live Bridge Dispatch
    if (
      currentChatObj?.platform === "whatsapp" ||
      currentChatObj?.platform === "telegram" ||
      chatId.startsWith("wa_") ||
      chatId.startsWith("tg_")
    ) {
      const platform = currentChatObj?.platform || (chatId.startsWith("wa_") ? "whatsapp" : "telegram");
      const cleanChatId = currentChatObj?.platformChatId || (chatId.startsWith("wa_") ? chatId.replace("wa_", "") : chatId.replace("tg_", ""));
      sendBridgeMessageAsync(platform, {
        chatId: cleanChatId,
        content,
        sender: user,
        mediaUrl: newMessage.fileUrl,
        audioUrl: newMessage.audioUrl,
      });
      if (socket) {
        socket.emit("bridge_send_message", {
          platform,
          chatId: cleanChatId,
          content,
          sender: user,
          mediaUrl: newMessage.fileUrl,
          audioUrl: newMessage.audioUrl,
        });
      }
    }

    if (socket) {
      socket.emit("new message", newMessage);
    }
    notifySyncEvent("NEW_MESSAGE", { chatId, message: newMessage });

    // AI Bot Reply Handler (Powered by Groq AI)
    if (chatId.includes("bot")) {
      const currentChatHistory = messagesMap[chatId] || [];
      (async () => {
        try {
          const botText = await getBotReplyAsync(content, currentChatHistory);
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
        } catch (err) {
          console.error("Error generating Agni Bot Groq reply:", err);
        }
      })();
    }
  };

  // Edit message handler
  const editMessage = async (chatId, messageId, newContent) => {
    if (!chatId || !messageId || !newContent?.trim()) return;

    setMessagesMap((prev) => {
      const chatMsgs = prev[chatId] || [];
      const updated = chatMsgs.map((m) =>
        m._id === messageId ? { ...m, content: newContent, isEdited: true, editedAt: new Date().toISOString() } : m
      );
      return { ...prev, [chatId]: updated };
    });

    setChats((prevChats) =>
      prevChats.map((c) => {
        if (c._id === chatId && c.latestMessage && c.latestMessage._id === messageId) {
          return { ...c, latestMessage: { ...c.latestMessage, content: newContent } };
        }
        return c;
      })
    );

    editMessageAsync(messageId, chatId, newContent);

    if (socket) {
      socket.emit("edit message", { messageId, chatId, newContent });
    }
  };

  // Star / Bookmark message handler
  const toggleStarMessage = (chatId, messageId) => {
    if (!user || !chatId || !messageId) return;

    soundEngine.playReactionSound();

    setMessagesMap((prev) => {
      const chatMsgs = prev[chatId] || [];
      const updated = chatMsgs.map((m) => {
        if (m._id === messageId) {
          let starList = Array.isArray(m.isStarredBy) ? [...m.isStarredBy] : [];
          if (starList.includes(user._id)) {
            starList = starList.filter((id) => id !== user._id);
          } else {
            starList.push(user._id);
          }
          return { ...m, isStarredBy: starList };
        }
        return m;
      });
      return { ...prev, [chatId]: updated };
    });

    toggleStarMessageAsync(messageId, user._id, chatId);

    if (socket) {
      socket.emit("star message", { messageId, userId: user._id, chatId });
    }
  };

  // Pin message in chat
  const pinChatMessage = (chatId, message) => {
    if (!chatId || !message) return;

    setChats((prev) => prev.map((c) => (c._id === chatId ? { ...c, pinnedMessage: message } : c)));
    setSelectedChat((prev) => (prev && prev._id === chatId ? { ...prev, pinnedMessage: message } : prev));

    pinChatMessageAsync(chatId, message);

    if (socket) {
      socket.emit("pin chat message", { chatId, message });
    }
  };

  // Unpin message from chat
  const unpinChatMessage = (chatId) => {
    if (!chatId) return;

    setChats((prev) => prev.map((c) => (c._id === chatId ? { ...c, pinnedMessage: null } : c)));
    setSelectedChat((prev) => (prev && prev._id === chatId ? { ...prev, pinnedMessage: null } : prev));

    unpinChatMessageAsync(chatId);

    if (socket) {
      socket.emit("unpin chat message", { chatId });
    }
  };

  // Forward message to multiple chats
  const forwardMessage = async (message, targetChatIds) => {
    if (!message || !Array.isArray(targetChatIds) || targetChatIds.length === 0 || !user) return;

    soundEngine.playMessageSent();

    for (const targetChatId of targetChatIds) {
      const forwardedMsg = {
        ...message,
        _id: `msg_fwd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        chat: targetChatId,
        sender: user,
        isForwarded: true,
        forwardedFrom: message.sender?.name || "Contact",
        createdAt: new Date().toISOString(),
      };

      setMessagesMap((prev) => {
        const chatMsgs = prev[targetChatId] || [];
        return { ...prev, [targetChatId]: [...chatMsgs, forwardedMsg] };
      });

      setChats((prevChats) => {
        return prevChats.map((c) => {
          if (c._id === targetChatId) {
            return {
              ...c,
              latestMessage: {
                content: forwardedMsg.content || "Forwarded Message",
                sender: user,
                createdAt: forwardedMsg.createdAt,
              },
            };
          }
          return c;
        });
      });
    }

    forwardMessagesAsync(message, targetChatIds, user);
  };

  // Set disappearing messages timer
  const setChatDisappearingTimer = (chatId, seconds) => {
    if (!chatId) return;

    setChats((prev) => prev.map((c) => (c._id === chatId ? { ...c, disappearingTimer: seconds || 0 } : c)));
    setSelectedChat((prev) => (prev && prev._id === chatId ? { ...prev, disappearingTimer: seconds || 0 } : prev));

    setChatDisappearingTimerAsync(chatId, seconds || 0);

    if (socket) {
      socket.emit("disappearing timer", { chatId, timerSeconds: seconds || 0 });
    }
  };

  // Poll voting handler
  const votePoll = (chatId, messageId, optionId) => {
    if (!user || !chatId || !messageId || !optionId) return;

    votePollAsync(chatId, messageId, optionId, user);

    if (socket) {
      socket.emit("vote_poll", { chatId, messageId, optionId, user });
    }
  };

  // Add Option to Poll handler
  const addPollOption = (chatId, messageId, optionText) => {
    if (!user || !chatId || !messageId || !optionText?.trim()) return;

    addPollOptionAsync(chatId, messageId, optionText, user);

    if (socket) {
      socket.emit("add_poll_option", { chatId, messageId, optionText, user });
    }
  };

  // Live Location update handler
  const updateLiveLocation = (chatId, messageId, lat, lng, accuracy) => {
    if (!user || !chatId || !messageId) return;

    updateLiveLocationAsync(chatId, messageId, lat, lng, accuracy);

    if (socket) {
      socket.emit("update_live_location", { chatId, messageId, lat, lng, accuracy });
    }
  };

  // Stop Live Location handler
  const stopLiveLocation = (chatId, messageId) => {
    if (!user || !chatId || !messageId) return;

    stopLiveLocationAsync(chatId, messageId);

    if (socket) {
      socket.emit("stop_live_location", { chatId, messageId });
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

  // Robust WebRTC MediaStream helper with video/audio hardware fallbacks
  const getCallStream = async (callType) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn("navigator.mediaDevices.getUserMedia is not supported on this device/origin");
      toast({
        title: "Media Devices Unavailable",
        description: "Camera/microphone access requires a secure context (HTTPS or localhost).",
        status: "error",
        duration: 3500,
        isClosable: true,
      });
      return null;
    }

    const audioConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };

    if (callType === "video") {
      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: { width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 }, facingMode: "user" },
        });
      } catch (e1) {
        console.warn("Primary HD video stream failed, trying basic video:", e1);
        try {
          return await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          });
        } catch (e2) {
          console.warn("Standard video stream failed, trying unconstrained video:", e2);
          try {
            return await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: true,
            });
          } catch (e3) {
            console.warn("Camera hardware or permission unavailable, falling back to audio stream:", e3);
            try {
              return await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
            } catch (e4) {
              console.warn("Audio hardware stream unavailable:", e4);
              toast({
                title: "Media Access Denied",
                description: "Please check your microphone and camera permissions in browser settings.",
                status: "warning",
                duration: 3500,
                isClosable: true,
              });
              return null;
            }
          }
        }
      }
    } else {
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      } catch (e) {
        console.warn("Audio stream with constraints unavailable, trying basic audio:", e);
        try {
          return await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err2) {
          toast({
            title: "Microphone Access Denied",
            description: "Please check your microphone permissions in browser settings.",
            status: "warning",
            duration: 3500,
            isClosable: true,
          });
          return null;
        }
      }
    }
  };

  // Helper to create and configure RTCPeerConnection with STUN ICE servers
  const createPeerConnection = (targetUserId, fromSocketId, stream) => {
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (e) {}
      peerConnectionRef.current = null;
    }

    remoteStreamRef.current = new MediaStream();

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = pc;
    // NOTE: Keep existing queued pendingIceCandidatesRef to flush after setRemoteDescription

    // Add local media tracks to peer connection
    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    // Ensure audio & video transceivers exist for bidirectional negotiation
    try {
      const senders = pc.getSenders();
      const hasAudio = senders.some((s) => s.track && s.track.kind === "audio");
      const hasVideo = senders.some((s) => s.track && s.track.kind === "video");

      if (!hasAudio) {
        pc.addTransceiver("audio", { direction: "sendrecv" });
      }
      if (!hasVideo) {
        pc.addTransceiver("video", { direction: "sendrecv" });
      }
    } catch (transceiverErr) {
      console.warn("Transceiver initialization notice:", transceiverErr);
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        const destSocketId = fromSocketId || callDataRef.current?.fromSocketId || null;
        socket.emit("ice-candidate", {
          targetUserId,
          toSocketId: destSocketId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("📹 Remote stream track received:", event.track?.kind, event.streams);

      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }
      const activeRemoteStream = remoteStreamRef.current;

      if (event.track) {
        if (!activeRemoteStream.getTracks().some((t) => t.id === event.track.id)) {
          activeRemoteStream.addTrack(event.track);
        }
      }

      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((track) => {
          if (!activeRemoteStream.getTracks().some((t) => t.id === track.id)) {
            activeRemoteStream.addTrack(track);
          }
        });
      }

      const syncRemoteStreamState = () => {
        if (remoteStreamRef.current) {
          setRemoteStream(new MediaStream(remoteStreamRef.current.getTracks()));
        }
      };

      if (event.track) {
        event.track.onunmute = syncRemoteStreamState;
        event.track.onmute = syncRemoteStreamState;
        event.track.onended = syncRemoteStreamState;
      }

      syncRemoteStreamState();
    };

    pc.onconnectionstatechange = () => {
      console.log("WebRTC connection state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        setCallData((prev) => (prev ? { ...prev, status: "connected" } : null));
      } else if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        console.log("WebRTC state changed to:", pc.connectionState);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed") {
        if (typeof pc.restartIce === "function") {
          pc.restartIce();
        }
      }
    };

    return pc;
  };

  // WebRTC Calling Engine
  const startCall = async (targetUser, callType = "video", chatId) => {
    if (!targetUser || !targetUser._id) {
      toast({ title: "Cannot start call: user not available", status: "warning", duration: 2500 });
      return;
    }

    pendingIceCandidatesRef.current = [];
    const stream = await getCallStream(callType);
    if (stream) setLocalStream(stream);

    setCallData({
      caller: targetUser,
      callType,
      chatId,
      targetUserId: targetUser._id,
      status: "calling",
    });
    setIsCallModalOpen(true);

    try {
      const pc = createPeerConnection(targetUser._id, null, stream);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);

      if (socket) {
        socket.emit("call-user", {
          targetUserId: targetUser._id,
          signalData: offer,
          caller: user,
          callType,
          chatId,
        });
      }
    } catch (err) {
      console.error("Error initiating WebRTC call:", err);
      toast({ title: "Call initiation error", description: err.message, status: "error", duration: 3000 });
    }
  };

  const acceptCall = async () => {
    if (!callData) return;
    const callType = callData.callType || "video";
    const stream = await getCallStream(callType);
    if (stream) setLocalStream(stream);

    const targetId = callData.caller?._id || callData.targetUserId;
    const fromSocketId = callData.fromSocketId;

    try {
      const pc = createPeerConnection(targetId, fromSocketId, stream);

      if (callData.signalData) {
        await pc.setRemoteDescription(new RTCSessionDescription(callData.signalData));

        // Flush any queued ICE candidates that arrived before acceptCall
        while (pendingIceCandidatesRef.current.length > 0) {
          const cand = pendingIceCandidatesRef.current.shift();
          try {
            await pc.addIceCandidate(cand);
          } catch (e) {
            console.warn("ICE candidate add error:", e);
          }
        }
      }

      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(answer);

      setCallData((prev) => (prev ? { ...prev, status: "connected" } : null));

      if (socket) {
        socket.emit("answer-call", {
          toSocketId: fromSocketId,
          toUserId: targetId,
          signalData: answer,
        });
      }
    } catch (err) {
      console.error("Error accepting WebRTC call:", err);
      toast({ title: "Failed to connect call", description: err.message, status: "error", duration: 3000 });
    }
  };

  const rejectCall = () => {
    if (socket && callData) {
      socket.emit("reject-call", {
        toSocketId: callData.fromSocketId,
        targetUserId: callData.caller?._id || callData.targetUserId,
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

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        const screenTrack = screenStream.getVideoTracks()[0];
        if (!screenTrack) return;

        if (localStream) {
          const currentVideoTrack = localStream.getVideoTracks()[0];
          if (currentVideoTrack) {
            originalVideoTrackRef.current = currentVideoTrack;
          }
        }

        // Replace track in peer connection if active
        if (peerConnectionRef.current) {
          const senders = peerConnectionRef.current.getSenders();
          const videoSender = senders.find((s) => s.track && s.track.kind === "video");
          if (videoSender) {
            videoSender.replaceTrack(screenTrack);
          }
        }

        screenTrack.onended = () => {
          stopScreenShare();
        };

        const newStream = new MediaStream([
          screenTrack,
          ...(localStream ? localStream.getAudioTracks() : []),
        ]);

        setLocalStream(newStream);
        setIsScreenSharing(true);
      } catch (err) {
        console.warn("Screen sharing cancelled or not supported:", err);
      }
    }
  };

  const stopScreenShare = async () => {
    let cameraTrack = originalVideoTrackRef.current;
    if (!cameraTrack || cameraTrack.readyState === "ended") {
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraTrack = cameraStream.getVideoTracks()[0];
      } catch (e) {
        console.warn("Could not re-acquire camera track:", e);
      }
    }

    if (peerConnectionRef.current && cameraTrack) {
      const senders = peerConnectionRef.current.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === "video");
      if (videoSender) {
        videoSender.replaceTrack(cameraTrack);
      }
    }

    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        if (track !== cameraTrack) track.stop();
      });
      const restoredStream = new MediaStream(
        [cameraTrack, ...localStream.getAudioTracks()].filter(Boolean)
      );
      setLocalStream(restoredStream);
    }

    setIsScreenSharing(false);
    originalVideoTrackRef.current = null;
  };

  const cleanupCall = () => {
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (e) {}
      peerConnectionRef.current = null;
    }
    pendingIceCandidatesRef.current = [];
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current = null;
    }
    if (remoteStream) {
      setRemoteStream(null);
    }
    setIsScreenSharing(false);
    originalVideoTrackRef.current = null;
    setIsCallModalOpen(false);
    setCallData(null);
  };

  // Delete message function
  const deleteMessage = (chatId, messageId, deleteForEveryone = true) => {
    if (!chatId || !messageId) return;

    const isSavedChat = chatId.startsWith("chat_saved_") || chatId.includes("saved");

    setMessagesMap((prev) => {
      const chatMsgs = prev[chatId] || [];
      let updated;
      if (isSavedChat) {
        updated = chatMsgs.filter((m) => m._id !== messageId);
      } else if (deleteForEveryone) {
        updated = chatMsgs.map((m) =>
          m._id === messageId
            ? { ...m, isDeleted: true, content: "This message was deleted", fileUrl: null, audioUrl: null, reactions: {} }
            : m
        );
      } else {
        updated = chatMsgs.filter((m) => m._id !== messageId);
      }
      return { ...prev, [chatId]: updated };
    });

    setChats((prevChats) => {
      return prevChats.map((c) => {
        if (c._id === chatId) {
          const chatMsgs = (messagesMap[chatId] || []).filter((m) => m._id !== messageId && !m.isDeleted);
          const lastMsg = chatMsgs[chatMsgs.length - 1];
          return {
            ...c,
            latestMessage: lastMsg
              ? {
                  content: lastMsg.content,
                  sender: lastMsg.sender,
                  createdAt: lastMsg.createdAt,
                }
              : { content: "No messages yet", createdAt: new Date().toISOString() },
          };
        }
        return c;
      });
    });

    deleteMessageAsync(messageId, chatId, deleteForEveryone, user?._id);

    if (socket) {
      socket.emit("delete message", {
        chatId,
        messageId,
        deleteForEveryone,
        userId: user?._id,
      });
    }

    notifySyncEvent("DELETE_MESSAGE", { chatId, messageId, deleteForEveryone, userId: user?._id });

    toast({
      title: isSavedChat ? "Item removed from Saved Messages" : "Message deleted",
      status: "info",
      duration: 2000,
      isClosable: true,
      position: "bottom-right",
    });
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

  const submitVerificationApplication = async (payload) => {
    if (!user) return;
    const updatedUser = await submitVerificationApplicationAsync(user._id, payload);
    if (updatedUser) {
      setUser(updatedUser);
      setCurrentSessionUser(updatedUser);
      handleUserProfileUpdated(updatedUser);
    }
    return updatedUser;
  };

  const reviewVerificationApplication = async (status, rejectionReason = null) => {
    if (!user) return;
    const updatedUser = await reviewVerificationApplicationAsync(user._id, status, rejectionReason);
    if (updatedUser) {
      setUser(updatedUser);
      setCurrentSessionUser(updatedUser);
      handleUserProfileUpdated(updatedUser);
    }
    return updatedUser;
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
    localStorage.setItem("chakra-ui-color-mode", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    document.documentElement.setAttribute("data-color-mode", nextTheme);
    document.body.setAttribute("data-theme", nextTheme);
    if (setColorMode) {
      setColorMode(nextTheme);
    }
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
        isSoundEnabled,
        toggleSound,
        draftsMap,
        setDraftForChat,
        editMessage,
        toggleStarMessage,
        pinChatMessage,
        unpinChatMessage,
        forwardMessage,
        setChatDisappearingTimer,
        activeFilter,
        setActiveFilter,
        updateUserProfile,
        submitVerificationApplication,
        reviewVerificationApplication,
        addOrSelectChat,
        loadUserData,
        startCall,
        // Status & Story Context Values
        statusFeed,
        setStatusFeed,
        audienceProfiles,
        setAudienceProfiles,
        activeStatusUser,
        setActiveStatusUser,
        isStatusComposerOpen,
        setIsStatusComposerOpen,
        isAudienceModalOpen,
        setIsAudienceModalOpen,
        postNewStatus,
        viewStatusSlide,
        deleteStatusSlide,
        saveAudienceProfile,
        removeAudienceProfile,
        loadStatusData,
        // Interactive Chat Features
        votePoll,
        addPollOption,
        updateLiveLocation,
        stopLiveLocation,
        // Folder Settings Context Values
        folders,
        setFolders,
        isFolderModalOpen,
        setIsFolderModalOpen,
        saveFolders,
        createFolder,
        updateFolder,
        deleteFolder,
        addChatToFolder,
        removeChatFromFolder,
        toggleChatFolder,
        // Omnichannel WhatsApp & Telegram Bridge
        linkedPlatforms,
        setLinkedPlatforms,
        platformFilter,
        setPlatformFilter,
        isLinkedPlatformsModalOpen,
        setIsLinkedPlatformsModalOpen,
        syncBridgeChats,
        sendBridgeMessage,
        // Pin Chat & Saved Messages Context Values
        pinnedChatIds,
        togglePinChat,
        isChatPinned,
        openSavedMessages,
        saveToSavedMessages,
        deleteMessage,
        createDirectBridgeChat,
        // Hide Chat & Block Contact Context Values
        hiddenChatIds,
        hideChat,
        unhideChat,
        isChatHidden,
        blockedUserIds,
        blockUser,
        unblockUser,
        isUserBlocked,
      }}
    >
      {children}
      {/* Global Linked Platforms (WhatsApp & Telegram) Modal */}
      <LinkedPlatformsModal
        isOpen={isLinkedPlatformsModalOpen}
        onClose={() => setIsLinkedPlatformsModalOpen(false)}
      />
      {/* Global WebRTC Audio / Video Call Overlay Modal */}
      <CallModal
        isOpen={isCallModalOpen}
        onClose={cleanupCall}
        callData={callData}
        localStream={localStream}
        remoteStream={remoteStream}
        currentUser={user}
        onAcceptCall={acceptCall}
        onRejectCall={rejectCall}
        onEndCall={endCall}
        isScreenSharing={isScreenSharing}
        onToggleScreenShare={toggleScreenShare}
        onSendRecordedCall={sendMessage}
      />
    </ChatContext.Provider>
  );
};

export const ChatState = () => {
  return useContext(ChatContext);
};

export default ChatProvider;
