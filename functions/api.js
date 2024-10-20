const serverless = require("serverless-http");
const express = require("express");
require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("../routes/authRoutes");

const app = express();

app.use(express.json());
const allowedOrigins = ["http://127.0.0.1:5500", "https://loginfe.netlify.app"];

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  allowedHeaders: "Content-Type, Authorization",
};

app.use(cors(corsOptions));

app.use(cookieParser());
app.use("/.netlify/functions/api", authRoutes);

module.exports.handler = serverless(app);
