const StatusPost = require("../models/StatusPost");
const AudienceProfile = require("../models/AudienceProfile");
const User = require("../models/User");

// @desc    Get active status feed for user
// @route   GET /api/status/feed/:userId
const getActiveStatusFeed = async (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date();
    const activePosts = await StatusPost.find({ expiresAt: { $gt: now } }).sort({ createdAt: -1 }).lean();
    const audienceProfiles = await AudienceProfile.find().lean();
    const profilesMap = new Map(audienceProfiles.map((p) => [p._id, p]));

    const visiblePosts = activePosts.filter((post) => {
      if (post.userId === userId) return true;
      if (!post.audienceProfileIds || post.audienceProfileIds.includes("ALL")) return true;

      return post.audienceProfileIds.some((profId) => {
        const prof = profilesMap.get(profId);
        if (!prof) return true;
        const members = prof.memberIds || [];
        if (prof.mode === "blacklist") return !members.includes(userId);
        return members.includes(userId);
      });
    });

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

      const isViewed = (post.viewers || []).some((v) => v.userId === userId);
      if (!isViewed && uid !== userId) feedByUserMap[uid].hasUnviewed = true;
    });

    const feedList = Object.values(feedByUserMap).sort((a, b) => {
      if (a.isOwn) return -1;
      if (b.isOwn) return 1;
      return new Date(b.latestUpdatedAt) - new Date(a.latestUpdatedAt);
    });

    res.json({ success: true, feed: feedList });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Create new status story
// @route   POST /api/status
const createStatusPost = async (req, res, io) => {
  try {
    const { userId, postData } = req.body;
    const author = await User.findById(userId).select("-password").lean();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const newPost = await StatusPost.create({
      _id: `status_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId,
      author: author ? { _id: author._id, name: author.name, pic: author.pic } : { _id: userId, name: "User", pic: "" },
      type: postData.type || "text",
      content: postData.content || "",
      caption: postData.caption || "",
      bgColor: postData.bgColor || "linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)",
      fontStyle: postData.fontStyle || "sans-serif",
      audienceProfileIds: postData.audienceProfileIds || ["ALL"],
      expiresAt,
      viewers: [],
    });

    const postObj = newPost.toObject();
    if (io) {
      io.emit("new_status_posted", { userId, post: postObj });
    }
    res.json({ success: true, post: postObj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Record view on status story
// @route   POST /api/status/view
const recordStatusView = async (req, res, io) => {
  try {
    const { statusId, viewerUser } = req.body;
    const post = await StatusPost.findById(statusId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Status not found" });
    }

    const alreadyViewed = (post.viewers || []).some((v) => v.userId === viewerUser._id);
    if (!alreadyViewed) {
      post.viewers.push({
        userId: viewerUser._id,
        name: viewerUser.name,
        pic: viewerUser.pic,
        viewedAt: new Date(),
      });
      await post.save();
    }

    const postObj = post.toObject();
    if (io) {
      io.emit("status_viewed", {
        statusId,
        viewerUser,
        viewers: postObj.viewers,
        authorId: postObj.userId,
      });
    }

    res.json({ success: true, post: postObj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete a status post
// @route   DELETE /api/status/:userId/:statusId
const deleteStatusPost = async (req, res, io) => {
  try {
    const { userId, statusId } = req.params;
    await StatusPost.deleteOne({ _id: statusId, userId });
    if (io) {
      io.emit("status_deleted", { userId, statusId });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get audience profiles for user
// @route   GET /api/audience-profiles/:userId
const getAudienceProfiles = async (req, res) => {
  try {
    const { userId } = req.params;
    let profiles = await AudienceProfile.find({ userId }).lean();
    if (profiles.length === 0) {
      const defaultProfiles = [
        { _id: `prof_all_${userId}`, userId, name: "All Contacts", mode: "whitelist", isDefault: true, memberIds: [] },
        { _id: `prof_school_${userId}`, userId, name: "Close Friends", mode: "whitelist", isDefault: false, memberIds: ["user_sarah"] },
        { _id: `prof_no_office_${userId}`, userId, name: "Hide from Others", mode: "blacklist", isDefault: false, memberIds: ["user_marcus"] },
      ];
      await AudienceProfile.insertMany(defaultProfiles);
      return res.json({ success: true, profiles: defaultProfiles });
    }
    res.json({ success: true, profiles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Save/Edit audience profile
// @route   POST /api/audience-profiles
const saveAudienceProfile = async (req, res) => {
  try {
    const { userId, profileData } = req.body;
    const profId = profileData._id || `prof_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const profile = await AudienceProfile.findByIdAndUpdate(
      profId,
      { ...profileData, _id: profId, userId },
      { upsert: true, returnDocument: "after" }
    ).lean();
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete audience profile
// @route   DELETE /api/audience-profiles/:userId/:profileId
const deleteAudienceProfile = async (req, res) => {
  try {
    const { userId, profileId } = req.params;
    await AudienceProfile.deleteOne({ _id: profileId, userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getActiveStatusFeed,
  createStatusPost,
  recordStatusView,
  deleteStatusPost,
  getAudienceProfiles,
  saveAudienceProfile,
  deleteAudienceProfile,
};
