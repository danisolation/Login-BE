const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();
const { addTokenToBlacklist } = require("../middlewares/backlist");
const mongoose = require("mongoose");
let isConnected = false;

async function connectToDatabase() {
  if (isConnected) {
    console.log("Using existing database connection");
    return;
  }

  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  isConnected = true;
  console.log("Connected to MongoDB");
}
const sendOTP = async (email, otp) => {
  await connectToDatabase();
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify your account",
    text: `Your OTP code is ${otp}`,
  };

  await transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log("Error: ", error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

exports.register = async (req, res) => {
  await connectToDatabase();
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 600000;
    const user = new User({
      email,
      password: hashedPassword,
      otp: { value: otp, reason: 1, otpExpires: otpExpires },
    });
    await user.save();

    await sendOTP(email, otp);

    res
      .status(201)
      .json({ message: "User registered. Check your email for OTP" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  await connectToDatabase();
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !user.isVerified)
      return res.status(400).json({ message: "Invalid email or not verified" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = {
      value: otp,
      reason: 2,
      otpExpires: Date.now() + 600000,
    };

    await user.save();

    await sendOTP(email, otp);

    res.status(201).json({ message: "User logined. Check your email for OTP" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.refreshToken = async (req, res) => {
  await connectToDatabase();
  const { refreshToken } = req.cookies;

  if (!refreshToken)
    return res.status(401).json({ message: "No token provided" });

  try {
    const user = await User.findOne({ refreshToken });
    if (!user) return res.status(403).json({ message: "Invalid token" });

    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      (err, decoded) => {
        if (err) return res.status(403).json({ message: "Invalid token" });

        const accessToken = jwt.sign(
          { id: decoded.id },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "15m" }
        );

        user.save();

        res.status(200).json({ accessToken });
      }
    );
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.forgotPassword = async (req, res) => {
  await connectToDatabase();
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = {
      value: otp,
      reason: 3,
      otpExpires: Date.now() + 600000,
    };
    await user.save();

    await sendOTP(email, otp);

    res.status(200).json({ message: "OTP sent to your email" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.verifyOTP = async (req, res) => {
  await connectToDatabase();
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.otp.value !== otp || Date.now() > new Date(user.otp.otpExpires)) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (user.otp.reason == 3) {
      await user.save();
      res.status(200).json({ reason: user.otp.reason });
    } else {
      user.otp.value = null;
      user.otp.otpExpires = null;
      if (user.otp.reason == 1) {
        user.isVerified = true;
      }
      const accessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
      );
      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
      );

      user.refreshToken = refreshToken;
      await user.save();

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({ reason: user.otp.reason, accessToken });
    }
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.resetPassword = async (req, res) => {
  await connectToDatabase();
  const { email, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.otp == null) {
      return res.status(400).json({ message: "Error" });
    }

    user.otp.value = null;
    user.otp.otpExpires = null;
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.logout = async (req, res) => {
  await connectToDatabase();
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken)
      return res.status(400).json({ message: "No token provided" });

    const user = await User.findOne({ refreshToken });
    if (!user) return res.status(403).json({ message: "Invalid token" });

    const accessToken = req.headers["authorization"]?.split(" ")[1];
    if (accessToken) {
      addTokenToBlacklist(accessToken);
    }

    user.refreshToken = null;
    await user.save();

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    return res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getUser = async (req, res) => {
  await connectToDatabase();
  const { email } = req.body;

  try {
    const user = await User.findOne({ email }).select(
      "-password -refreshToken -otp"
    );
    if (!user) return res.status(400).json({ message: "User not found" });

    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateUser = async (req, res) => {
  await connectToDatabase();
  const { email, fullName, phone, birth } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    user.fullName = fullName;
    user.phone = phone;
    user.birth = birth;
    await user.save();

    res.status(200).json({ message: "Updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
