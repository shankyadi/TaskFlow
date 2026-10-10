const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { z } = require("zod");
const prisma = require("../db");

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
});

const sha256 = (text) => crypto.createHash("sha256").update(text).digest("hex");

router.post("/register", async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(8),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { name, email, password } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "Email already in use" });

  const user = await prisma.user.create({
    data: { name, email, password: await bcrypt.hash(password, 10) },
  });

  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  res.json({ token: signToken(user), user: publicUser(user) });
});

// Step 1 of reset: create a one-time link (valid 30 minutes)
router.post("/forgot-password", async (req, res) => {
  // Same answer whether or not the email exists, so nobody can probe for accounts
  const reply = { message: "If that email has an account, a reset link was created." };

  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) return res.json(reply);

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token), // only the hash is stored
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    const link = `${process.env.CLIENT_URL}/reset-password/${token}`;
    // Development: print the link. In production, email it instead.
    console.log(`\n🔑 PASSWORD RESET LINK for ${user.email}\n${link}\n`);
  }

  res.json(reply);
});

// Step 2 of reset: set the new password
router.post("/reset-password", async (req, res) => {
  const parsed = z
    .object({ token: z.string().min(10), password: z.string().min(8) })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const record = await prisma.passwordReset.findUnique({
    where: { tokenHash: sha256(parsed.data.token) },
  });
  if (!record || record.used || record.expiresAt < new Date()) {
    return res.status(400).json({ error: "This reset link is invalid or has expired" });
  }

  const hashed = await bcrypt.hash(parsed.data.password, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
    prisma.passwordReset.update({ where: { id: record.id }, data: { used: true } }),
  ]);

  res.json({ message: "Password updated. You can log in now." });
});

module.exports = router;