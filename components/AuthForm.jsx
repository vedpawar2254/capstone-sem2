"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AuthForm({ type }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (type === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options:{
            emailRedirectTo:"https://capstone-sem2-lyart.vercel.app/auth/callback"
          }
        });
        if (error) throw error;
        alert("Signup successful! Please check your email for confirmation.");
        router.push("/login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <h2 className="text-3xl font-bold text-white">
              {type === "signup" ? "Create Account" : "Welcome Back"}
            </h2>
          </div>
          
          {error && (
            <div className="mb-6 p-3 bg-red-900/50 text-red-100 rounded-lg border border-red-700/50">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white transition ${
                loading
                  ? "bg-gray-600 cursor-not-allowed"
                  : type === "signup"
                  ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                  : "bg-green-600 hover:bg-green-700 focus:ring-green-500"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : type === "signup" ? (
                "Sign Up"
              ) : (
                "Login"
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            {type === "signup" ? (
              <p>
                Already have an account?{" "}
                <a href="/login" className="font-medium text-blue-400 hover:text-blue-300 transition">
                  Login here
                </a>
              </p>
            ) : (
              <p>
                Don't have an account?{" "}
                <a href="/signup" className="font-medium text-blue-400 hover:text-blue-300 transition">
                  Sign up here
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}