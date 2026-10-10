
const router = require("express").Router();
const { z } = require("zod");
const prisma = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");

router.use(authenticate);

const taskFields = {
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  labels: z.array(z.string()).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
};

const withDate = (data) =>
  "dueDate" in data
    ? {
        ...data,
        dueDate: data.dueDate
          ? new Date(data.dueDate)
          : null,
      }
    : data;

const log = (action, taskId, userId) =>
  prisma.activity.create({
    data: { action, taskId, userId },
  });

// Get tasks
router.get("/", async (req, res) => {
  const {
    projectId,
    priority,
    status,
    assigneeId,
    label,
  } = req.query;

  const page = Math.max(
    1,
    parseInt(req.query.page) || 1
  );

  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.query.limit) || 20)
  );

  const where = {
    ...(projectId && { projectId }),
    ...(priority && { priority }),
    ...(status && { status }),
    ...(assigneeId && { assigneeId }),
    ...(label && { labels: { has: label } }),
  };

  try {
    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { status: "asc" },
          { position: "asc" },
          { createdAt: "desc" },
        ],
        include: {
          assignee: {
            select: { id: true, name: true },
          },
          _count: {
            select: { comments: true },
          },
        },
      }),
      prisma.task.count({ where }),
    ]);

    res.json({
      items,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(400).json({
      error: "Invalid filter value",
    });
  }
});

// Create task
router.post(
  "/",
  requireRole("ADMIN", "PROJECT_MANAGER"),
  async (req, res) => {
    const parsed = z
      .object({
        ...taskFields,
        projectId: z.string(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.flatten(),
      });
    }

    try {
      const data = withDate(parsed.data);

      if (data.status === "DONE") {
        data.completedAt = new Date();
      }

      const task = await prisma.task.create({
        data,
      });

      await log(
        "created task",
        task.id,
        req.user.id
      );

      res.status(201).json(task);
    } catch (err) {
      console.error(err);

      res.status(400).json({
        error:
          "Invalid projectId, assigneeId or date",
      });
    }
  }
);

// Get individual task
router.get("/:id", async (req, res) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: {
      assignee: {
        select: { id: true, name: true },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: { id: true, name: true },
          },
        },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          user: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!task) {
    return res.status(404).json({
      error: "Task not found",
    });
  }

  res.json(task);
});

// Add comment
router.post("/:id/comments", async (req, res) => {
  const parsed = z
    .object({
      body: z.string().min(1),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Comment cannot be empty",
    });
  }

  try {
    const comment = await prisma.comment.create({
      data: {
        body: parsed.data.body,
        taskId: req.params.id,
        authorId: req.user.id,
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
    });

    await log(
      "commented",
      req.params.id,
      req.user.id
    );

    res.status(201).json(comment);
  } catch (err) {
    res.status(404).json({
      error: "Task not found",
    });
  }
});

// Update task
router.patch("/:id", async (req, res) => {
  const parsed = z
    .object(taskFields)
    .partial()
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.flatten(),
    });
  }

  const before = await prisma.task.findUnique({
    where: { id: req.params.id },
  });

  if (!before) {
    return res.status(404).json({
      error: "Task not found",
    });
  }

  const isManager = [
    "ADMIN",
    "PROJECT_MANAGER",
  ].includes(req.user.role);

  const isAssignee =
    before.assigneeId === req.user.id;

  const allowed = isManager
    ? null
    : [
        "status",
        ...(isAssignee ? ["assigneeId"] : []),
      ];

  if (
    allowed &&
    Object.keys(parsed.data).some(
      (key) => !allowed.includes(key)
    )
  ) {
    return res.status(403).json({
      error:
        "You can only change status, or hand off a task assigned to you",
    });
  }

  try {
    const data = withDate(parsed.data);

    // Save the moment a task enters Completed.
    // Clear the date when it leaves Completed.
    // Other edits do not change completedAt.
    if (
      data.status &&
      data.status !== before.status
    ) {
      if (data.status === "DONE") {
        data.completedAt = new Date();
      } else if (before.status === "DONE") {
        data.completedAt = null;
      }
    }

    const task = await prisma.task.update({
      where: { id: before.id },
      data,
    });

    if (
      parsed.data.status &&
      parsed.data.status !== before.status
    ) {
      await log(
        `moved to ${task.status}`,
        task.id,
        req.user.id
      );
    }

    if ("dueDate" in parsed.data) {
      const was =
        before.dueDate
          ?.toISOString()
          .slice(0, 10) || null;

      const now =
        task.dueDate
          ?.toISOString()
          .slice(0, 10) || null;

      if (was !== now) {
        await log(
          now
            ? `set due date to ${now}`
            : "removed due date",
          task.id,
          req.user.id
        );
      }
    }

    if (
      "assigneeId" in parsed.data &&
      parsed.data.assigneeId !==
        before.assigneeId
    ) {
      await log(
        "reassigned task",
        task.id,
        req.user.id
      );

      if (
        task.assigneeId &&
        task.assigneeId !== req.user.id
      ) {
        const me = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { name: true },
        });

        await prisma.notification.create({
          data: {
            userId: task.assigneeId,
            taskId: task.id,
            projectId: task.projectId,
            message: `${me.name} assigned you "${task.title}"`,
          },
        });
      }
    }

    res.json(task);
  } catch (err) {
    console.error(err);

    res.status(400).json({
      error:
        "Failed: " +
        String(err.message)
          .split("\n")
          .slice(-4)
          .join(" "),
    });
  }
});

// Delete comment (Admin only)
router.delete(
  "/:id/comments/:commentId",
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const result =
        await prisma.comment.deleteMany({
          where: {
            id: req.params.commentId,
            taskId: req.params.id,
          },
        });

      if (result.count === 0) {
        return res.status(404).json({
          error: "Comment not found",
        });
      }

      await log(
        "deleted a comment",
        req.params.id,
        req.user.id
      );

      res.status(204).end();
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Could not delete comment",
      });
    }
  }
);

// Delete task
router.delete(
  "/:id",
  requireRole("ADMIN", "PROJECT_MANAGER"),
  async (req, res) => {
    try {
      await prisma.task.delete({
        where: { id: req.params.id },
      });

      res.status(204).end();
    } catch (err) {
      res.status(404).json({
        error: "Task not found",
      });
    }
  }
);

module.exports = router;
