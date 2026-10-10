import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();

  const load = () =>
    api
      .get("/notifications")
      .then((r) => {
        setItems(r.data.items);
        setUnread(r.data.unread);
      })
      .catch(() => {});

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000); // check every 10 seconds
    return () => clearInterval(timer);
  }, []);

  const open = async (n) => {
    if (!n.read) await api.patch(`/notifications/${n.id}/read`).catch(() => {});
    if (n.projectId) navigate(`/projects/${n.projectId}`);
    else load();
  };

  const markAll = async () => {
    await api.patch("/notifications/read-all").catch(() => {});
    load();
  };

  if (items.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">
          Notifications{" "}
          {unread > 0 && (
            <span className="ml-1 text-xs bg-red-600 text-white rounded-full px-2 py-0.5">
              {unread} new
            </span>
          )}
        </h2>
        {unread > 0 && (
          <button onClick={markAll} className="text-sm text-blue-600 hover:underline">
            Mark all as read
          </button>
        )}
      </div>
      <div className="space-y-2">
        {items.slice(0, 5).map((n) => (
          <button
            key={n.id}
            onClick={() => open(n)}
            className={`w-full text-left rounded-lg p-3 shadow-sm border ${
              n.read ? "bg-white text-gray-500" : "bg-blue-50 border-blue-200"
            }`}
          >
            <p className={n.read ? "" : "font-medium"}>{n.message}</p>
            <p className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</p>
          </button>
        ))}
      </div>
    </section>
  );
}