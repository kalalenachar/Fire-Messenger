const User = require("../models/User");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const { fireBotUser } = require("../config/db");

// @desc    Auth user & get token (supports email or username)
// @route   POST /api/user/login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanInput = (email || "").toLowerCase().trim();

    const user = await User.findOne({
      $or: [{ email: cleanInput }, { username: cleanInput }],
    });
    if (!user) {
      return res.status(400).json({ success: false, message: "No account found with this email or username." });
    }
    if (user.password !== password) {
      return res.status(400).json({ success: false, message: "Invalid password. Please check your credentials." });
    }
    if (user.isBanned) {
      return res.status(400).json({ success: false, message: "This account has been banned by the administrator." });
    }

    const clean = user.toObject();
    delete clean.password;
    res.json({ success: true, user: clean });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Check username availability
// @route   GET /api/user/check-username
const checkUsernameAvailability = async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ success: false, available: false, message: "Username is required." });
    }

    const clean = username.toLowerCase().trim();
    const regex = /^[a-z0-9_.]{3,20}$/;
    if (!regex.test(clean)) {
      return res.status(400).json({
        success: false,
        available: false,
        message: "Must be 3-20 characters: letters, numbers, dots & underscores allowed.",
      });
    }

    const existing = await User.findOne({ username: clean });
    if (existing) {
      return res.json({ success: true, available: false, message: "Username is already taken." });
    }

    return res.json({ success: true, available: true, message: "Username is available!" });
  } catch (err) {
    res.status(500).json({ success: false, available: false, message: err.message });
  }
};

// @desc    Register a new user
// @route   POST /api/user/signup
const registerUser = async (req, res) => {
  try {
    const { name, username, email, password, pic, status } = req.body;
    const cleanEmail = email && email.trim() ? email.toLowerCase().trim() : undefined;
    const cleanUsername = username && username.trim() ? username.toLowerCase().trim() : undefined;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Full Name is required." });
    }

    if (!cleanUsername && !cleanEmail) {
      return res.status(400).json({ success: false, message: "Please provide either a Username or an Email Address." });
    }

    if (cleanUsername) {
      const usernameRegex = /^[a-z0-9_.]{3,20}$/;
      if (!usernameRegex.test(cleanUsername)) {
        return res.status(400).json({
          success: false,
          message: "Username must be 3-20 characters using letters, numbers, dots, or underscores.",
        });
      }

      const existingUsername = await User.findOne({ username: cleanUsername });
      if (existingUsername) {
        return res.status(400).json({ success: false, message: "Username is already taken." });
      }
    }

    if (cleanEmail) {
      const existingEmail = await User.findOne({ email: cleanEmail });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: "An account with this email address already exists." });
      }
    }

    // Determine unique email and username
    const finalUsername =
      cleanUsername ||
      (cleanEmail ? cleanEmail.split("@")[0].replace(/[^a-z0-9_.]/g, "").slice(0, 15) + "_" + Math.floor(Math.random() * 1000) : undefined);

    const finalEmail =
      cleanEmail ||
      (finalUsername ? `${finalUsername}@agnimessenger.io` : undefined);

    const userCount = await User.countDocuments();
    const shouldBeAdmin =
      userCount === 0 ||
      (finalEmail && (finalEmail === "kalalenachar@gmail.com" || finalEmail === "alex@agnimessenger.io" || finalEmail === "alex@agni.io")) ||
      (finalUsername && (finalUsername === "kalalenachar" || finalUsername === "alex"));

    const newUserObj = {
      _id: `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: name.trim(),
      password,
      isAdmin: shouldBeAdmin,
      pic: pic || null,
      status: status || "Available | 🔥 Agni Messenger",
      token: `token_${Date.now()}`,
    };

    if (finalUsername) newUserObj.username = finalUsername;
    if (finalEmail) newUserObj.email = finalEmail;

    const newUser = await User.create(newUserObj);

    // Auto create bot chat for new user
    const userBotChat = await Chat.create({
      _id: `chat_bot_${newUser._id}`,
      chatName: "Agni Bot 🔥",
      isGroupChat: false,
      users: [newUser.toObject(), fireBotUser],
      latestMessage: {
        content: "Welcome to Agni Messenger! Send a message or command like /help",
        sender: fireBotUser,
        createdAt: new Date().toISOString(),
      },
      unread: 1,
      pinned: true,
      category: "Bots",
    });

    await Message.create({
      _id: `msg_bot_${Date.now()}`,
      sender: fireBotUser,
      content: `Greetings ${newUser.name}! Welcome to **Agni Messenger 🔥**. I am your automated AI assistant.`,
      chat: userBotChat._id,
      createdAt: new Date(),
      reactions: { "🔥": 1 },
    });

    const clean = newUser.toObject();
    delete clean.password;
    res.json({ success: true, user: clean });
  } catch (err) {
    console.error("Registration error:", err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "email or username";
      return res.status(400).json({
        success: false,
        message: `An account with this ${field} already exists. Please choose a different one or login.`,
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/user/profile
const updateUserProfile = async (req, res, io) => {
  try {
    const { userId, updates } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const payload = { ...updates };

    // Handle username update validation
    if (payload.username) {
      const cleanUsername = payload.username.toLowerCase().trim();
      if (cleanUsername !== (user.username || "").toLowerCase()) {
        const usernameRegex = /^[a-z0-9_.]{3,20}$/;
        if (!usernameRegex.test(cleanUsername)) {
          return res.status(400).json({
            success: false,
            message: "Username must be 3-20 characters using letters, numbers, dots, or underscores.",
          });
        }
        const existing = await User.findOne({ username: cleanUsername, _id: { $ne: userId } });
        if (existing) {
          return res.status(400).json({ success: false, message: "Username is already taken by another user." });
        }
        payload.username = cleanUsername;
      }
    }

    // Handle password update validation
    if (payload.newPassword) {
      if (!payload.currentPassword) {
        return res.status(400).json({ success: false, message: "Current Password is required to set a new password." });
      }
      if (user.password !== payload.currentPassword) {
        return res.status(400).json({ success: false, message: "Incorrect Current Password. Password not changed." });
      }
      if (payload.newPassword.length < 3) {
        return res.status(400).json({ success: false, message: "New password must be at least 3 characters long." });
      }
      payload.password = payload.newPassword;
    }

    delete payload.currentPassword;
    delete payload.newPassword;

    const updatedUser = await User.findByIdAndUpdate(userId, { $set: payload }, { returnDocument: "after" });

    // Update user snippet in chats
    await Chat.updateMany(
      { "users._id": userId },
      {
        $set: {
          "users.$[elem].name": updatedUser.name,
          "users.$[elem].username": updatedUser.username,
          "users.$[elem].pic": updatedUser.pic,
          "users.$[elem].status": updatedUser.status,
        },
      },
      { arrayFilters: [{ "elem._id": userId }] }
    );

    const clean = updatedUser.toObject();
    delete clean.password;

    if (io) {
      io.emit("user profile updated", clean);
    }

    res.json({ success: true, user: clean });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Search all users
// @route   GET /api/user/search
const searchUsers = async (req, res) => {
  try {
    const { search, userId } = req.query;
    const q = (search || "").trim();

    const filter = {
      _id: { $ne: userId },
    };

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { username: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    const users = await User.find(filter).select("-password").lean();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Submit verification application
// @route   POST /api/user/verify/submit
const submitVerification = async (req, res, io) => {
  try {
    const { userId, payload } = req.body;
    const user = await User.findByIdAndUpdate(
      userId,
      {
        verificationStatus: "pending",
        isVerified: false,
        verificationType: payload.verificationType || "individual",
        verificationDetails: {
          ...payload,
          submittedAt: payload.submittedAt || new Date().toISOString(),
        },
      },
      { returnDocument: "after" }
    )
      .select("-password")
      .lean();

    if (io) {
      io.emit("user profile updated", user);
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Admin review verification application
// @route   POST /api/user/verify/review
const reviewVerification = async (req, res, io) => {
  try {
    const { userId, status, rejectionReason } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const details = { ...(user.verificationDetails || {}) };
    if (status === "verified") {
      details.verifiedAt = new Date().toISOString();
      delete details.rejectionReason;
    } else if (status === "rejected") {
      details.rejectionReason = rejectionReason || "Verification criteria not met.";
      details.rejectedAt = new Date().toISOString();
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      {
        verificationStatus: status,
        isVerified: status === "verified",
        verificationDetails: details,
      },
      { returnDocument: "after" }
    )
      .select("-password")
      .lean();

    // Auto send notification message from Agni Bot 🔥 to user's chat box
    try {
      const botChatId = `chat_bot_${userId}`;
      let botChat = await Chat.findById(botChatId);
      if (!botChat) {
        botChat = await Chat.findOne({ "users._id": userId, "users._id": fireBotUser._id });
      }

      if (botChat) {
        const botContent =
          status === "verified"
            ? `🎉 **Congratulations ${updated.name}!** Your identity verification application for **${
                updated.verificationType === "business" ? "Official Business" : "Individual Identity"
              }** has been **APPROVED** by the administrator. You now have the verified badge!`
            : `⚠️ **Identity Verification Update:** Your application was reviewed and **REJECTED** by the administrator.\n\n**Reason:** ${
                rejectionReason || "Verification criteria not met."
              }\n\nYou can review your details and re-apply from your Profile Settings anytime.`;

        const botMsg = await Message.create({
          _id: `msg_bot_${Date.now()}`,
          sender: fireBotUser,
          content: botContent,
          chat: botChat._id,
          createdAt: new Date(),
          reactions: status === "verified" ? { "🎉": 1 } : { "⚠️": 1 },
        });

        await Chat.findByIdAndUpdate(botChat._id, {
          latestMessage: {
            content: botContent,
            sender: fireBotUser,
            createdAt: botMsg.createdAt.toISOString(),
          },
          $inc: { unread: 1 },
        });

        if (io) {
          io.to(botChat._id).emit("message received", {
            ...botMsg.toObject(),
            chatObj: botChat.toObject(),
          });
        }
      }
    } catch (botErr) {
      console.warn("Could not dispatch Agni Bot notification message:", botErr);
    }

    if (io) {
      io.emit("user profile updated", updated);
    }
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  loginUser,
  registerUser,
  checkUsernameAvailability,
  updateUserProfile,
  searchUsers,
  submitVerification,
  reviewVerification,
};
