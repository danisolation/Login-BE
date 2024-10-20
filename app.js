const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(express.json());
const corsOptions = {
  origin: "http://127.0.0.1:5500",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE", 
  credentials: true, 
  allowedHeaders: "Content-Type, Authorization", 
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use("/api/auth", authRoutes);

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log("Failed to connect to MongoDB", err);
  });

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
