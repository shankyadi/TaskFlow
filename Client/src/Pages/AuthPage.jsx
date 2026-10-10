import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../Context/useAuth";

export default function AuthPage({ mode }) {
  const isLogin = mode === "login";
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate("/");
    } catch (err) {
      const data = err.response?.data?.error;
      if (typeof data === "string") {
        setError(data);
      } else if (data?.fieldErrors) {
        setError(
          Object.entries(data.fieldErrors)
            .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
            .join(" | ")
        );
      } else if (err.response) {
        setError(`Server error (${err.response.status})`);
      } else {
        setError("Cannot reach the server. Is it running?");
      }
    } finally {
      setLoading(false);
    }
  };

  const input = "w-full border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white p-8 rounded-xl shadow w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1">TaskFlow</h1>
        <p className="text-gray-500 mb-6">{isLogin ? "Log in to continue" : "Create your account"}</p>

        {error && <p className="bg-red-50 text-red-600 text-sm rounded p-2 mb-3">{error}</p>}

        {!isLogin && (
          <input className={input} name="name" placeholder="Name" value={form.name} onChange={change} required />
        )}
        <input className={input} name="email" type="email" placeholder="Email" value={form.email} onChange={change} required />
        <input className={input} name="password" type="password" placeholder="Password" value={form.password} onChange={change} required />
                {isLogin && (
          <p className="text-right text-sm mb-3">
            <Link className="text-blue-600" to="/forgot-password">Forgot password?</Link>
          </p>
        )}

        <button disabled={loading} className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Please wait..." : isLogin ? "Log in" : "Sign up"}
        </button>

        <p className="text-sm text-gray-500 mt-4 text-center">
          {isLogin ? "No account? " : "Already have an account? "}
          <Link className="text-blue-600" to={isLogin ? "/register" : "/login"}>
            {isLogin ? "Sign up" : "Log in"}
          </Link>
        </p>
      </form>
    </div>
  );
}