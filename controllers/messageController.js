const Message = require("../models/Message");
const Chat = require("../models/Chat");

// @desc    Get all messages for a chat
// @route   GET /api/messages/:chatId
const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    let messages = await Message.find({ chat: chatId }).sort({ createdAt: 1 }).lean();
    if ((!messages || messages.length === 0) && (chatId.startsWith("wa_") || chatId.startsWith("tg_"))) {
      const BridgeService = require("../services/bridgeService");
      const bridgeMsgs = BridgeService.getBridgeChatMessages(chatId);
      if (bridgeMsgs && bridgeMsgs.length > 0) {
        messages = bridgeMsgs;
      }
    }
    res.json({ success: true, messages: messages || [] });
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
      : savedMsg.type === "poll"
      ? `📊 Poll: ${savedMsg.pollData?.question || "Question"}`
      : savedMsg.type === "live_location"
      ? "📍 Live Location"
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

// @desc    Edit a message
// @route   PUT /api/messages/edit
const editMessage = async (req, res, io) => {
  try {
    const { messageId, chatId, newContent } = req.body;
    const updatedMsg = await editMessageDocument({ messageId, chatId, newContent });
    if (io && chatId) {
      io.in(chatId).emit("message edited", { chatId, message: updatedMsg });
    }
    res.json({ success: true, message: updatedMsg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const editMessageDocument = async ({ messageId, chatId, newContent }) => {
  const msg = await Message.findById(messageId);
  if (!msg) return null;

  msg.content = newContent;
  msg.isEdited = true;
  msg.editedAt = new Date();
  await msg.save();

  // If this was the latest message in the chat, update chat preview as well
  if (chatId) {
    const chat = await Chat.findById(chatId);
    if (chat && chat.latestMessage && chat.latestMessage._id === messageId) {
      chat.latestMessage.content = newContent;
      await chat.save();
    }
  }

  return msg.toObject();
};

// @desc    Toggle Star/Bookmark on a message
// @route   PUT /api/messages/star
const toggleStarMessage = async (req, res, io) => {
  try {
    const { messageId, userId, chatId } = req.body;
    const updatedMsg = await toggleStarMessageDocument({ messageId, userId, chatId });
    if (io && chatId) {
      io.in(chatId).emit("message starred", { chatId, message: updatedMsg, userId });
    }
    res.json({ success: true, message: updatedMsg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const toggleStarMessageDocument = async ({ messageId, userId }) => {
  const msg = await Message.findById(messageId);
  if (!msg) return null;

  let starList = Array.isArray(msg.isStarredBy) ? [...msg.isStarredBy] : [];
  if (starList.includes(userId)) {
    starList = starList.filter((id) => id !== userId);
  } else {
    starList.push(userId);
  }

  msg.isStarredBy = starList;
  msg.markModified("isStarredBy");
  await msg.save();
  return msg.toObject();
};

// @desc    Pin a message in chat
// @route   PUT /api/messages/pin
const pinChatMessage = async (req, res, io) => {
  try {
    const { chatId, message } = req.body;
    const chat = await pinChatMessageDocument({ chatId, message });
    if (io && chatId) {
      io.in(chatId).emit("message pinned", { chatId, pinnedMessage: message });
    }
    res.json({ success: true, chat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const pinChatMessageDocument = async ({ chatId, message }) => {
  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    { pinnedMessage: message },
    { returnDocument: "after" }
  ).lean();
  return updatedChat;
};

// @desc    Unpin a message from chat
// @route   PUT /api/messages/unpin
const unpinChatMessage = async (req, res, io) => {
  try {
    const { chatId } = req.body;
    const chat = await unpinChatMessageDocument({ chatId });
    if (io && chatId) {
      io.in(chatId).emit("message unpinned", { chatId });
    }
    res.json({ success: true, chat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const unpinChatMessageDocument = async ({ chatId }) => {
  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    { pinnedMessage: null },
    { returnDocument: "after" }
  ).lean();
  return updatedChat;
};

// @desc    Forward message to multiple chats
// @route   POST /api/messages/forward
const forwardMessages = async (req, res, io) => {
  try {
    const { message, targetChatIds, senderUser } = req.body;
    const forwardedResults = [];

    for (const targetChatId of targetChatIds) {
      const forwardedMsg = {
        ...message,
        _id: `msg_fwd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        chat: targetChatId,
        sender: senderUser || message.sender,
        isForwarded: true,
        forwardedFrom: message.sender?.name || "Someone",
        createdAt: new Date().toISOString(),
      };
      const saved = await saveMessageDocument(forwardedMsg);
      forwardedResults.push(saved);

      if (io) {
        io.in(targetChatId).emit("message received", saved);
      }
    }

    res.json({ success: true, messages: forwardedResults });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Set Disappearing Messages Timer for Chat
// @route   PUT /api/chats/disappearing-timer
const setChatDisappearingTimer = async (req, res, io) => {
  try {
    const { chatId, seconds } = req.body;
    const updated = await Chat.findByIdAndUpdate(
      chatId,
      { disappearingTimer: seconds || 0 },
      { returnDocument: "after" }
    ).lean();

    if (io && chatId) {
      io.in(chatId).emit("disappearing timer updated", { chatId, timerSeconds: seconds || 0 });
    }

    res.json({ success: true, chat: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
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
  editMessage,
  editMessageDocument,
  toggleStarMessage,
  toggleStarMessageDocument,
  pinChatMessage,
  pinChatMessageDocument,
  unpinChatMessage,
  unpinChatMessageDocument,
  forwardMessages,
  setChatDisappearingTimer,
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
