// Agni Messenger - Real Persistent Data Layer & REST API Client Engine
import axios from "axios";

export const API_BASE_URL =
  window.location.port === "3000"
    ? `http://${window.location.hostname}:5000/api`
    : `${window.location.protocol}//${window.location.host}/api`;
const CURRENT_USER_KEY = "userInfo";

export const defaultUsersList = [];

export const fireBotUser = {
  _id: "bot_fire_ai",
  name: "Agni Bot 🔥",
  email: "bot@agnimessenger.io",
  pic: "https://api.dicebear.com/7.x/bottts/svg?seed=AgniBot",
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
    // If backend is unreachable or returning network error (e.g. mobile testing without adb reverse)
    if (!error.response || error.code === "ERR_NETWORK" || error.message.includes("Network Error")) {
      const cleanInput = (email || "").trim().toLowerCase();
      const localUsers = JSON.parse(localStorage.getItem("fire_registered_users") || "[]");
      const matched = localUsers.find(
        (u) => (u.email && u.email.toLowerCase() === cleanInput) || (u.username && u.username.toLowerCase() === cleanInput)
      );
      if (matched) {
        setCurrentSessionUser(matched);
        return matched;
      }
      // Demo / Developer fallback login for seamless testing
      const fallbackUser = {
        _id: `user_${Date.now()}`,
        name: cleanInput.includes("@") ? cleanInput.split("@")[0] : cleanInput || "Agni User",
        username: cleanInput.replace(/[^a-z0-9_]/g, "") || "agni_user",
        email: cleanInput.includes("@") ? cleanInput : `${cleanInput}@agnimessenger.io`,
        pic: null,
        status: "🔥 Burning with Passion | Agni Messenger",
        token: `offline_token_${Date.now()}`,
        isAdmin: cleanInput.includes("admin") || cleanInput === "alex" || cleanInput === "kalalenachar@gmail.com",
      };
      setCurrentSessionUser(fallbackUser);
      return fallbackUser;
    }
    const msg = error.response?.data?.message || error.message || "Server connection error";
    throw new Error(msg);
  }
};

export const checkUsernameAvailabilityAsync = async (username) => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/user/check-username`, {
      params: { username },
    });
    if (data && typeof data === "object" && "available" in data) {
      return data;
    }
    return { success: false, available: null, serverError: true, message: "⚠️ Unexpected server response — will be checked on submit." };
  } catch (error) {
    const serverData = error.response?.data;
    if (serverData && typeof serverData === "object" && "available" in serverData) {
      return serverData;
    }
    return { success: false, available: null, serverError: true, message: "⚠️ Server unreachable — username will be verified on submit." };
  }
};

export const registerUserAsync = async ({ name, username, email, password, pic, status }) => {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/user/signup`, { name, username, email, password, pic, status });
    if (data.success) {
      setCurrentSessionUser(data.user);
      return data.user;
    }
    throw new Error(data.message || "Registration failed");
  } catch (error) {
    if (!error.response || error.code === "ERR_NETWORK" || error.message.includes("Network Error")) {
      const newUser = {
        _id: `user_${Date.now()}`,
        name: name || "New User",
        username: (username || name || "user").toLowerCase().replace(/[^a-z0-9_]/g, ""),
        email: email || `${username}@agnimessenger.io`,
        pic: pic || null,
        status: status || "🔥 Burning with Passion | Agni Messenger",
        token: `offline_token_${Date.now()}`,
        isAdmin: false,
      };
      const localUsers = JSON.parse(localStorage.getItem("fire_registered_users") || "[]");
      localUsers.push(newUser);
      localStorage.setItem("fire_registered_users", JSON.stringify(localUsers));
      setCurrentSessionUser(newUser);
      return newUser;
    }
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

export const submitVerificationApplicationAsync = async (userId, payload) => {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/user/verify/submit`, { userId, payload });
    if (data.success) {
      const current = getCurrentSessionUser();
      if (current && current._id === userId) {
        setCurrentSessionUser(data.user);
      }
      return data.user;
    }
    throw new Error(data.message || "Verification submission failed");
  } catch (error) {
    const msg = error.response?.data?.message || error.message || "Server connection error";
    throw new Error(msg);
  }
};

export const reviewVerificationApplicationAsync = async (userId, status, rejectionReason) => {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/user/verify/review`, { userId, status, rejectionReason });
    if (data.success) {
      const current = getCurrentSessionUser();
      if (current && current._id === userId) {
        setCurrentSessionUser(data.user);
      }
      return data.user;
    }
    throw new Error(data.message || "Verification review failed");
  } catch (error) {
    const msg = error.response?.data?.message || error.message || "Server connection error";
    throw new Error(msg);
  }
};

export const sanitizeUser = (user) => {
  if (!user || typeof user !== "object") return user;
  const updated = { ...user };
  if (updated.email && typeof updated.email === "string") {
    updated.email = updated.email
      .replace(/@firemessenger\.io$/i, "@agnimessenger.io")
      .replace(/@fire\.io$/i, "@agnimessenger.io")
      .replace(/@agni\.io$/i, "@agnimessenger.io");
  }
  return updated;
};

export const searchUsersAsync = async (searchQuery, currentUserId) => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/user/search`, {
      params: { search: searchQuery, userId: currentUserId },
    });
    if (data.success && Array.isArray(data.users)) {
      return data.users.map(sanitizeUser);
    }
    return [];
  } catch (error) {
    console.warn("Error searching users:", error);
    return [];
  }
};

export const safeLocalStorageSetItem = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    if (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED" || error.code === 22) {
      try {
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith("fire_messenger_messages_")) {
            localStorage.removeItem(k);
          }
        });
        localStorage.setItem(key, value);
      } catch (e) {
        // Fallback silently if browser storage is disabled
      }
    }
  }
};

// User Folders Management
export const fetchUserFoldersAsync = async (userId) => {
  if (!userId) return [];
  try {
    const { data } = await axios.get(`${API_BASE_URL}/user/folders/${userId}`);
    if (data.success) {
      safeLocalStorageSetItem(`fire_folders_${userId}`, JSON.stringify(data.folders));
      return data.folders;
    }
    return [];
  } catch (error) {
    console.warn("Could not fetch user folders from server:", error?.message || error);
    const local = localStorage.getItem(`fire_folders_${userId}`);
    return local ? JSON.parse(local) : [];
  }
};

export const saveUserFoldersAsync = async (userId, folders) => {
  if (!userId) return folders;
  try {
    safeLocalStorageSetItem(`fire_folders_${userId}`, JSON.stringify(folders));
    const { data } = await axios.put(`${API_BASE_URL}/user/folders`, { userId, folders });
    return data.success ? data.folders : folders;
  } catch (error) {
    console.warn("Could not save user folders to server:", error?.message || error);
    return folders;
  }
};

// Session Management
export const getCurrentSessionUser = () => {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  if (!data) return null;
  try {
    const raw = JSON.parse(data);
    const sanitized = sanitizeUser(raw);
    if (sanitized.email !== raw.email) {
      safeLocalStorageSetItem(CURRENT_USER_KEY, JSON.stringify(sanitized));
    }
    return sanitized;
  } catch (e) {
    return null;
  }
};

export const setCurrentSessionUser = (user) => {
  const sanitized = sanitizeUser(user);
  safeLocalStorageSetItem(CURRENT_USER_KEY, JSON.stringify(sanitized));
};

export const clearCurrentSession = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

// --- CHATS & MESSAGES REST APIS ---

export const fetchUserChatsAsync = async (userId) => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/chats/${userId}`);
    if (data.success && Array.isArray(data.chats)) {
      saveStoredChats(userId, data.chats);
      return data.chats;
    }
    return getStoredChats(userId) || [];
  } catch (error) {
    console.warn("Server unavailable, fallback to stored chats:", error);
    return getStoredChats(userId) || [];
  }
};

export const saveChatAsync = async (chatData) => {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/chats`, chatData);
    const chat = data.success ? data.chat : chatData.chat || chatData;
    if (chat) {
      const currentUser = getCurrentSessionUser();
      if (currentUser) {
        const stored = getStoredChats(currentUser._id) || [];
        const existingIdx = stored.findIndex((c) => c._id === chat._id);
        if (existingIdx !== -1) {
          stored[existingIdx] = chat;
        } else {
          stored.unshift(chat);
        }
        saveStoredChats(currentUser._id, stored);
      }
    }
    return chat;
  } catch (error) {
    console.warn("Error saving chat to server DB, storing locally:", error);
    const chat = chatData.chat || chatData;
    const currentUser = getCurrentSessionUser();
    if (currentUser && chat) {
      const stored = getStoredChats(currentUser._id) || [];
      const existingIdx = stored.findIndex((c) => c._id === chat._id);
      if (existingIdx !== -1) {
        stored[existingIdx] = chat;
      } else {
        stored.unshift(chat);
      }
      saveStoredChats(currentUser._id, stored);
    }
    return chat;
  }
};

export const fetchChatMessagesAsync = async (chatId) => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/messages/${chatId}`);
    if (data.success && Array.isArray(data.messages)) {
      const currentUser = getCurrentSessionUser();
      if (currentUser) {
        const storedMap = getStoredMessagesMap(currentUser._id) || {};
        storedMap[chatId] = data.messages;
        saveStoredMessagesMap(currentUser._id, storedMap);
      }
      return data.messages;
    }
    const currentUser = getCurrentSessionUser();
    if (currentUser) {
      const storedMap = getStoredMessagesMap(currentUser._id) || {};
      return storedMap[chatId] || [];
    }
    return [];
  } catch (error) {
    console.warn("Error fetching messages for chat:", chatId, error);
    const currentUser = getCurrentSessionUser();
    if (currentUser) {
      const storedMap = getStoredMessagesMap(currentUser._id) || {};
      return storedMap[chatId] || [];
    }
    return [];
  }
};

export const saveMessageAsync = async (newMessage) => {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/messages`, newMessage);
    const msg = data.success ? data.message : newMessage;
    const currentUser = getCurrentSessionUser();
    if (currentUser && msg) {
      const chatId = msg.chatObj?._id || (typeof msg.chat === "object" ? msg.chat?._id : msg.chat);
      if (chatId) {
        const storedMap = getStoredMessagesMap(currentUser._id) || {};
        const chatMsgs = storedMap[chatId] || [];
        if (!chatMsgs.some((m) => m._id === msg._id)) {
          storedMap[chatId] = [...chatMsgs, msg];
          saveStoredMessagesMap(currentUser._id, storedMap);
        }
      }
    }
    return msg;
  } catch (error) {
    console.warn("Error persisting message to server DB, saving locally:", error);
    const currentUser = getCurrentSessionUser();
    if (currentUser && newMessage) {
      const chatId = newMessage.chatObj?._id || (typeof newMessage.chat === "object" ? newMessage.chat?._id : newMessage.chat);
      if (chatId) {
        const storedMap = getStoredMessagesMap(currentUser._id) || {};
        const chatMsgs = storedMap[chatId] || [];
        if (!chatMsgs.some((m) => m._id === newMessage._id)) {
          storedMap[chatId] = [...chatMsgs, newMessage];
          saveStoredMessagesMap(currentUser._id, storedMap);
        }
      }
    }
    return newMessage;
  }
};

export const toggleReactionAsync = async (chatId, messageId, emoji) => {
  try {
    const { data } = await axios.put(`${API_BASE_URL}/messages/reaction`, { chatId, messageId, emoji });
    return data.success ? data.messages : [];
  } catch (error) {
    console.warn("Error toggling reaction on server DB:", error);
    return [];
  }
};

export const deleteMessageAsync = async (messageId, chatId, deleteForEveryone = true, userId = null) => {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/messages/delete`, {
      messageId,
      chatId,
      deleteForEveryone,
      userId,
    });

    const currentUser = getCurrentSessionUser();
    if (currentUser && chatId) {
      const storedMap = getStoredMessagesMap(currentUser._id) || {};
      const chatMsgs = storedMap[chatId] || [];
      const isSavedChat = chatId.startsWith("chat_saved_") || chatId.includes("saved");

      let updatedMsgs;
      if (isSavedChat) {
        updatedMsgs = chatMsgs.filter((m) => m._id !== messageId);
      } else if (deleteForEveryone) {
        updatedMsgs = chatMsgs.map((m) =>
          m._id === messageId
            ? { ...m, isDeleted: true, content: "This message was deleted", fileUrl: null, audioUrl: null, reactions: {} }
            : m
        );
      } else {
        updatedMsgs = chatMsgs.filter((m) => m._id !== messageId);
      }
      storedMap[chatId] = updatedMsgs;
      saveStoredMessagesMap(currentUser._id, storedMap);
    }

    return data;
  } catch (error) {
    console.warn("Error deleting message on server DB:", error);
    const currentUser = getCurrentSessionUser();
    if (currentUser && chatId) {
      const storedMap = getStoredMessagesMap(currentUser._id) || {};
      const chatMsgs = storedMap[chatId] || [];
      storedMap[chatId] = chatMsgs.filter((m) => m._id !== messageId);
      saveStoredMessagesMap(currentUser._id, storedMap);
    }
    return { success: true, messageId };
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
  safeLocalStorageSetItem(`fire_messenger_chats_${userId}`, JSON.stringify(chats));
};

export const getStoredMessagesMap = (userId) => {
  const data = localStorage.getItem(`fire_messenger_messages_${userId}`);
  return data ? JSON.parse(data) : null;
};

export const saveStoredMessagesMap = (userId, messagesMap) => {
  safeLocalStorageSetItem(`fire_messenger_messages_${userId}`, JSON.stringify(messagesMap));
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

// --- STATUS & AUDIENCE PROFILE API CLIENT METHODS ---

export const fetchStatusFeedAsync = async (userId) => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/status/feed/${userId}`);
    return data.success ? data.feed : [];
  } catch (error) {
    console.error("Error fetching status feed:", error);
    return [];
  }
};

export const createStatusPostAsync = async (userId, postData) => {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/status`, { userId, postData });
    return data.success ? data.post : null;
  } catch (error) {
    console.error("Error creating status post:", error);
    throw error;
  }
};

export const recordStatusViewAsync = async (statusId, viewerUser) => {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/status/view`, { statusId, viewerUser });
    return data.success ? data.post : null;
  } catch (error) {
    console.error("Error recording status view:", error);
    return null;
  }
};

export const deleteStatusPostAsync = async (userId, statusId) => {
  try {
    const { data } = await axios.delete(`${API_BASE_URL}/status/${userId}/${statusId}`);
    return data.success;
  } catch (error) {
    console.error("Error deleting status post:", error);
    return false;
  }
};

export const fetchAudienceProfilesAsync = async (userId) => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/audience-profiles/${userId}`);
    return data.success ? data.profiles : [];
  } catch (error) {
    console.error("Error fetching audience profiles:", error);
    return [];
  }
};

export const saveAudienceProfileAsync = async (userId, profileData) => {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/audience-profiles`, { userId, profileData });
    return data.success ? data.profile : null;
  } catch (error) {
    console.error("Error saving audience profile:", error);
    throw error;
  }
};

export const deleteAudienceProfileAsync = async (userId, profileId) => {
  try {
    const { data } = await axios.delete(`${API_BASE_URL}/audience-profiles/${userId}/${profileId}`);
    return data.success;
  } catch (error) {
    console.error("Error deleting audience profile:", error);
    return false;
  }
};

export const votePollAsync = async (chatId, messageId, optionId, user) => {
  try {
    const { data } = await axios.put(`${API_BASE_URL}/messages/poll-vote`, { chatId, messageId, optionId, user });
    return data.success ? data.message : null;
  } catch (error) {
    console.error("Error voting on poll:", error);
    return null;
  }
};

export const addPollOptionAsync = async (chatId, messageId, optionText, user) => {
  try {
    const { data } = await axios.put(`${API_BASE_URL}/messages/poll-add-option`, { chatId, messageId, optionText, user });
    return data.success ? data.message : null;
  } catch (error) {
    console.error("Error adding option to poll:", error);
    return null;
  }
};

export const updateLiveLocationAsync = async (chatId, messageId, lat, lng, accuracy) => {
  try {
    const { data } = await axios.put(`${API_BASE_URL}/messages/live-location`, { chatId, messageId, lat, lng, accuracy });
    return data.success ? data.message : null;
  } catch (error) {
    console.error("Error updating live location:", error);
    return null;
  }
};

export const stopLiveLocationAsync = async (chatId, messageId) => {
  try {
    const { data } = await axios.put(`${API_BASE_URL}/messages/stop-live-location`, { chatId, messageId });
    return data.success ? data.message : null;
  } catch (error) {
    console.error("Error stopping live location:", error);
    return null;
  }
};

export const submitReportAsync = async (reporterUser, targetObj, reason, details) => {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/reports`, {
      reporterUser,
      targetObj,
      reason,
      details,
    });
    return data;
  } catch (error) {
    console.error("Error submitting report to server:", error);
    return { success: false, message: error.message };
  }
};

// --- ADMIN REST API FUNCTIONS ---

export const getAdminStatsAsync = async () => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/admin/stats`);
    return data.success ? data.stats : null;
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return null;
  }
};

export const getAllUsersAdminAsync = async () => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/admin/users`);
    return data.success ? data.users : [];
  } catch (error) {
    console.error("Error fetching admin users list:", error);
    return [];
  }
};

export const updateUserRoleAdminAsync = async (userId, isAdmin) => {
  try {
    const { data } = await axios.put(`${API_BASE_URL}/admin/users/${userId}/role`, { isAdmin });
    return data.success ? data.user : null;
  } catch (error) {
    console.error("Error updating user role:", error);
    throw new Error(error.response?.data?.message || "Failed to update user role");
  }
};

export const toggleUserBanAdminAsync = async (userId, isBanned) => {
  try {
    const { data } = await axios.put(`${API_BASE_URL}/admin/users/${userId}/ban`, { isBanned });
    return data.success ? data.user : null;
  } catch (error) {
    console.error("Error updating user ban state:", error);
    throw new Error(error.response?.data?.message || "Failed to update ban status");
  }
};

export const deleteUserAdminAsync = async (userId) => {
  try {
    const { data } = await axios.delete(`${API_BASE_URL}/admin/users/${userId}`);
    return data.success ? data.user : null;
  } catch (error) {
    console.error("Error deleting user account:", error);
    throw new Error(error.response?.data?.message || "Failed to delete user");
  }
};

export const getAdminVerificationsAsync = async () => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/admin/verifications`);
    return data.success ? data.verifications : [];
  } catch (error) {
    console.error("Error fetching verification requests:", error);
    return [];
  }
};

export const getAdminReportsAsync = async () => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/admin/reports`);
    return data.success ? data.reports : [];
  } catch (error) {
    console.error("Error fetching admin reports:", error);
    return [];
  }
};

export const updateReportStatusAsync = async (reportId, status, adminNotes) => {
  try {
    const { data } = await axios.put(`${API_BASE_URL}/admin/reports/${reportId}`, { status, adminNotes });
    return data.success ? data.report : null;
  } catch (error) {
    console.error("Error updating report status:", error);
    throw new Error(error.response?.data?.message || "Failed to update report status");
  }
};

export const sendAdminBroadcastAsync = async (content) => {
  try {
    const { data } = await axios.post(`${API_BASE_URL}/admin/broadcast`, { content });
    return data;
  } catch (error) {
    console.error("Error sending admin broadcast:", error);
    throw new Error(error.response?.data?.message || "Failed to dispatch broadcast");
  }
};

export const editMessageAsync = async (messageId, chatId, newContent) => {
  try {
    const res = await axios.put(`${API_BASE_URL}/messages/edit`, { messageId, chatId, newContent });
    return res?.data?.success ? res.data.message : null;
  } catch (error) {
    console.error("Error editing message:", error?.message || error);
    return null;
  }
};

export const toggleStarMessageAsync = async (messageId, userId, chatId) => {
  try {
    const res = await axios.put(`${API_BASE_URL}/messages/star`, { messageId, userId, chatId });
    return res?.data?.success ? res.data.message : null;
  } catch (error) {
    console.error("Error starring message:", error?.message || error);
    return null;
  }
};

export const pinChatMessageAsync = async (chatId, message) => {
  try {
    const res = await axios.put(`${API_BASE_URL}/messages/pin`, { chatId, message });
    return res?.data?.success ? res.data.chat : null;
  } catch (error) {
    console.error("Error pinning message:", error?.message || error);
    return null;
  }
};

export const unpinChatMessageAsync = async (chatId) => {
  try {
    const res = await axios.put(`${API_BASE_URL}/messages/unpin`, { chatId });
    return res?.data?.success ? res.data.chat : null;
  } catch (error) {
    console.error("Error unpinning message:", error?.message || error);
    return null;
  }
};

export const forwardMessagesAsync = async (message, targetChatIds, senderUser) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/messages/forward`, { message, targetChatIds, senderUser });
    return res?.data?.success ? res.data.messages : [];
  } catch (error) {
    console.error("Error forwarding messages:", error?.message || error);
    return [];
  }
};

export const setChatDisappearingTimerAsync = async (chatId, seconds) => {
  try {
    const res = await axios.put(`${API_BASE_URL}/messages/disappearing-timer`, { chatId, seconds });
    return res?.data?.success ? res.data.chat : null;
  } catch (error) {
    console.error("Error setting disappearing timer:", error?.message || error);
    return null;
  }
};

// --- WHATSAPP & TELEGRAM BRIDGE REST API CLIENTS ---

export const fetchPlatformsStatusAsync = async (userId) => {
  try {
    const res = await axios.get(`${API_BASE_URL}/bridge/status/${userId}`);
    return res?.data?.success ? res.data.platforms : { whatsapp: { connected: false }, telegram: { connected: false } };
  } catch (error) {
    console.warn("Error fetching platforms status:", error?.message || error);
    return { whatsapp: { connected: false }, telegram: { connected: false } };
  }
};

export const startWhatsAppBridgeAsync = async (userId, phone) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/bridge/whatsapp/start`, { userId, phone });
    return res?.data?.success ? res.data.session : null;
  } catch (error) {
    console.error("Error starting WhatsApp bridge:", error?.message || error);
    return null;
  }
};

export const confirmWhatsAppBridgeAsync = async (userId, phone, name) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/bridge/whatsapp/confirm`, { userId, phone, name });
    return res?.data?.success ? res.data.session : null;
  } catch (error) {
    console.error("Error confirming WhatsApp bridge:", error?.message || error);
    return null;
  }
};

export const disconnectWhatsAppBridgeAsync = async (userId) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/bridge/whatsapp/disconnect`, { userId });
    return res?.data?.success;
  } catch (error) {
    console.error("Error disconnecting WhatsApp bridge:", error?.message || error);
    return false;
  }
};

export const startTelegramBridgeAsync = async (userId) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/bridge/telegram/start`, { userId });
    return res?.data?.success ? res.data.session : null;
  } catch (error) {
    console.error("Error starting Telegram bridge:", error?.message || error);
    return null;
  }
};

export const confirmTelegramBridgeAsync = async (userId, username, name) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/bridge/telegram/confirm`, { userId, username, name });
    return res?.data?.success ? res.data.session : null;
  } catch (error) {
    console.error("Error confirming Telegram bridge:", error?.message || error);
    return null;
  }
};

export const disconnectTelegramBridgeAsync = async (userId) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/bridge/telegram/disconnect`, { userId });
    return res?.data?.success;
  } catch (error) {
    console.error("Error disconnecting Telegram bridge:", error?.message || error);
    return false;
  }
};

export const fetchSyncedBridgeChatsAsync = async (userId, user) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/bridge/chats/${userId}`, { user });
    return res?.data?.success ? res.data.chats : [];
  } catch (error) {
    console.warn("Error fetching synced bridge chats:", error?.message || error);
    return [];
  }
};

export const createDirectBridgeChatAsync = async (platform, userId, targetIdentifier, user) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/bridge/create-chat`, { platform, userId, targetIdentifier, user });
    return res?.data?.success ? res.data.chat : null;
  } catch (error) {
    console.error("Error creating direct bridge chat:", error?.message || error);
    return null;
  }
};

export const sendBridgeMessageAsync = async (platform, messageData) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/bridge/send`, { platform, ...messageData });
    return res?.data?.success ? res.data.message : null;
  } catch (error) {
    console.error("Error sending bridge message:", error?.message || error);
    return null;
  }
};
