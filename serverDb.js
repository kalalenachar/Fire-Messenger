const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "db.json");

const defaultUsersList = [
  {
    _id: "user_fire_01",
    name: "Alex Rivers",
    email: "alex@firemessenger.io",
    password: "123",
    isAdmin: true,
    pic: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    status: "Available | 🔥 Burning with Passion",
    token: "token_alex_12345",
    isVerified: true,
    verificationStatus: "verified",
    verificationType: "individual",
    verificationDetails: {
      aadhaarMasked: "XXXX-XXXX-4812",
      verifiedAt: "2026-08-20T10:00:00Z",
      matchScore: 98.4,
    },
  },
  {
    _id: "user_sarah",
    name: "Sarah Jenkins",
    email: "sarah@fire.io",
    password: "123",
    pic: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    status: "Designing the future ✨ | Online",
    token: "token_sarah_12345",
    isVerified: false,
    verificationStatus: "none",
  },
  {
    _id: "user_marcus",
    name: "Marcus Vance",
    email: "marcus@fire.io",
    password: "123",
    pic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    status: "Coding late night 💻",
    token: "token_marcus_12345",
    isVerified: false,
    verificationStatus: "none",
  },
  {
    _id: "user_elena",
    name: "Elena Rostova",
    email: "elena@fire.io",
    password: "123",
    pic: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    status: "Building real-time apps 🚀",
    token: "token_elena_12345",
    isVerified: false,
    verificationStatus: "none",
  },
];

const fireBotUser = {
  _id: "bot_fire_ai",
  name: "Agni Bot 🔥",
  email: "bot@agnimessenger.io",
  pic: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
  status: "Official Automated Assistant | Online 24/7",
  isVerified: true,
  verificationStatus: "verified",
  verificationType: "business",
  verificationDetails: {
    gstinMasked: "27AAACB2418Q1Z1",
    businessName: "Agni Messenger Inc.",
    verifiedAt: "2026-08-01T12:00:00Z",
  },
};

const initialChats = [
  {
    _id: "chat_fire_bot",
    chatName: "Agni Bot 🔥",
    isGroupChat: false,
    users: [defaultUsersList[0], fireBotUser],
    latestMessage: {
      content: "Welcome to Agni Messenger! Send a message or command like /help",
      sender: fireBotUser,
      createdAt: new Date(Date.now() - 60000).toISOString(),
    },
    unread: 1,
    pinned: true,
    category: "Bots",
  },
  {
    _id: "chat_fire_squad",
    chatName: "Agni Squad 🔥 Core Team",
    isGroupChat: true,
    groupAdmin: defaultUsersList[0],
    users: [defaultUsersList[0], defaultUsersList[1], defaultUsersList[2]],
    latestMessage: {
      content: "Welcome to the team! Real-time messaging is live 🔥",
      sender: defaultUsersList[1],
      createdAt: new Date(Date.now() - 300000).toISOString(),
    },
    unread: 2,
    pinned: true,
    category: "Groups",
  },
  {
    _id: `chat_sarah_${defaultUsersList[0]._id}`,
    chatName: "Sarah Jenkins",
    isGroupChat: false,
    users: [defaultUsersList[0], defaultUsersList[1]],
    latestMessage: {
      content: "Hey! Ready to test real-time chat?",
      sender: defaultUsersList[1],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    unread: 0,
    pinned: false,
    category: "Personal",
  },
];

const initialMessages = {
  chat_fire_bot: [
    {
      _id: "msg_bot_1",
      sender: fireBotUser,
      content: "Greetings! Welcome to **Agni Messenger 🔥**.",
      chat: "chat_fire_bot",
      createdAt: new Date(Date.now() - 360000).toISOString(),
      reactions: { "🔥": 2 },
    },
    {
      _id: "msg_bot_2",
      sender: fireBotUser,
      content: "I am your automated AI assistant. Try commands like `/help`, `/fire`, `/joke`, `/weather`, or `/time`!",
      chat: "chat_fire_bot",
      createdAt: new Date(Date.now() - 60000).toISOString(),
      reactions: { "👍": 1 },
    },
  ],
  chat_fire_squad: [
    {
      _id: "msg_squad_1",
      sender: defaultUsersList[2],
      content: "Hey team! Agni Messenger persistent server DB is officially online!",
      chat: "chat_fire_squad",
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      reactions: { "🚀": 3 },
    },
    {
      _id: "msg_squad_2",
      sender: defaultUsersList[1],
      content: "Welcome to the team! Real-time messaging is live 🔥",
      chat: "chat_fire_squad",
      createdAt: new Date(Date.now() - 300000).toISOString(),
      reactions: { "❤️": 2, "🔥": 4 },
    },
  ],
};

function readDb() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: defaultUsersList,
      chats: initialChats,
      messages: initialMessages,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading db.json, reinitializing...", err);
    const initialData = {
      users: defaultUsersList,
      chats: initialChats,
      messages: initialMessages,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// User methods
function loginUser(email, password) {
  const db = readDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) throw new Error("No account found with this email address.");
  if (user.password !== password) throw new Error("Invalid password. Please check your credentials.");
  const { password: _, ...cleanUser } = user;
  return cleanUser;
}

function registerUser({ name, email, password, pic, status }) {
  const db = readDb();
  const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (existing) throw new Error("An account with this email address already exists.");

  const newUser = {
    _id: `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: password,
    pic: pic || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    status: status || "Available | 🔥 Agni Messenger",
    token: `token_${Date.now()}`,
  };

  db.users.push(newUser);

  // Auto create bot chat and squad chat for new user
  const userBotChat = {
    _id: `chat_bot_${newUser._id}`,
    chatName: "Agni Bot 🔥",
    isGroupChat: false,
    users: [newUser, fireBotUser],
    latestMessage: {
      content: "Welcome to Agni Messenger! Send a message or command like /help",
      sender: fireBotUser,
      createdAt: new Date().toISOString(),
    },
    unread: 1,
    pinned: true,
    category: "Bots",
  };

  db.chats.unshift(userBotChat);
  db.messages[userBotChat._id] = [
    {
      _id: `msg_bot_${Date.now()}`,
      sender: fireBotUser,
      content: `Greetings ${newUser.name}! Welcome to **Agni Messenger 🔥**. I am your automated AI assistant.`,
      chat: userBotChat._id,
      createdAt: new Date().toISOString(),
      reactions: { "🔥": 1 },
    },
  ];

  writeDb(db);

  const { password: _, ...cleanUser } = newUser;
  return cleanUser;
}

function updateUserProfile(userId, updates) {
  const db = readDb();
  const index = db.users.findIndex((u) => u._id === userId);
  if (index !== -1) {
    db.users[index] = { ...db.users[index], ...updates };
    // Also update users array in existing chats
    db.chats = db.chats.map((c) => ({
      ...c,
      users: c.users.map((u) => (u._id === userId ? { ...u, ...updates } : u)),
    }));
    writeDb(db);
    const { password: _, ...cleanUser } = db.users[index];
    return cleanUser;
  }
  return null;
}

function searchUsers(query, currentUserId) {
  const db = readDb();
  const q = query.toLowerCase().trim();
  return db.users
    .filter((u) => u._id !== currentUserId && (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)))
    .map(({ password, ...clean }) => clean);
}

// Chat methods
function getUserChats(userId) {
  const db = readDb();
  const userMap = new Map(db.users.map((u) => [u._id, u]));
  if (fireBotUser) userMap.set(fireBotUser._id, fireBotUser);

  return db.chats
    .filter((c) => c.users && c.users.some((u) => u._id === userId))
    .map((c) => ({
      ...c,
      users: c.users.map((u) => {
        const fullUser = userMap.get(u._id);
        if (fullUser) {
          const { password, ...clean } = fullUser;
          return { ...clean, ...u, pic: fullUser.pic || u.pic, name: fullUser.name || u.name, status: fullUser.status || u.status };
        }
        return u;
      }),
      latestMessage: c.latestMessage?.sender?._id && userMap.get(c.latestMessage.sender._id)
        ? {
            ...c.latestMessage,
            sender: (() => {
              const full = userMap.get(c.latestMessage.sender._id);
              const { password, ...clean } = full;
              return { ...clean, ...c.latestMessage.sender, pic: full.pic || c.latestMessage.sender.pic };
            })(),
          }
        : c.latestMessage,
    }));
}

function saveChat(chat) {
  const db = readDb();
  const existingIndex = db.chats.findIndex((c) => c._id === chat._id);
  if (existingIndex !== -1) {
    db.chats[existingIndex] = chat;
  } else {
    db.chats.unshift(chat);
  }
  writeDb(db);
  return chat;
}

function createGroupChat({ chatName, users, groupAdmin }) {
  const db = readDb();
  const newChat = {
    _id: `group_${Date.now()}`,
    chatName,
    isGroupChat: true,
    groupAdmin,
    users,
    latestMessage: {
      content: `Group "${chatName}" created`,
      sender: groupAdmin,
      createdAt: new Date().toISOString(),
    },
    unread: 0,
    pinned: false,
    category: "Groups",
  };

  db.chats.unshift(newChat);
  writeDb(db);
  return newChat;
}

// Message methods
function getChatMessages(chatId) {
  const db = readDb();
  return db.messages[chatId] || [];
}

function addMessage(message) {
  const db = readDb();
  const chatId = message.chatObj?._id || (typeof message.chat === "object" ? message.chat?._id : message.chat);
  if (!chatId) return message;

  if (!db.messages[chatId]) {
    db.messages[chatId] = [];
  }

  const existingIndex = db.messages[chatId].findIndex((m) => m._id === message._id);
  if (existingIndex === -1) {
    db.messages[chatId].push(message);
  } else {
    db.messages[chatId][existingIndex] = message;
  }

  // Update latest message in chat
  const chatIndex = db.chats.findIndex((c) => c._id === chatId);
  if (chatIndex !== -1) {
    const displayContent =
      message.type === "voice"
        ? "🎤 Voice Note"
        : message.type === "video"
        ? "🎥 Video"
        : message.type === "image"
        ? "📷 Photo"
        : message.type === "file"
        ? `📄 ${message.fileName || message.content || "File"}`
        : message.content;

    db.chats[chatIndex].latestMessage = {
      content: displayContent,
      sender: message.sender,
      createdAt: message.createdAt,
    };
  }

  writeDb(db);
  return message;
}

function toggleMessageReaction({ chatId, messageId, emoji }) {
  const db = readDb();
  const chatMsgs = db.messages[chatId] || [];
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

  db.messages[chatId] = updatedMsgs;
  writeDb(db);
  return updatedMsgs;
}

// --- STATUS & AUDIENCE PROFILE METHODS ---

function getAudienceProfiles(userId) {
  const db = readDb();
  const profiles = (db.audienceProfiles || []).filter((p) => p.userId === userId);
  if (profiles.length === 0) {
    // Provide default profiles for best initial UX
    const defaultProfiles = [
      { _id: `prof_all_${userId}`, userId, name: "All Contacts", mode: "whitelist", isDefault: true, memberIds: [] },
      { _id: `prof_school_${userId}`, userId, name: "School Friends", mode: "whitelist", isDefault: false, memberIds: ["user_sarah"] },
      { _id: `prof_no_office_${userId}`, userId, name: "No Office People", mode: "blacklist", isDefault: false, memberIds: ["user_marcus"] },
    ];
    db.audienceProfiles = [...(db.audienceProfiles || []), ...defaultProfiles];
    writeDb(db);
    return defaultProfiles;
  }
  return profiles;
}

function saveAudienceProfile(userId, profileData) {
  const db = readDb();
  if (!db.audienceProfiles) db.audienceProfiles = [];

  let profile;
  if (profileData._id) {
    const idx = db.audienceProfiles.findIndex((p) => p._id === profileData._id && p.userId === userId);
    if (idx !== -1) {
      db.audienceProfiles[idx] = { ...db.audienceProfiles[idx], ...profileData };
      profile = db.audienceProfiles[idx];
    }
  }

  if (!profile) {
    profile = {
      _id: `prof_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId,
      name: profileData.name || "Custom Group",
      mode: profileData.mode || "whitelist", // 'whitelist' (include) | 'blacklist' (exclude / hide from)
      memberIds: profileData.memberIds || [],
      isDefault: false,
    };
    db.audienceProfiles.push(profile);
  }

  writeDb(db);
  return profile;
}

function deleteAudienceProfile(userId, profileId) {
  const db = readDb();
  if (!db.audienceProfiles) db.audienceProfiles = [];
  db.audienceProfiles = db.audienceProfiles.filter((p) => !(p._id === profileId && p.userId === userId));
  writeDb(db);
  return true;
}

function createStatusPost(userId, postData) {
  const db = readDb();
  if (!db.statusPosts) db.statusPosts = [];

  const author = db.users.find((u) => u._id === userId);
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours expiry

  const newPost = {
    _id: `status_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    userId,
    author: author ? { _id: author._id, name: author.name, pic: author.pic } : { _id: userId, name: "User", pic: "" },
    type: postData.type || "text", // 'text' | 'image' | 'video'
    content: postData.content || "",
    caption: postData.caption || "",
    bgColor: postData.bgColor || "linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)",
    fontStyle: postData.fontStyle || "sans-serif",
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    audienceProfileIds: postData.audienceProfileIds || ["ALL"],
    viewers: [],
  };

  db.statusPosts.push(newPost);
  writeDb(db);
  return newPost;
}

function getActiveStatusFeed(userId) {
  const db = readDb();
  const now = new Date().getTime();

  // Filter out expired statuses
  const activePosts = (db.statusPosts || []).filter((post) => {
    const expTime = new Date(post.expiresAt).getTime();
    return expTime > now;
  });

  // Filter visibility based on audience profiles
  const userProfilesObjMap = {};
  (db.audienceProfiles || []).forEach((p) => {
    userProfilesObjMap[p._id] = p;
  });

  const visiblePosts = activePosts.filter((post) => {
    if (post.userId === userId) return true;
    if (!post.audienceProfileIds || post.audienceProfileIds.includes("ALL")) return true;

    // Check if viewer's userId passes selected audience profile rules (whitelist vs blacklist)
    return post.audienceProfileIds.some((profId) => {
      const prof = userProfilesObjMap[profId];
      if (!prof) return true;
      const members = prof.memberIds || [];
      if (prof.mode === "blacklist") {
        // Exclude mode (Hide from): Visible to everyone EXCEPT selected members
        return !members.includes(userId);
      } else {
        // Whitelist mode (Include only): Visible ONLY to selected members
        return members.includes(userId);
      }
    });
  });

  // Group status posts by User
  const feedByUserMap = {};
  visiblePosts.forEach((post) => {
    const uid = post.userId;
    if (!feedByUserMap[uid]) {
      feedByUserMap[uid] = {
        user: post.author,
        isOwn: uid === userId,
        posts: [],
        hasUnviewed: false,
        latestUpdatedAt: post.createdAt,
      };
    }
    feedByUserMap[uid].posts.push(post);

    const isViewedByMe = post.viewers.some((v) => v.userId === userId);
    if (!isViewedByMe && uid !== userId) {
      feedByUserMap[uid].hasUnviewed = true;
    }

    if (new Date(post.createdAt).getTime() > new Date(feedByUserMap[uid].latestUpdatedAt).getTime()) {
      feedByUserMap[uid].latestUpdatedAt = post.createdAt;
    }
  });

  // Sort: Own user first, then by latest update time
  const feedList = Object.values(feedByUserMap).sort((a, b) => {
    if (a.isOwn) return -1;
    if (b.isOwn) return 1;
    return new Date(b.latestUpdatedAt) - new Date(a.latestUpdatedAt);
  });

  return feedList;
}

function recordStatusView(statusId, viewerUser) {
  const db = readDb();
  if (!db.statusPosts) return null;

  const postIndex = db.statusPosts.findIndex((p) => p._id === statusId);
  if (postIndex === -1) return null;

  const post = db.statusPosts[postIndex];
  const alreadyViewed = (post.viewers || []).some((v) => v.userId === viewerUser._id);

  if (!alreadyViewed) {
    const viewerObj = {
      userId: viewerUser._id,
      name: viewerUser.name,
      pic: viewerUser.pic,
      viewedAt: new Date().toISOString(),
    };
    db.statusPosts[postIndex].viewers = [...(db.statusPosts[postIndex].viewers || []), viewerObj];
    writeDb(db);
  }

  return db.statusPosts[postIndex];
}

function deleteStatusPost(userId, statusId) {
  const db = readDb();
  if (!db.statusPosts) return false;

  db.statusPosts = db.statusPosts.filter((p) => !(p._id === statusId && p.userId === userId));
  writeDb(db);
  return true;
}

function togglePollVote({ chatId, messageId, optionId, user }) {
  const db = readDb();
  if (!db.messages || !db.messages[chatId]) return null;

  const msgs = db.messages[chatId];
  const msgIndex = msgs.findIndex((m) => m._id === messageId);
  if (msgIndex === -1) return null;

  const msg = msgs[msgIndex];
  if (msg.type !== "poll" || !msg.pollData) return null;

  const poll = { ...msg.pollData };
  const settings = poll.settings || {};
  const userId = user._id || user;
  const userPic = user.pic || "";
  const userName = user.name || "User";

  // Expiry check
  if (settings.expiresAt && new Date(settings.expiresAt) < new Date()) {
    return null;
  }

  // Revoting check
  const hasUserVotedInPoll = poll.options.some((opt) =>
    (opt.voters || []).some((v) => (typeof v === "object" ? v.userId : v) === userId)
  );

  if ((settings.allowRevoting === false || settings.revotingMode === "locked") && hasUserVotedInPoll) {
    return null;
  }

  if (settings.revotingMode === "5min" && hasUserVotedInPoll) {
    let earliestVoteTime = null;
    poll.options.forEach((opt) => {
      (opt.voters || []).forEach((v) => {
        if ((typeof v === "object" ? v.userId : v) === userId && v.votedAt) {
          const t = new Date(v.votedAt).getTime();
          if (!earliestVoteTime || t < earliestVoteTime) earliestVoteTime = t;
        }
      });
    });
    if (earliestVoteTime && Date.now() - earliestVoteTime > 5 * 60 * 1000) {
      return null; // 5-minute revoting window passed
    }
  }

  const allowMultiple = settings.allowMultiple ?? poll.allowMultiple ?? false;

  // Max choices limit check
  if (allowMultiple && settings.maxChoices && settings.maxChoices !== "unlimited") {
    const maxAllowed = parseInt(settings.maxChoices, 10);
    const currentlyVotedCount = poll.options.filter((opt) =>
      (opt.voters || []).some((v) => (typeof v === "object" ? v.userId : v) === userId)
    ).length;

    const targetOpt = poll.options.find((o) => o.id === optionId);
    const isTargetVoted = (targetOpt?.voters || []).some((v) => (typeof v === "object" ? v.userId : v) === userId);

    if (!isTargetVoted && currentlyVotedCount >= maxAllowed) {
      return null;
    }
  }

  const options = poll.options.map((opt) => {
    let voters = opt.voters || [];
    const isVotedOnThisOption = voters.some((v) => (typeof v === "object" ? v.userId : v) === userId);

    if (opt.id === optionId) {
      if (isVotedOnThisOption) {
        voters = voters.filter((v) => (typeof v === "object" ? v.userId : v) !== userId);
      } else {
        voters = [...voters, { userId, name: userName, pic: userPic, votedAt: new Date().toISOString() }];
      }
    } else if (!allowMultiple && isVotedOnThisOption) {
      voters = voters.filter((v) => (typeof v === "object" ? v.userId : v) !== userId);
    }

    return { ...opt, voters };
  });

  poll.options = options;
  db.messages[chatId][msgIndex].pollData = poll;
  writeDb(db);
  return db.messages[chatId][msgIndex];
}

function addPollOption({ chatId, messageId, optionText, user }) {
  const db = readDb();
  if (!db.messages || !db.messages[chatId]) return null;

  const msgs = db.messages[chatId];
  const msgIndex = msgs.findIndex((m) => m._id === messageId);
  if (msgIndex === -1) return null;

  const msg = msgs[msgIndex];
  if (msg.type !== "poll" || !msg.pollData || !optionText?.trim()) return null;

  const poll = { ...msg.pollData };
  const settings = poll.settings || {};

  if (!settings.allowAddingOptions) return null;

  const newOption = {
    id: `opt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    text: optionText.trim(),
    voters: [],
    addedBy: user?.name || "Participant",
  };

  poll.options.push(newOption);
  db.messages[chatId][msgIndex].pollData = poll;
  writeDb(db);
  return db.messages[chatId][msgIndex];
}

function updateLiveLocation({ chatId, messageId, lat, lng, accuracy }) {
  const db = readDb();
  if (!db.messages || !db.messages[chatId]) return null;

  const msgs = db.messages[chatId];
  const msgIndex = msgs.findIndex((m) => m._id === messageId);
  if (msgIndex === -1) return null;

  const msg = msgs[msgIndex];
  if (msg.type !== "live_location" || !msg.locationData) return null;

  const loc = {
    ...msg.locationData,
    lat,
    lng,
    accuracy: accuracy || msg.locationData.accuracy,
    lastUpdated: new Date().toISOString(),
    mapUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`,
  };

  db.messages[chatId][msgIndex].locationData = loc;
  writeDb(db);
  return db.messages[chatId][msgIndex];
}

function stopLiveLocation({ chatId, messageId }) {
  const db = readDb();
  if (!db.messages || !db.messages[chatId]) return null;

  const msgs = db.messages[chatId];
  const msgIndex = msgs.findIndex((m) => m._id === messageId);
  if (msgIndex === -1) return null;

  if (db.messages[chatId][msgIndex].locationData) {
    db.messages[chatId][msgIndex].locationData.isLive = false;
    db.messages[chatId][msgIndex].locationData.stoppedAt = new Date().toISOString();
    writeDb(db);
  }
  return db.messages[chatId][msgIndex];
}

function getUserFolders(userId) {
  const db = readDb();
  if (!db.userFolders) db.userFolders = {};
  return db.userFolders[userId] || [];
}

function saveUserFolders(userId, folders) {
  const db = readDb();
  if (!db.userFolders) db.userFolders = {};
  db.userFolders[userId] = folders;
  writeDb(db);
  return db.userFolders[userId];
}

function saveReport(reportData) {
  const db = readDb();
  if (!db.reports) db.reports = [];
  const newReport = {
    _id: `report_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...reportData,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  db.reports.unshift(newReport);
  writeDb(db);
  return newReport;
}

function getReports() {
  const db = readDb();
  return db.reports || [];
}

function submitVerificationApplication(userId, payload) {
  const db = readDb();
  const index = db.users.findIndex((u) => u._id === userId);
  if (index === -1) throw new Error("User not found");

  const user = db.users[index];
  user.verificationStatus = "pending";
  user.isVerified = false;
  user.verificationType = payload.verificationType || "individual";
  user.verificationDetails = {
    ...payload,
    submittedAt: payload.submittedAt || new Date().toISOString(),
  };

  writeDb(db);
  return user;
}

function reviewVerificationApplication(userId, status, rejectionReason = null) {
  const db = readDb();
  const index = db.users.findIndex((u) => u._id === userId);
  if (index === -1) throw new Error("User not found");

  const user = db.users[index];
  user.verificationStatus = status; // 'verified' | 'rejected' | 'pending' | 'none'
  user.isVerified = status === "verified";
  if (status === "verified") {
    user.verificationDetails = {
      ...(user.verificationDetails || {}),
      verifiedAt: new Date().toISOString(),
    };
  } else if (status === "rejected") {
    user.verificationDetails = {
      ...(user.verificationDetails || {}),
      rejectionReason: rejectionReason || "Document or Live Face Match criteria not met.",
      rejectedAt: new Date().toISOString(),
    };
  }

  writeDb(db);
  return user;
}

function getAdminStats() {
  const db = readDb();
  const users = db.users || [];
  const chats = db.chats || [];
  const reports = db.reports || [];
  
  let totalMessages = 0;
  if (db.messages) {
    Object.values(db.messages).forEach((msgArray) => {
      if (Array.isArray(msgArray)) totalMessages += msgArray.length;
    });
  }

  const verifiedUsers = users.filter((u) => u.isVerified || u.verificationStatus === "verified").length;
  const pendingVerifications = users.filter((u) => u.verificationStatus === "pending").length;
  const bannedUsers = users.filter((u) => u.isBanned).length;
  const pendingReports = reports.filter((r) => r.status === "pending" || !r.status).length;

  return {
    totalUsers: users.length,
    verifiedUsers,
    pendingVerifications,
    bannedUsers,
    totalChats: chats.length,
    totalMessages,
    pendingReports,
    totalReports: reports.length,
  };
}

function getAllUsersAdmin() {
  const db = readDb();
  return (db.users || []).map((u) => {
    const { password, ...userWithoutPassword } = u;
    return userWithoutPassword;
  });
}

function updateUserRole(userId, isAdmin) {
  const db = readDb();
  const index = db.users.findIndex((u) => u._id === userId);
  if (index === -1) throw new Error("User not found");

  db.users[index].isAdmin = Boolean(isAdmin);
  writeDb(db);
  return db.users[index];
}

function toggleUserBan(userId, isBanned) {
  const db = readDb();
  const index = db.users.findIndex((u) => u._id === userId);
  if (index === -1) throw new Error("User not found");

  db.users[index].isBanned = Boolean(isBanned);
  writeDb(db);
  return db.users[index];
}

function deleteUserAccount(userId) {
  const db = readDb();
  const index = db.users.findIndex((u) => u._id === userId);
  if (index === -1) throw new Error("User not found");

  const deletedUser = db.users.splice(index, 1)[0];
  writeDb(db);
  return deletedUser;
}

function updateReportStatus(reportId, status, adminNotes = null) {
  const db = readDb();
  if (!db.reports) db.reports = [];
  const index = db.reports.findIndex((r) => r._id === reportId);
  if (index === -1) throw new Error("Report ticket not found");

  db.reports[index].status = status; // 'resolved' | 'dismissed' | 'pending'
  if (adminNotes) db.reports[index].adminNotes = adminNotes;
  db.reports[index].updatedAt = new Date().toISOString();

  writeDb(db);
  return db.reports[index];
}

function sendAdminBroadcast(content) {
  const db = readDb();
  if (!content) throw new Error("Broadcast message content is required");

  const broadcastMessage = {
    _id: `msg_broadcast_${Date.now()}`,
    sender: fireBotUser,
    content: `📢 **AGNI SYSTEM BROADCAST** 📢\n\n${content}`,
    chat: null,
    createdAt: new Date().toISOString(),
    reactions: { "📢": 1 },
    isBroadcast: true,
  };

  let count = 0;
  (db.chats || []).forEach((c) => {
    if (!db.messages[c._id]) db.messages[c._id] = [];
    const chatMsg = { ...broadcastMessage, chat: c._id };
    db.messages[c._id].push(chatMsg);
    c.latestMessage = chatMsg;
    count++;
  });

  writeDb(db);
  return { success: true, count, broadcastMessage };
}

module.exports = {
  readDb,
  loginUser,
  registerUser,
  updateUserProfile,
  searchUsers,
  getUserChats,
  saveChat,
  createGroupChat,
  getChatMessages,
  addMessage,
  toggleMessageReaction,
  fireBotUser,
  getAudienceProfiles,
  saveAudienceProfile,
  deleteAudienceProfile,
  createStatusPost,
  getActiveStatusFeed,
  recordStatusView,
  deleteStatusPost,
  togglePollVote,
  addPollOption,
  updateLiveLocation,
  stopLiveLocation,
  getUserFolders,
  saveUserFolders,
  saveReport,
  getReports,
  submitVerificationApplication,
  reviewVerificationApplication,
  getAdminStats,
  getAllUsersAdmin,
  updateUserRole,
  toggleUserBan,
  deleteUserAccount,
  updateReportStatus,
  sendAdminBroadcast,
};




