const express = require("express");
const router = express.Router();
const {
  loginUser,
  registerUser,
  updateUserProfile,
  searchUsers,
  submitVerification,
  reviewVerification,
} = require("../controllers/userController");

router.post("/login", (req, res) => loginUser(req, res));
router.post("/signup", (req, res) => registerUser(req, res));
router.put("/profile", (req, res) => updateUserProfile(req, res, req.io));
router.get("/search", (req, res) => searchUsers(req, res));
router.post("/verify/submit", (req, res) => submitVerification(req, res, req.io));
router.post("/verify/review", (req, res) => reviewVerification(req, res, req.io));

module.exports = router;
