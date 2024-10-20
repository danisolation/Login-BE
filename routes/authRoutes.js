const express = require("express");
const {
  register,
  verifyOTP,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  getUser,
  updateUser,
} = require("../controllers/authController");
const { authenticateToken } = require('../middlewares/authMiddleware');
const router = express.Router();

router.get("/", (req, res) => {
  res.send('App is running ..')
});
router.post("/register", register);
router.post("/verifyOTP", verifyOTP);
router.post("/login", login);
router.post("/logout", authenticateToken, logout);
router.post("/refreshToken", authenticateToken, refreshToken);
router.post("/forgotPassword", forgotPassword);
router.post("/resetPassword", resetPassword);
router.get("/getUser", authenticateToken, getUser);
router.put("/updateUser", authenticateToken, updateUser);

module.exports = router;
