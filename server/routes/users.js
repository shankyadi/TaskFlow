const router = require("express").Router();
const prisma = require("../db");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.get("/", async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
  res.json(users);
});

module.exports = router;
