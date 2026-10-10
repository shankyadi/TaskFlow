const router = require("express").Router();
const prisma = require("../db");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

// My latest notifications
router.get("/", async (req, res) => {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({ where: { userId: req.user.id, read: false } }),
  ]);
  res.json({ items, unread });
});

// Mark all as read
router.patch("/read-all", async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, read: false },
    data: { read: true },
  });
  res.status(204).end();
});

// Mark one as read
router.patch("/:id/read", async (req, res) => {
  await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user.id },
    data: { read: true },
  });
  res.status(204).end();
});

module.exports = router;