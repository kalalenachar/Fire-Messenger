// Fire Messenger - Real Persistent Data Layer & REST API Client Engine
import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";
const CURRENT_USER_KEY = "userInfo";

export const defaultUsersList = [
  {
    _id: "user_fire_01",
    name: "Alex Rivers",
    email: "alex@firemessenger.io",
    password: "123",
    pic: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    status: "Available | 🔥 Burning with Passion",
    token: "token_alex_12345",
  },
  {
    _id: "user_sarah",
    name: "Sarah Jenkins",
    email: "sarah@fire.io",
    password: "123",
    pic: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    status: "Designing the future ✨ | Online",
    token: "token_sarah_12345",
  },
  {
    _id: "user_marcus",
    name: "Marcus Vance",
    email: "marcus@fire.io",
    password: "123",
    pic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    status: "Coding late night 💻",
    token: "token_marcus_12345",
  },
  {
    _id: "user_elena",
    name: "Elena Rostova",
    email: "elena@fire.io",
    password: "123",
    pic: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    status: "Building real-time apps 🚀",
    token: "token_elena_12345",
  },
];

export const fireBotUser = {
  _id: "bot_fire_ai",
  name: "Fire Bot 🔥",
  email: "bot@firemessenger.io",
  pic: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
  status: "Official Automated Assistant | Online 24/7",
};

// --- AUTHENTICATION & USERS REST APIS ---

export const loginUserAsync = async (email, password) => {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/user/login`, { email, password });
    if (data.success) {
      setCurrentSessionUser(data.user);
      return data.user;
    }
    throw new Error(data.message || "Login failed");
  } catch (error) {
    const msg = error.response?.data?.message || error.message || "Server connection error";
    throw new Error(msg);
  }
};

export const registerUserAsync = async ({ name, email, password, pic, status }) => {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/user/signup`, { name, email, password, pic, status });
    if (data.success) {
      setCurrentSessionUser(data.user);
      return data.user;
    }
    throw new Error(data.message || "Registration failed");
  } catch (error) {
    const msg = error.response?.data?.message || error.message || "Server connection error";
    throw new Error(msg);
  }
};

export const updateUserProfileInDb = async (userId, updates) => {
  try {
    const { data } = await axios.put(`${API_BASE_URL}/user/profile`, { userId, updates });
    if (data.success) {
      const current = getCurrentSessionUser();
      if (current && current._id === userId) {
        setCurrentSessionUser({ ...current, ...updates });
      }
      return data.user;
    }
  } catch (error) {
    console.warn("Could not update user profile on server:", error);
  }
};

export const searchUsersAsync = async (searchQuery, currentUserId) => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/user/search`, {
      params: { search: searchQuery, userId: currentUserId },
    });
    return data.success ? data.users : [];
  } catch (error) {
    console.warn("Error searching users:", error);
    return [];
  }
};

// Session Management
export const getCurrentSessionUser = () => {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
};

export const setCurrentSessionUser = (user) => {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
};

export const clearCurrentSession = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

// --- CHATS & MESSAGES REST APIS ---

export const fetchUserChatsAsync = async (userId) => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/chats/${userId}`);
    return data.success ? data.chats : [];
  } catch (error) {
    console.warn("Server unavailable, fallback to stored chats:", error);
    return [];
  }
};

export const saveChatAsync = async (chatData) => {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/chats`, chatData);
    return data.success ? data.chat : null;
  } catch (error) {
    console.warn("Error saving chat to server DB:", error);
  }
};

export const fetchChatMessagesAsync = async (chatId) => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/messages/${chatId}`);
    return data.success ? data.messages : [];
  } catch (error) {
    console.warn("Error fetching messages for chat:", chatId, error);
    return [];
  }
};

export const saveMessageAsync = async (newMessage) => {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/messages`, newMessage);
    return data.success ? data.message : newMessage;
  } catch (error) {
    console.warn("Error persisting message to server DB:", error);
    return newMessage;
  }
};

export const toggleReactionAsync = async (chatId, messageId, emoji) => {
  try {
    const { data } = await axios.put(`${API_BASE_URL}/messages/reaction`, { chatId, messageId, emoji });
    return data.success ? data.messages : [];
  } catch (error) {
    console.warn("Error toggling reaction on server DB:", error);
  }
};

// Synchronous fallbacks for backwards compatibility
export const loginUser = loginUserAsync;
export const registerUser = registerUserAsync;

export const getStoredChats = (userId) => {
  const data = localStorage.getItem(`fire_messenger_chats_${userId}`);
  return data ? JSON.parse(data) : null;
};

export const saveStoredChats = (userId, chats) => {
  localStorage.setItem(`fire_messenger_chats_${userId}`, JSON.stringify(chats));
};

export const getStoredMessagesMap = (userId) => {
  const data = localStorage.getItem(`fire_messenger_messages_${userId}`);
  return data ? JSON.parse(data) : null;
};

export const saveStoredMessagesMap = (userId, messagesMap) => {
  localStorage.setItem(`fire_messenger_messages_${userId}`, JSON.stringify(messagesMap));
};

export const getInitialChatsForUser = (user) => {
  return [];
};

export const getInitialMessagesForUser = (user) => {
  return {};
};

// Live Broadcast Sync Channel Across Tabs
let broadcastChannel = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  broadcastChannel = new BroadcastChannel("fire_messenger_live_channel");
}

export const notifySyncEvent = (type, payload) => {
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type, payload, timestamp: Date.now() });
  }
};

export const subscribeSyncEvent = (callback) => {
  if (!broadcastChannel) return () => {};
  const handler = (event) => {
    if (event.data && event.data.type) {
      callback(event.data);
    }
  };
  broadcastChannel.addEventListener("message", handler);
  return () => {
    broadcastChannel.removeEventListener("message", handler);
  };
};

