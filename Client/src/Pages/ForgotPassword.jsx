import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setDone(true);
    } catch {
      setError("Cannot reach the server. Is it running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1">Forgot password</h1>

        {done ? (
          <>
            <p className="text-gray-600 my-4">
              If that email has an account, a reset link was created.
            </p>
            <p className="text-sm bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
              <b>Development mode:</b> copy the link from the terminal where your server
              is running (it starts with 🔑) and open it in the browser.
            </p>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="text-gray-500 mb-6">Enter your email to get a reset link.</p>
            {error && <p className="bg-red-50 text-red-600 text-sm rounded p-2 mb-3">{error}</p>}
            <input
              className="w-full border rounded-lg px-3 py-2 mb-3"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Please wait..." : "Send reset link"}
            </button>
          </form>
        )}

        <p className="text-sm text-center mt-4">
          <Link className="text-blue-600" to="/login">← Back to log in</Link>
        </p>
      </div>
    </div>
  );
}