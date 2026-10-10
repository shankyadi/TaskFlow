const router = require("express").Router();
const prisma = require("../db");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

const pct = (done, total) => (total ? Math.round((done / total) * 100) : 0);

router.get("/", async (req, res) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [
      byStatus,
      byPriority,
      byProject,
      byAssignee,
      overdue,
      projects,
      users,
      myTasks,
    ] = await Promise.all([
      prisma.task.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.task.groupBy({ by: ["priority"], _count: { _all: true } }),
      prisma.task.groupBy({ by: ["projectId", "status"], _count: { _all: true } }),
      prisma.task.groupBy({ by: ["assigneeId", "status"], _count: { _all: true } }),
      prisma.task.count({
        where: { status: { not: "DONE" }, dueDate: { lt: today } },
      }),
      prisma.project.findMany({ select: { id: true, name: true } }),
      prisma.user.findMany({ select: { id: true, name: true } }),
      // Tasks assigned to the logged-in person that are not finished
      prisma.task.findMany({
        where: { assigneeId: req.user.id, status: { not: "DONE" } },
        orderBy: [
          { dueDate: { sort: "asc", nulls: "last" } },
          { priority: "desc" },
        ],
        take: 20,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          projectId: true,
          project: { select: { name: true } },
        },
      }),
    ]);

    const status = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    byStatus.forEach((r) => (status[r.status] = r._count._all));

    const priority = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    byPriority.forEach((r) => (priority[r.priority] = r._count._all));

    const total = status.TODO + status.IN_PROGRESS + status.DONE;

    // Per project
    const projectMap = {};
    projects.forEach((p) => {
      projectMap[p.id] = { id: p.id, name: p.name, TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    });
    byProject.forEach((r) => {
      if (projectMap[r.projectId]) projectMap[r.projectId][r.status] = r._count._all;
    });
    const projectStats = Object.values(projectMap).map((p) => {
      const t = p.TODO + p.IN_PROGRESS + p.DONE;
      return { ...p, total: t, percent: pct(p.DONE, t) };
    });

    // Workload per person (open = not done)
    const names = Object.fromEntries(users.map((u) => [u.id, u.name]));
    const workMap = {};
    byAssignee.forEach((r) => {
      const key = r.assigneeId || "none";
      workMap[key] ||= {
        id: key,
        name: r.assigneeId ? names[r.assigneeId] || "Unknown" : "Unassigned",
        open: 0,
        done: 0,
      };
      if (r.status === "DONE") workMap[key].done += r._count._all;
      else workMap[key].open += r._count._all;
    });
    const workload = Object.values(workMap).sort((a, b) => b.open - a.open);

    res.json({
      total,
      overdue,
      completion: pct(status.DONE, total),
      status,
      priority,
      projects: projectStats,
      workload,
      myTasks,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load dashboard" });
  }
});

module.exports = router;