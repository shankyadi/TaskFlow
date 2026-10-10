import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) return setError("Passwords do not match");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Cannot reach the server. Is it running?");
    } finally {
      setLoading(false);
    }
  };

  const input = "w-full border rounded-lg px-3 py-2 mb-3";

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white p-8 rounded-xl shadow w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1">Set a new password</h1>
        <p className="text-gray-500 mb-6">At least 8 characters.</p>

        {error && <p className="bg-red-50 text-red-600 text-sm rounded p-2 mb-3">{error}</p>}
        {success && (
          <p className="bg-green-50 text-green-700 text-sm rounded p-2 mb-3">
            Password updated. Taking you to log in...
          </p>
        )}

        <input className={input} type="password" placeholder="New password"
               value={password} onChange={(e) => setPassword(e.target.value)} required />
        <input className={input} type="password" placeholder="Confirm new password"
               value={confirm} onChange={(e) => setConfirm(e.target.value)} required />

        <button
          disabled={loading || success}
          className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Please wait..." : "Update password"}
        </button>

        <p className="text-sm text-center mt-4">
          <Link className="text-blue-600" to="/login">← Back to log in</Link>
        </p>
      </form>
    </div>
  );
}