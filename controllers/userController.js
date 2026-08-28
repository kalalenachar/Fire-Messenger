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
    const cleanEmail = (email || "").toLowerCase().trim();
    const cleanUsername = (username || "").toLowerCase().trim();

    if (!cleanUsername) {
      return res.status(400).json({ success: false, message: "Username is required." });
    }

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

    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: "An account with this email address already exists." });
    }

    const userCount = await User.countDocuments();
    const shouldBeAdmin =
      userCount === 0 ||
      cleanEmail === "kalalenachar@gmail.com" ||
      cleanEmail === "alex@agnimessenger.io" ||
      cleanEmail === "alex@agni.io";

    const newUser = await User.create({
      _id: `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      password,
      isAdmin: shouldBeAdmin,
      pic: pic || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      status: status || "Available | 🔥 Agni Messenger",
      token: `token_${Date.now()}`,
    });

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
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/user/profile
const updateUserProfile = async (req, res, io) => {
  try {
    const { userId, updates } = req.body;
    const updatedUser = await User.findByIdAndUpdate(userId, { $set: updates }, { returnDocument: "after" });
    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

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
