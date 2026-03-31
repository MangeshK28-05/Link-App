require("dotenv").config();
const { body, validationResult } = require("express-validator");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const protect = require("./middleware/protect");
const authRoutes = require("./Routes/auth");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(
  cors({
    origin: "link-app-delta.vercel.app",
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(cors())

app.use(helmet());
app.use(express.json({ limit: "10kb" }));
app.set("trust proxy" , 1)

// ========== RATE LIMITERS ==========

const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many attempts. Please try again after a minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const moderateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const lightLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(lightLimiter);

app.use("/api/auth", authRoutes);

// DATABASE SCHEMA
const linkSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    url: {
      type: String,
      required: [true, "URL is required"],
      trim: true,
    },
    password: {
      type: String,
      default: null,
    },
    tags: {
      type: [String],
      default: ["general"],
      set: (tags) =>
      tags.map((tag) => tag.trim().toLowerCase().replace(/\s+/g, "-")),
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
  },
  {
    timestamps: true,
  },
);


linkSchema.virtual('hasPassword').get(function() {
  return !!this.password;
});


linkSchema.set('toJSON', { 
  transform: function (doc, ret) {
    delete ret.password;
    return ret;
  },
  virtuals: true 
});

const Link = mongoose.model("Link", linkSchema);

// DATABASE CONNECTION
mongoose
  .connect(MONGODB_URI, {
    dbName: "LinkManagerDB",
  })
  .then(() => console.log("Connected to Mongo"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// ROUTES

// Get all links
app.get("/api/links", protect, moderateLimiter, async (req, res) => {
  try {
    const links = await Link.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    return res.json({
      success: true,
      count: links.length,
      data: links,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch links",
      error: error.message,
    });
  }
});

// Get all unique tags
app.get("/api/tags", protect, moderateLimiter, async (req, res) => {
  try {
    const tags = await Link.distinct("tags", { user: req.user.id });
    return res.json({
      success: true,
      count: tags.length,
      data: tags,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tags",
      error: error.message,
    });
  }
});

// Get links by tag
app.get(
  "/api/links/tag/:tagName",
  protect,
  moderateLimiter,
  async (req, res) => {
    try {
    let {tagName} = req.params
    tagName = tagName.trim().toLowerCase().replace(/\s+/g,"-")
      const links = await Link.find({
        user: req.user.id,
        tags: { $in: [tagName.toLowerCase()] },
      }).sort({ createdAt: -1 });

      return res.json({
        success: true,
        count: links.length,
        data: links,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to filter links by tag",
        error: error.message,
      });
    }
  },
);

// Create a new link
app.post(
  "/api/links",
  protect,
  strictLimiter,
  [
    body("title")
      .trim()
      .notEmpty()
      .withMessage("Title is required")
      .isLength({ max: 200 })
      .withMessage("Title cannot be more than 200 characters")
      .escape(),

    body("url")
      .trim()
      .notEmpty()
      .withMessage("URL is required")
      .isURL()
      .withMessage("Please provide a valid URL")
      .isLength({ max: 500 }),

    body("password")
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 50 })
      .withMessage("Password must be 4-50 characters"),

    body("tags")
      .optional()
      .isArray()
      .withMessage("Tags must be an array")
      .custom((tags) => tags.length <= 6)
      .withMessage("Maximum 6 tags allowed"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    try {
      const { title, url, password, tags } = req.body;

      let hashedPassword = null;

      if (password && password.trim() !== "") {
        hashedPassword = await bcrypt.hash(password, 10);
      }

      const newLink = await Link.create({
        title,
        url,
        password: hashedPassword,
        tags: tags || ["general"],
        user: req.user.id,
      });

      return res.status(201).json({
        success: true,
        message: "Link created successfully",
        data: newLink,
      });
      
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to create link",
        error: error.message,
      });
    }
  },
);

// Update a link
app.put(
  "/api/links/:id",
  protect,
  moderateLimiter,
  [
    body("title")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Title too long")
      .escape(),

    body("url")
      .optional()
      .trim()
      .isURL()
      .withMessage("Please provide a valid URL")
      .isLength({ max: 500 }),

    body("tags")
      .optional()
      .isArray()
      .withMessage("Tags must be an array")
      .custom((tags) => tags.length <= 10)
      .withMessage("Maximum 10 tags allowed"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    try {
      const { id } = req.params;

     
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid link ID",
        });
      }

      const { title, url, tags } = req.body;

      if (!title && !url && !tags) {
        return res.status(400).json({
          success: false,
          message: "At least one field must be provided",
        });
      }

      const updateData = {};
      if (title) updateData.title = title;
      if (url) updateData.url = url;
      if (tags) updateData.tags = tags;

      const updatedLink = await Link.findOneAndUpdate(
        { _id: id, user: req.user.id },
        { $set: updateData },
        { new: true, runValidators: true },
      );

      if (!updatedLink) {
        return res.status(404).json({
          success: false,
          message: "Link not found or not authorized",
        });
      }

      return res.json({
        success: true,
        message: "Link updated successfully",
        data: updatedLink,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to update link",
        error: error.message,
      });
    }
  },
);

// Verify password-protected link
app.post("/api/links/:id/verify", protect, strictLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid link ID",
      });
    }

    const link = await Link.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: "Link not found or not authorized",
      });
    }

    if (!link.password) {
      return res.json({
        success: true,
        url: link.url,
        title: link.title,
      });
    }

    if (!password) {
      return res.status(401).json({
        success: false,
        message: "Password is required",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, link.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password",
      });
    }

    return res.json({
      success: true,
      url: link.url,
      title: link.title,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Verification failed",
      error: error.message,
    });
  }
});

// Delete a link
app.delete("/api/links/:id", protect, moderateLimiter, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid link ID",
      });
    }

    const deletedLink = await Link.findOneAndDelete({
      _id: id,
      user: req.user.id,
    });

    if (!deletedLink) {
      return res.status(404).json({
        success: false,
        message: "Link not found or not authorized",
      });
    }

    return res.json({
      success: true,
      message: "Link deleted successfully",
      data: deletedLink,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete link",
      error: error.message,
    });
  }
});

// START SERVER
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});