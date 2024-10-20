const serverless = require('serverless-http');
const express = require("express");
require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("../routes/authRoutes");

const app = express();

app.use(express.json());


app.use(cors());
app.use(cookieParser());
app.use("/.netlify/functions/api", authRoutes);



module.exports.handler = serverless(app);
