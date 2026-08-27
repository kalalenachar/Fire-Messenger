import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  getCurrentSessionUser,
  setCurrentSessionUser,
  getStoredChats,
  saveStoredChats,
  getStoredMessagesMap,
  saveStoredMessagesMap,
  getInitialChatsForUser,
  getInitialMessagesForUser,
  notifySyncEvent,
  subscribeSyncEvent,
  updateUserProfileInDb,
  fireBotUser,
} from "../data/fireStorage";
import { getBotReply } from "../data/fireMockData";

const ChatContext = createContext();

const ChatProvider = ({ children }) => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [user, setUser] = useState(() => getCurrentSessionUser());
  const [notification, setNotification] = useState([]);
  const [chats, setChats] = useState([]);
  const [messagesMap, setMessagesMap] = useState({});
  const [theme, setTheme] = useState(() => localStorage.getItem("fire_messenger_theme") || "dark");
  const [activeFilter, setActiveFilter] = useState("All");

  // Sync theme to DOM on initial mount & whenever theme state changes
  useEffect(() => {
    const activeTheme = localStorage.getItem("fire_messenger_theme") || theme || "dark";
    document.documentElement.setAttribute("data-theme", activeTheme);
  }, [theme]);

  // Load chats & messages for logged-in user
  const loadUserData = useCallback((currentUser) => {
    if (!currentUser) return;

    let userChats = getStoredChats(currentUser._id);
    if (!userChats) {
      userChats = getInitialChatsForUser(currentUser);
      saveStoredChats(currentUser._id, userChats);
    }

    let userMessages = getStoredMessagesMap(currentUser._id);
    if (!userMessages) {
      userMessages = getInitialMessagesForUser(currentUser);
      saveStoredMessagesMap(currentUser._id, userMessages);
    }

    setChats(userChats);
    setMessagesMap(userMessages);

    if (userChats.length > 0) {
      setSelectedChat(userChats[0]);
    }
  }, []);

  // React to changes in `user` state (e.g. login/signup)
  useEffect(() => {
    if (user) {
      loadUserData(user);
    } else {
      const sessionUser = getCurrentSessionUser();
      if (sessionUser) {
        setUser(sessionUser);
        loadUserData(sessionUser);
      }
    }
  }, [user, loadUserData]);

  // Listen to multi-tab sync events
  useEffect(() => {
    const unsubscribe = subscribeSyncEvent((event) => {
      const { type, payload } = event;
      if (!user) return;

      if (type === "NEW_MESSAGE") {
        const { chatId, message } = payload;
        setMessagesMap((prev) => {
          const chatMsgs = prev[chatId] || [];
          if (chatMsgs.some((m) => m._id === message._id)) return prev;
          const updated = { ...prev, [chatId]: [...chatMsgs, message] };
          saveStoredMessagesMap(user._id, updated);
          return updated;
        });

        setChats((prevChats) => {
          const updated = prevChats.map((c) => {
            if (c._id === chatId) {
              return {
                ...c,
                latestMessage: {
                  content: message.type === "voice" ? "🎤 Voice Note" : message.content,
                  sender: message.sender,
                  createdAt: message.createdAt,
                },
              };
            }
            return c;
          });
          saveStoredChats(user._id, updated);
          return updated;
        });

        if (!selectedChat || selectedChat._id !== chatId) {
          setNotification((prev) => [payload, ...prev]);
        }
      } else if (type === "NEW_CHAT") {
        setChats((prev) => {
          if (prev.some((c) => c._id === payload._id)) return prev;
          const updated = [payload, ...prev];
          saveStoredChats(user._id, updated);
          return updated;
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
          const updatedMap = { ...prev, [chatId]: updatedMsgs };
          saveStoredMessagesMap(user._id, updatedMap);
          return updatedMap;
        });
      } else if (type === "USER_UPDATED") {
        if (payload._id === user._id) {
          setUser(payload);
        }
      }
    });

    return () => unsubscribe();
  }, [user, selectedChat]);

  // Handle sending a message
  const sendMessage = (chatId, content, type = "text", attachmentData = null) => {
    if (!content.trim() && type === "text" && !attachmentData) return;
    if (!user) return;

    const newMessage = {
      _id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      sender: user,
      content,
      type, // "text" | "voice" | "image" | "file"
      audioUrl: type === "voice" ? attachmentData : null,
      fileUrl: type === "image" || type === "file" ? attachmentData : null,
      chat: chatId,
      createdAt: new Date().toISOString(),
      reactions: {},
    };

    setMessagesMap((prev) => {
      const chatMsgs = prev[chatId] || [];
      const updated = { ...prev, [chatId]: [...chatMsgs, newMessage] };
      saveStoredMessagesMap(user._id, updated);
      return updated;
    });

    setChats((prevChats) => {
      const updated = prevChats.map((c) => {
        if (c._id === chatId) {
          return {
            ...c,
            latestMessage: {
              content: type === "voice" ? "🎤 Voice Note" : type === "image" ? "📷 Photo" : content,
              sender: user,
              createdAt: newMessage.createdAt,
            },
          };
        }
        return c;
      });
      saveStoredChats(user._id, updated);
      return updated;
    });

    notifySyncEvent("NEW_MESSAGE", { chatId, message: newMessage });

    if (chatId === "chat_fire_bot") {
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
          const updated = { ...prev, [chatId]: [...chatMsgs, botMessage] };
          saveStoredMessagesMap(user._id, updated);
          return updated;
        });

        setChats((prevChats) => {
          const updated = prevChats.map((c) => {
            if (c._id === chatId) {
              return {
                ...c,
                latestMessage: {
                  content: botText,
                  sender: fireBotUser,
                  createdAt: botMessage.createdAt,
                },
              };
            }
            return c;
          });
          saveStoredChats(user._id, updated);
          return updated;
        });

        notifySyncEvent("NEW_MESSAGE", { chatId, message: botMessage });
      }, 700);
    }
  };

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
      const updatedMap = { ...prev, [chatId]: updatedMsgs };
      saveStoredMessagesMap(user._id, updatedMap);
      return updatedMap;
    });

    notifySyncEvent("TOGGLE_REACTION", { chatId, messageId, emoji });
  };

  const updateUserProfile = (updates) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    setCurrentSessionUser(updatedUser);
    updateUserProfileInDb(user._id, updates);
    notifySyncEvent("USER_UPDATED", updatedUser);
  };

  const addOrSelectChat = (newChat) => {
    if (!user) return;
    setChats((prev) => {
      const existing = prev.find((c) => c._id === newChat._id);
      if (existing) return prev;
      const updated = [newChat, ...prev];
      saveStoredChats(user._id, updated);
      return updated;
    });
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
        toggleReaction,
        theme,
        toggleTheme,
        activeFilter,
        setActiveFilter,
        updateUserProfile,
        addOrSelectChat,
        loadUserData,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const ChatState = () => {
  return useContext(ChatContext);
};

export default ChatProvider;
