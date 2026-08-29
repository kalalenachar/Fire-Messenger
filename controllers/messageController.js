const Message = require("../models/Message");
const Chat = require("../models/Chat");

// @desc    Get all messages for a chat
// @route   GET /api/messages/:chatId
const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const messages = await Message.find({ chat: chatId }).sort({ createdAt: 1 }).lean();
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Send/Save a message
// @route   POST /api/messages
const addMessage = async (req, res) => {
  try {
    const message = req.body;
    const savedMsg = await saveMessageDocument(message);
    res.json({ success: true, message: savedMsg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Helper for both REST & Socket.IO
const saveMessageDocument = async (message) => {
  const chatId = message.chatObj?._id || (typeof message.chat === "object" ? message.chat?._id : message.chat);
  if (!chatId) return message;

  const msgId = message._id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const msgToSave = {
    ...message,
    _id: msgId,
    chat: chatId,
  };

  const savedMsg = await Message.findByIdAndUpdate(msgId, msgToSave, { upsert: true, returnDocument: "after" }).lean();

  const displayContent =
    savedMsg.type === "voice"
      ? "🎤 Voice Note"
      : savedMsg.type === "video"
      ? "🎥 Video"
      : savedMsg.type === "image"
      ? "📷 Photo"
      : savedMsg.type === "file"
      ? `📄 ${savedMsg.fileName || savedMsg.content || "File"}`
      : savedMsg.content;

  await Chat.findByIdAndUpdate(chatId, {
    latestMessage: {
      content: displayContent,
      sender: savedMsg.sender,
      createdAt: savedMsg.createdAt,
    },
    updatedAt: new Date(),
  });

  return savedMsg;
};

// @desc    Toggle emoji reaction
// @route   PUT /api/messages/reaction
const toggleReaction = async (req, res) => {
  try {
    const { chatId, messageId, emoji } = req.body;
    const updatedMsgs = await toggleReactionDocument({ chatId, messageId, emoji });
    res.json({ success: true, messages: updatedMsgs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const toggleReactionDocument = async ({ chatId, messageId, emoji }) => {
  const msg = await Message.findById(messageId);
  if (!msg) return [];

  const currentReactions = { ...(msg.reactions || {}) };
  if (currentReactions[emoji]) {
    delete currentReactions[emoji];
  } else {
    currentReactions[emoji] = 1;
  }

  msg.reactions = currentReactions;
  msg.markModified("reactions");
  await msg.save();

  return await Message.find({ chat: chatId }).sort({ createdAt: 1 }).lean();
};

// @desc    Vote in poll
// @route   PUT /api/messages/poll-vote
const togglePollVote = async (req, res, io) => {
  try {
    const updatedMsg = await togglePollVoteDocument(req.body);
    if (updatedMsg && req.body.chatId && io) {
      io.in(req.body.chatId).emit("poll_voted", { chatId: req.body.chatId, message: updatedMsg });
    }
    res.json({ success: true, message: updatedMsg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const togglePollVoteDocument = async ({ chatId, messageId, optionId, user }) => {
  const msg = await Message.findById(messageId);
  if (!msg || msg.type !== "poll" || !msg.pollData) return null;

  const poll = { ...msg.pollData };
  const settings = poll.settings || {};
  const userId = user._id || user;
  const userName = user.name || "User";
  const userPic = user.pic || "";

  if (settings.expiresAt && new Date(settings.expiresAt) < new Date()) {
    return null;
  }

  const hasUserVotedInPoll = poll.options.some((opt) =>
    (opt.voters || []).some((v) => (typeof v === "object" ? v.userId : v) === userId)
  );

  if ((settings.allowRevoting === false || settings.revotingMode === "locked") && hasUserVotedInPoll) {
    return null;
  }

  const allowMultiple = settings.allowMultiple ?? poll.allowMultiple ?? false;

  const options = poll.options.map((opt) => {
    let voters = opt.voters || [];
    const isVoted = voters.some((v) => (typeof v === "object" ? v.userId : v) === userId);

    if (opt.id === optionId) {
      if (isVoted) {
        voters = voters.filter((v) => (typeof v === "object" ? v.userId : v) !== userId);
      } else {
        voters = [...voters, { userId, name: userName, pic: userPic, votedAt: new Date().toISOString() }];
      }
    } else if (!allowMultiple && isVoted) {
      voters = voters.filter((v) => (typeof v === "object" ? v.userId : v) !== userId);
    }
    return { ...opt, voters };
  });

  poll.options = options;
  msg.pollData = poll;
  msg.markModified("pollData");
  await msg.save();

  return msg.toObject();
};

// @desc    Add option to poll
// @route   PUT /api/messages/poll-add-option
const addPollOption = async (req, res, io) => {
  try {
    const updatedMsg = await addPollOptionDocument(req.body);
    if (updatedMsg && req.body.chatId && io) {
      io.in(req.body.chatId).emit("poll_option_added", { chatId: req.body.chatId, message: updatedMsg });
    }
    res.json({ success: true, message: updatedMsg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const addPollOptionDocument = async ({ chatId, messageId, optionText, user }) => {
  const msg = await Message.findById(messageId);
  if (!msg || msg.type !== "poll" || !msg.pollData || !optionText?.trim()) return null;

  const poll = { ...msg.pollData };
  const newOption = {
    id: `opt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    text: optionText.trim(),
    voters: [],
    addedBy: user?.name || "Participant",
  };

  poll.options.push(newOption);
  msg.pollData = poll;
  msg.markModified("pollData");
  await msg.save();

  return msg.toObject();
};

// @desc    Update live location
// @route   PUT /api/messages/live-location
const updateLiveLocation = async (req, res, io) => {
  try {
    const updatedMsg = await updateLiveLocationDocument(req.body);
    if (updatedMsg && req.body.chatId && io) {
      io.in(req.body.chatId).emit("live_location_updated", { chatId: req.body.chatId, message: updatedMsg });
    }
    res.json({ success: true, message: updatedMsg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateLiveLocationDocument = async ({ chatId, messageId, lat, lng, accuracy }) => {
  const msg = await Message.findById(messageId);
  if (!msg || msg.type !== "live_location" || !msg.locationData) return null;

  const loc = {
    ...msg.locationData,
    lat,
    lng,
    accuracy: accuracy || msg.locationData.accuracy,
    lastUpdated: new Date().toISOString(),
    mapUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`,
  };

  msg.locationData = loc;
  msg.markModified("locationData");
  await msg.save();

  return msg.toObject();
};

// @desc    Stop live location
// @route   PUT /api/messages/stop-live-location
const stopLiveLocation = async (req, res, io) => {
  try {
    const updatedMsg = await stopLiveLocationDocument(req.body);
    if (updatedMsg && req.body.chatId && io) {
      io.in(req.body.chatId).emit("live_location_stopped", { chatId: req.body.chatId, message: updatedMsg });
    }
    res.json({ success: true, message: updatedMsg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const stopLiveLocationDocument = async ({ chatId, messageId }) => {
  const msg = await Message.findById(messageId);
  if (!msg || !msg.locationData) return null;

  msg.locationData.isLive = false;
  msg.locationData.stoppedAt = new Date().toISOString();
  msg.markModified("locationData");
  await msg.save();

  return msg.toObject();
};

// @desc    Delete a message
// @route   DELETE /api/messages/:messageId or POST /api/messages/delete
const deleteMessage = async (req, res, io) => {
  try {
    const messageId = req.params.messageId || req.body.messageId;
    const { chatId, deleteForEveryone = true, userId } = req.body;

    const result = await deleteMessageDocument({ chatId, messageId, deleteForEveryone, userId });

    if (io && chatId) {
      io.in(chatId).emit("message deleted", { chatId, messageId, deleteForEveryone, userId });
    }

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteMessageDocument = async ({ chatId, messageId, deleteForEveryone = true, userId }) => {
  if (!messageId) return { messageId };

  const isSavedChat = chatId && (chatId.startsWith("chat_saved_") || chatId.includes("saved"));

  if (isSavedChat) {
    await Message.findByIdAndDelete(messageId);
  } else if (deleteForEveryone) {
    const msg = await Message.findById(messageId);
    if (msg) {
      msg.isDeleted = true;
      msg.content = "This message was deleted";
      msg.fileUrl = null;
      msg.audioUrl = null;
      msg.mediaUrl = null;
      msg.pollData = null;
      msg.locationData = null;
      msg.reactions = {};
      msg.deletedAt = new Date();
      msg.markModified("reactions");
      await msg.save();
    }
  } else if (userId) {
    await Message.findByIdAndUpdate(messageId, { $addToSet: { deletedFor: userId } });
  }

  // Update latestMessage in Chat if needed
  if (chatId) {
    const lastMsg = await Message.findOne({
      chat: chatId,
      isDeleted: { $ne: true },
      deletedFor: { $nin: userId ? [userId] : [] },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (lastMsg) {
      const displayContent =
        lastMsg.type === "voice"
          ? "🎤 Voice Note"
          : lastMsg.type === "video"
          ? "🎥 Video"
          : lastMsg.type === "image"
          ? "📷 Photo"
          : lastMsg.type === "file"
          ? `📄 ${lastMsg.fileName || lastMsg.content || "File"}`
          : lastMsg.content;

      await Chat.findByIdAndUpdate(chatId, {
        latestMessage: {
          content: displayContent,
          sender: lastMsg.sender,
          createdAt: lastMsg.createdAt,
        },
        updatedAt: new Date(),
      });
    } else {
      await Chat.findByIdAndUpdate(chatId, {
        latestMessage: {
          content: "No messages yet",
          createdAt: new Date().toISOString(),
        },
      });
    }
  }

  return { messageId, chatId, deleteForEveryone };
};

module.exports = {
  getChatMessages,
  addMessage,
  saveMessageDocument,
  deleteMessage,
  deleteMessageDocument,
  toggleReaction,
  toggleReactionDocument,
  togglePollVote,
  togglePollVoteDocument,
  addPollOption,
  addPollOptionDocument,
  updateLiveLocation,
  updateLiveLocationDocument,
  stopLiveLocation,
  stopLiveLocationDocument,
};
