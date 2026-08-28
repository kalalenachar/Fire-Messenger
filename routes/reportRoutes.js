const express = require("express");
const router = express.Router();
const { submitReport } = require("../controllers/adminController");

router.post("/", (req, res) => submitReport(req, res, req.io));

module.exports = router;
