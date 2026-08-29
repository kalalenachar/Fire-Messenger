const Chat = require("../models/Chat");
const User = require("../models/User");
const UserFolder = require("../models/UserFolder");
const { fireBotUser } = require("../config/db");

// @desc    Fetch all chats for a user
// @route   GET /api/chats/:userId
const getUserChats = async (req, res) => {
  try {
    const { userId } = req.params;
    const savedId = `chat_saved_${userId}`;
    const chats = await Chat.find({
      $or: [{ "users._id": userId }, { _id: savedId }],
    })
      .sort({ updatedAt: -1 })
      .lean();

    const userIds = new Set();
    chats.forEach((c) => (c.users || []).forEach((u) => userIds.add(u._id)));
    const users = await User.find({ _id: { $in: Array.from(userIds) } }).select("-password").lean();
    const userMap = new Map(users.map((u) => [u._id, u]));
    userMap.set(fireBotUser._id, fireBotUser);

    const hydrated = chats.map((c) => ({
      ...c,
      isSavedMessages: c.isSavedMessages || c._id === savedId || c._id?.startsWith("chat_saved_"),
      users: (c.users || []).map((u) => {
        const full = userMap.get(u._id);
        return full ? { ...full, ...u } : u;
      }),
    }));

    res.json({ success: true, chats: hydrated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Save or Create Chat (Direct or Group)
// @route   POST /api/chats
const saveOrCreateChat = async (req, res) => {
  try {
    if (req.body.isGroupChat) {
      const { chatName, users, groupAdmin } = req.body;
      const newChat = await Chat.create({
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
      });
      return res.json({ success: true, chat: newChat.toObject() });
    }

    const chatData = req.body.chat || req.body;
    const saved = await Chat.findByIdAndUpdate(chatData._id, chatData, { upsert: true, returnDocument: "after" }).lean();
    res.json({ success: true, chat: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get custom folders for user
// @route   GET /api/user/folders/:userId
const getUserFolders = async (req, res) => {
  try {
    const { userId } = req.params;
    const doc = await UserFolder.findById(userId).lean();
    res.json({ success: true, folders: doc?.folders || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Save custom folders for user
// @route   PUT /api/user/folders
const saveUserFolders = async (req, res, io) => {
  try {
    const { userId, folders } = req.body;
    const doc = await UserFolder.findByIdAndUpdate(
      userId,
      { _id: userId, folders },
      { upsert: true, returnDocument: "after" }
    ).lean();

    if (io) {
      io.emit("folders updated", { userId, folders: doc.folders });
    }
    res.json({ success: true, folders: doc.folders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getUserChats,
  saveOrCreateChat,
  getUserFolders,
  saveUserFolders,
};
