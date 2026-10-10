const router = require("express").Router();
const { z } = require("zod");
const prisma = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");

router.use(authenticate);

// List all projects with a task count
router.get("/", async (req, res) => {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tasks: true } } },
  });
  res.json(projects);
});

// Create a project (Admin / Project Manager)
router.post("/", requireRole("ADMIN", "PROJECT_MANAGER"), async (req, res) => {
  const parsed = z.object({ name: z.string().min(2) }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const project = await prisma.project.create({
    data: { name: parsed.data.name, ownerId: req.user.id },
  });
  res.status(201).json(project);
});

module.exports = router;