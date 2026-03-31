const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require('express-rate-limit');
const User = require("../Models/user");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,       
  sameSite: "none",   
  maxAge: 7 * 24 * 60 * 60 * 1000,
};


//SIGUNUP rate-limiting
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many accounts created. Please try again after an hour."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// LOGIN rate-limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// LOGOUT rate-limiting
const logoutLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: "Too many logout requests."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// SIGNUP
const { body, validationResult } = require("express-validator");

router.post(
  "/signup",
  signupLimiter,
  [
    body("username")
      .trim()
      .isLength({ min: 3, max: 30 }),

    body("email")
      .isEmail()
      .normalizeEmail(),

    body("password")
      .isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
      });
    }

    try {
      const { username, email, password } = req.body;

      const existing = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Unable to create account",
        });
      }

      const hashed = await bcrypt.hash(password, 10);
      const user = await User.create({
        username,
        email,
        password: hashed,
      });

      const token = jwt.sign({ id: user._id }, JWT_SECRET, {
        expiresIn: "7d",
      });

      res.cookie("token", token, COOKIE_OPTIONS);

      res.status(201).json({
        success: true,
        message: "User created",
      });
    } catch (err) {
      console.error("Signup error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// LOGIN
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Missing credentials" });

    const user = await User.findOne({ email }).select("+password");

    const isMatch = user
      ? await bcrypt.compare(password, user.password)
      : false;

    if (!isMatch)
      return res.status(401).json({
        success: false,
        message: "Invalid email or password", 
      });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, COOKIE_OPTIONS);

    res.json({ success: true, message: "Logged in" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" }); 
  }
});

//LOGOUT
router.post("/logout", logoutLimiter, (req, res) => {
  res.clearCookie("token" , COOKIE_OPTIONS);
  res.json({ success: true, message: "Logged out" });
});

module.exports = router;