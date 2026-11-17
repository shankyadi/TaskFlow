
const router = require("express").Router();
const prisma = require("../db");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

const pct = (done, total) =>
  total ? Math.round((done / total) * 100) : 0;

const DAY_MS = 24 * 60 * 60 * 1000;

const priorityRank = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

const taskSelect = {
  id: true,
  title: true,
  status: true,
  priority: true,
  dueDate: true,
  completedAt: true,
  projectId: true,
  project: {
    select: {
      id: true,
      name: true,
    },
  },
};

function utcDayStart(date = new Date()) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    )
  );
}

function focusSort(a, b, today) {
  const aDue = a.dueDate
    ? new Date(a.dueDate).getTime()
    : Infinity;

  const bDue = b.dueDate
    ? new Date(b.dueDate).getTime()
    : Infinity;

  const aOverdue = aDue < today.getTime();
  const bOverdue = bDue < today.getTime();

  if (aOverdue !== bOverdue) {
    return aOverdue ? -1 : 1;
  }

  if (aDue !== bDue) {
    return aDue - bDue;
  }

  return (
    (priorityRank[a.priority] ?? 3) -
    (priorityRank[b.priority] ?? 3)
  );
}

router.get("/", async (req, res) => {
  try {
    const today = utcDayStart();

    const tomorrow = new Date(
      today.getTime() + DAY_MS
    );

    const weekStart = new Date(
      today.getTime() - 6 * DAY_MS
    );

    const deadlineEnd = new Date(
      today.getTime() + 8 * DAY_MS
    );

    const [
      byStatus,
      byPriority,
      byProject,
      byAssignee,
      overdue,
      projects,
      users,
      assignedTasks,
      completedThisWeek,
      deadlineTasks,
      recentActivities,
      overdueByProject,
    ] = await Promise.all([
      // Tasks by status
      prisma.task.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),

      // Tasks by priority
      prisma.task.groupBy({
        by: ["priority"],
        _count: { _all: true },
      }),

      // Tasks by project and status
      prisma.task.groupBy({
        by: ["projectId", "status"],
        _count: { _all: true },
      }),

      // Tasks by assignee and status
      prisma.task.groupBy({
        by: ["assigneeId", "status"],
        _count: { _all: true },
      }),

      // Total overdue tasks
      prisma.task.count({
        where: {
          status: { not: "DONE" },
          dueDate: { lt: today },
        },
      }),

      // Projects
      prisma.project.findMany({
        select: {
          id: true,
          name: true,
        },
      }),

      // Users
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
        },
      }),

      // All unfinished tasks assigned to the user
      prisma.task.findMany({
        where: {
          assigneeId: req.user.id,
          status: { not: "DONE" },
        },
        select: taskSelect,
      }),

      // Completed tasks during the past 7 UTC days
      prisma.task.findMany({
        where: {
          status: "DONE",
          completedAt: {
            gte: weekStart,
            lt: tomorrow,
          },
        },
        select: {
          id: true,
          completedAt: true,
        },
      }),

      // Upcoming deadlines
      prisma.task.findMany({
        where: {
          status: { not: "DONE" },
          dueDate: {
            gte: today,
            lt: deadlineEnd,
          },
        },
        orderBy: [
          { dueDate: "asc" },
        ],
        take: 30,
        select: taskSelect,
      }),

      // Recent activity
      prisma.activity.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
        select: {
          id: true,
          action: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
              projectId: true,
              project: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),

      // Overdue tasks per project
      prisma.task.groupBy({
        by: ["projectId"],
        where: {
          status: { not: "DONE" },
          dueDate: { lt: today },
        },
        _count: { _all: true },
      }),
    ]);

    // -----------------------------------------
    // STATUS STATISTICS
    // -----------------------------------------

    const status = {
      TODO: 0,
      IN_PROGRESS: 0,
      DONE: 0,
    };

    byStatus.forEach((row) => {
      status[row.status] = row._count._all;
    });

    // -----------------------------------------
    // PRIORITY STATISTICS
    // -----------------------------------------

    const priority = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
    };

    byPriority.forEach((row) => {
      priority[row.priority] = row._count._all;
    });

    const total =
      status.TODO +
      status.IN_PROGRESS +
      status.DONE;

    // -----------------------------------------
    // PROJECT HEALTH
    // -----------------------------------------

    const projectMap = {};

    projects.forEach((project) => {
      projectMap[project.id] = {
        id: project.id,
        name: project.name,
        TODO: 0,
        IN_PROGRESS: 0,
        DONE: 0,
        overdue: 0,
      };
    });

    byProject.forEach((row) => {
      if (projectMap[row.projectId]) {
        projectMap[row.projectId][row.status] =
          row._count._all;
      }
    });

    overdueByProject.forEach((row) => {
      if (projectMap[row.projectId]) {
        projectMap[row.projectId].overdue =
          row._count._all;
      }
    });

    const projectStats = Object.values(
      projectMap
    ).map((project) => {
      const projectTotal =
        project.TODO +
        project.IN_PROGRESS +
        project.DONE;

      return {
        ...project,
        total: projectTotal,
        percent: pct(
          project.DONE,
          projectTotal
        ),
      };
    });

    // -----------------------------------------
    // TEAM WORKLOAD
    // -----------------------------------------

    const names = Object.fromEntries(
      users.map((user) => [
        user.id,
        user.name,
      ])
    );

    const workMap = {};

    byAssignee.forEach((row) => {
      const key = row.assigneeId || "none";

      workMap[key] ||= {
        id: key,
        name: row.assigneeId
          ? names[row.assigneeId] || "Unknown"
          : "Unassigned",
        open: 0,
        done: 0,
      };

      if (row.status === "DONE") {
        workMap[key].done += row._count._all;
      } else {
        workMap[key].open += row._count._all;
      }
    });

    const workload = Object.values(
      workMap
    ).sort((a, b) => b.open - a.open);

    // -----------------------------------------
    // MY FOCUS
    // -----------------------------------------

    const myTasks = [...assignedTasks]
      .sort((a, b) => focusSort(a, b, today))
      .slice(0, 20);

    // -----------------------------------------
    // WEEKLY PRODUCTIVITY
    // -----------------------------------------

    const weeklyProductivity = Array.from(
      { length: 7 },
      (_, index) => {
        const day = new Date(
          weekStart.getTime() +
            index * DAY_MS
        );

        return {
          date: day.toISOString().slice(0, 10),
          day: day.toLocaleDateString(
            "en-US",
            {
              weekday: "short",
              timeZone: "UTC",
            }
          ),
          completed: 0,
        };
      }
    );

    const dayMap = new Map(
      weeklyProductivity.map((day) => [
        day.date,
        day,
      ])
    );

    completedThisWeek.forEach((task) => {
      if (!task.completedAt) return;

      const key = new Date(
        task.completedAt
      ).toISOString().slice(0, 10);

      const day = dayMap.get(key);

      if (day) {
        day.completed += 1;
      }
    });

    // -----------------------------------------
    // UPCOMING DEADLINES
    // -----------------------------------------

    const upcomingDeadlines = [
      ...deadlineTasks,
    ]
      .sort((a, b) => {
        const dateDiff =
          new Date(a.dueDate).getTime() -
          new Date(b.dueDate).getTime();

        return (
          dateDiff ||
          (priorityRank[a.priority] ?? 3) -
            (priorityRank[b.priority] ?? 3)
        );
      })
      .slice(0, 12);

    // -----------------------------------------
    // API RESPONSE
    // -----------------------------------------

    res.json({
      // Existing dashboard fields
      total,
      overdue,
      completion: pct(
        status.DONE,
        total
      ),
      status,
      priority,
      projects: projectStats,
      workload,
      myTasks,

      // New dashboard fields
      weeklyProductivity,
      upcomingDeadlines,
      recentActivities,
    });
  } catch (err) {
    console.error(
      "Dashboard error:",
      err
    );

    res.status(500).json({
      error: "Could not load dashboard",
    });
  }
});

module.exports = router;
