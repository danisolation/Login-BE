const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String },
  phone: { type: String },
  birth: { type: Date },
  isVerified: { type: Boolean, default: false },
  otp: {
    value: { type: String, default: null },
    reason: { type: Number, default: null },
    otpExpires: { type: Date, default: null },
  },
  refreshToken: { type: String, default: null },
});

module.exports = mongoose.model("User", userSchema);
