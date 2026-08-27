import React, { createContext, useContext, useEffect, useState } from "react";
import { defaultUser, initialFireChats, initialFireMessages, getBotReply } from "../data/fireMockData";

const ChatContext = createContext();

const ChatProvider = ({ children }) => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [user, setUser] = useState(defaultUser);
  const [notification, setNotification] = useState([]);
  const [chats, setChats] = useState(initialFireChats);
  const [messagesMap, setMessagesMap] = useState(initialFireMessages);
  const [theme, setTheme] = useState("dark"); // "dark" or "light"
  const [activeFilter, setActiveFilter] = useState("All"); // "All", "Personal", "Groups", "Channels", "Bots"

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    if (userInfo) {
      setUser(userInfo);
    } else {
      localStorage.setItem("userInfo", JSON.stringify(defaultUser));
    }
  }, []);

  // Sync dataset when selecting first chat if none selected
  useEffect(() => {
    if (!selectedChat && chats && chats.length > 0) {
      setSelectedChat(chats[0]);
    }
  }, [chats, selectedChat]);

  // Handle sending a message in a chat
  const sendMessage = (chatId, content, type = "text", audioBlob = null) => {
    if (!content.trim() && type === "text") return;

    const newMessage = {
      _id: `msg_${Date.now()}`,
      sender: user,
      content,
      type, // "text" | "voice" | "image"
      audioUrl: audioBlob ? URL.createObjectURL(audioBlob) : null,
      chat: chatId,
      createdAt: new Date().toISOString(),
      reactions: {},
    };

    setMessagesMap((prev) => {
      const chatMsgs = prev[chatId] || [];
      return { ...prev, [chatId]: [...chatMsgs, newMessage] };
    });

    // Update latest message snippet in chat list
    setChats((prevChats) =>
      prevChats.map((c) => {
        if (c._id === chatId) {
          return {
            ...c,
            latestMessage: {
              content: type === "voice" ? "🎤 Voice Note" : content,
              sender: user,
              createdAt: newMessage.createdAt,
            },
          };
        }
        return c;
      })
    );

    // Auto Bot Response if sending to Fire Bot 🔥
    if (chatId === "chat_fire_bot") {
      setTimeout(() => {
        const botText = getBotReply(content);
        const botMessage = {
          _id: `msg_bot_${Date.now()}`,
          sender: {
            _id: "bot_fire_ai",
            name: "Fire Bot 🔥",
            pic: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
          },
          content: botText,
          chat: chatId,
          createdAt: new Date().toISOString(),
          reactions: { "🔥": 1 },
        };

        setMessagesMap((prev) => ({
          ...prev,
          [chatId]: [...(prev[chatId] || []), botMessage],
        }));

        setChats((prevChats) =>
          prevChats.map((c) =>
            c._id === chatId
              ? {
                  ...c,
                  latestMessage: {
                    content: botText,
                    sender: botMessage.sender,
                    createdAt: botMessage.createdAt,
                  },
                }
              : c
          )
        );
      }, 900);
    }
  };

  // Toggle emoji reaction on a message
  const toggleReaction = (chatId, messageId, emoji) => {
    setMessagesMap((prev) => {
      const chatMsgs = prev[chatId] || [];
      const updated = chatMsgs.map((m) => {
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
      return { ...prev, [chatId]: updated };
    });
  };

  // Toggle Theme between WhatsApp Dark (#111b21) & WhatsApp Light (#008069/#efeae2)
  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
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
