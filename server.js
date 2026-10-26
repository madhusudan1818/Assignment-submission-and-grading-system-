require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- Models ----------
const User = mongoose.model("User", new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["student", "teacher"], default: "student" }
}));

const Assignment = mongoose.model("Assignment", new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: String,
  link: String,
  marks: { type: Number, default: null },
  feedback: { type: String, default: "" },
  status: { type: String, enum: ["submitted", "graded"], default: "submitted" },
  createdAt: { type: Date, default: Date.now }
}));

// ---------- Auth helpers ----------
const sign = (u) => jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

function auth(role) {
  return (req, res, next) => {
    try {
      const token = (req.headers.authorization || "").replace("Bearer ", "");
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      if (role && req.user.role !== role) return res.status(403).json({ error: "Not allowed" });
      next();
    } catch {
      res.status(401).json({ error: "Please log in again" });
    }
  };
}

// ---------- Routes ----------
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, role, teacherCode } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Fill in all fields" });
    if (role === "teacher" && teacherCode !== process.env.TEACHER_CODE)
      return res.status(403).json({ error: "Wrong teacher code" });
    if (await User.findOne({ email })) return res.status(400).json({ error: "Email already registered" });
    const user = await User.create({
      name, email, password: await bcrypt.hash(password, 10),
      role: role === "teacher" ? "teacher" : "student"
    });
    res.json({ token: sign(user), name: user.name, role: user.role });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || "").toLowerCase() });
  if (!user || !(await bcrypt.compare(password || "", user.password)))
    return res.status(400).json({ error: "Wrong email or password" });
  res.json({ token: sign(user), name: user.name, role: user.role });
});

// Student: submit and view own
app.post("/api/assignments", auth("student"), async (req, res) => {
  const { title, description, link } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });
  const a = await Assignment.create({ student: req.user.id, title, description, link });
  res.json(a);
});

app.get("/api/assignments/mine", auth("student"), async (req, res) => {
  res.json(await Assignment.find({ student: req.user.id }).sort("-createdAt"));
});

// Teacher: view all and grade
app.get("/api/assignments", auth("teacher"), async (req, res) => {
  res.json(await Assignment.find().populate("student", "name email").sort("-createdAt"));
});

app.put("/api/assignments/:id/grade", auth("teacher"), async (req, res) => {
  const { marks, feedback } = req.body;
  if (marks === undefined || marks < 0 || marks > 100)
    return res.status(400).json({ error: "Marks must be 0 to 100" });
  const a = await Assignment.findByIdAndUpdate(
    req.params.id, { marks, feedback, status: "graded" }, { new: true });
  res.json(a);
});

// ---------- Start ----------
const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(PORT, () => console.log("Server running on port " + PORT)))
  .catch((e) => { console.error("MongoDB connection failed:", e.message); process.exit(1); });
