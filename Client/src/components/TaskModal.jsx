
import { useCallback, useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../Context/useAuth";

const time = (date) => new Date(date).toLocaleString();

const dueText = (date) =>
  new Date(date).toLocaleDateString(undefined, {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function TaskModal({
  taskId,
  isManager,
  onClose,
  onChanged,
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [task, setTask] = useState(null);
  const [users, setUsers] = useState([]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [dateDraft, setDateDraft] = useState("");
  const [showActivity, setShowActivity] = useState(false);

  // Reload task details after changes.
  const load = useCallback(async () => {
    const response = await api.get(`/tasks/${taskId}`);

    setTask(response.data);
    setDateDraft(
      response.data.dueDate
        ? response.data.dueDate.slice(0, 10)
        : ""
    );

    return response.data;
  }, [taskId]);

  // Fetch the task and available users when the modal opens.
  useEffect(() => {
    let cancelled = false;

    const fetchDetails = async () => {
      try {
        const response = await api.get(`/tasks/${taskId}`);

        if (!cancelled) {
          setTask(response.data);
          setDateDraft(
            response.data.dueDate
              ? response.data.dueDate.slice(0, 10)
              : ""
          );
          setError("");
        }
      } catch {
        if (!cancelled) {
          setError("Could not load task");
        }
      }
    };

    const fetchUsers = async () => {
      try {
        const response = await api.get("/users");

        if (!cancelled) {
          setUsers(response.data);
        }
      } catch {
        // Keep the task modal usable if users cannot load.
      }
    };

    void fetchDetails();
    void fetchUsers();

    return () => {
      cancelled = true;
    };
  }, [taskId]);

  // Managers can reassign any task.
  // An assigned user can hand their own task to someone else.
  const canReassign =
    task &&
    (isManager || task.assigneeId === user?.id);

  // Update task fields.
  const update = async (changes, fallback) => {
    setError("");

    try {
      await api.patch(`/tasks/${taskId}`, changes);
      await load();
      onChanged();
    } catch (err) {
      setError(
        err.response?.data?.error || fallback
      );
    }
  };

  const assign = (e) => {
    void update(
      {
        assigneeId: e.target.value || null,
      },
      "Could not assign task"
    );
  };

  const savedDate = task?.dueDate
    ? task.dueDate.slice(0, 10)
    : "";

  const dateChanged = dateDraft !== savedDate;

  const saveDate = () => {
    void update(
      {
        dueDate: dateDraft || null,
      },
      "Could not change due date"
    );
  };

  // Add a comment.
  const addComment = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api.post(`/tasks/${taskId}/comments`, {
        body: comment,
      });

      setComment("");
      await load();
      onChanged();
    } catch {
      setError("Could not add comment");
    }
  };

  // Only admins can delete comments.
  const deleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment?")) {
      return;
    }

    setError("");

    try {
      await api.delete(
        `/tasks/${taskId}/comments/${commentId}`
      );

      await load();
      onChanged();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Could not delete comment"
      );
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {!task ? (
          <p>{error || "Loading..."}</p>
        ) : (
          <>
            {/* Task Heading */}
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-xl font-bold">
                {task.title}
              </h2>

              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-black"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              {task.status.replace("_", " ")} ·{" "}
              {task.priority} priority
            </p>

            {task.description && (
              <p className="mb-4">
                {task.description}
              </p>
            )}

            {error && (
              <p className="text-red-600 text-sm mb-2">
                {error}
              </p>
            )}

            {/* Assignee */}
            <div className="mb-4">
              <label className="text-sm font-medium block mb-1">
                Assignee
              </label>

              {canReassign ? (
                <select
                  className="border rounded-lg px-3 py-2 w-full"
                  value={task.assigneeId || ""}
                  onChange={assign}
                >
                  <option value="">
                    Unassigned
                  </option>

                  {users.map((person) => (
                    <option
                      key={person.id}
                      value={person.id}
                    >
                      {person.name} ({person.role})
                    </option>
                  ))}
                </select>
              ) : (
                <p>
                  {task.assignee
                    ? task.assignee.name
                    : "Unassigned"}
                </p>
              )}
            </div>

            {/* Due Date */}
            <div className="mb-5">
              <label className="text-sm font-medium block mb-1">
                Due date
              </label>

              {isManager ? (
                <div className="flex gap-2">
                  <input
                    type="date"
                    className="border rounded-lg px-3 py-2 flex-1"
                    value={dateDraft}
                    onChange={(e) =>
                      setDateDraft(e.target.value)
                    }
                  />

                  <button
                    type="button"
                    onClick={saveDate}
                    disabled={!dateChanged}
                    className="bg-indigo-600 text-white rounded-lg px-4 hover:bg-indigo-700 disabled:opacity-40"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <p>
                  {task.dueDate
                    ? dueText(task.dueDate)
                    : "No due date"}
                </p>
              )}
            </div>

            {/* Comments */}
            <h3 className="font-semibold mb-2">
              Comments ({task.comments.length})
            </h3>

            <div className="space-y-2 mb-3">
              {task.comments.length === 0 && (
                <p className="text-sm text-gray-400">
                  No comments yet.
                </p>
              )}

              {task.comments.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 rounded-lg p-2"
                >
                  <p className="text-sm">
                    {item.body}
                  </p>

                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-400">
                      {item.author.name} ·{" "}
                      {time(item.createdAt)}
                    </p>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          deleteComment(item.id)
                        }
                        className="text-xs text-red-500 hover:text-red-700 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Comment */}
            <form
              onSubmit={addComment}
              className="flex gap-2 mb-5"
            >
              <input
                className="flex-1 border rounded-lg px-3 py-2"
                placeholder="Write a comment"
                value={comment}
                onChange={(e) =>
                  setComment(e.target.value)
                }
                required
              />

              <button
                type="submit"
                className="bg-indigo-600 text-white rounded-lg px-4 hover:bg-indigo-700"
              >
                Send
              </button>
            </form>

            {/* Activity History */}
            <button
              type="button"
              onClick={() =>
                setShowActivity((previous) => !previous)
              }
              className="flex items-center justify-between w-full font-semibold mb-2 hover:text-indigo-600"
            >
              <span>
                Activity ({task.activities.length})
              </span>

              <span className="text-gray-400 text-sm">
                {showActivity
                  ? "Hide ▲"
                  : "Show ▼"}
              </span>
            </button>

            {showActivity && (
              <ul className="text-sm text-gray-600 space-y-1">
                {task.activities.length === 0 && (
                  <li className="text-gray-400">
                    No activity yet.
                  </li>
                )}

                {task.activities.map((activity) => (
                  <li key={activity.id}>
                    <b>{activity.user.name}</b>{" "}
                    {activity.action}{" "}
                    <span className="text-gray-400">
                      · {time(activity.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
