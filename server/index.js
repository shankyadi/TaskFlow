require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { authenticate, requireRole } = require("./middleware/auth");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.get("/", (req, res) => res.send("TaskFlow API is running!"));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/users", require("./routes/users"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/dashboard", require("./routes/dashboard"));

// Test routes for token and role checks
app.get("/api/me", authenticate, (req, res) => res.json(req.user));
app.get("/api/admin-only", authenticate, requireRole("ADMIN"), (req, res) =>
  res.json({ message: "Hello admin" })
);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
