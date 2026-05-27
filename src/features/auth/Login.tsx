import React, { useState } from "react";
import { Github, AlertCircle } from "lucide-react";

interface LoginProps {
  onBack: () => void;
}

export default function Login({ onBack }: LoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGitHubLogin = () => {
    setIsLoading(true);
    setError(null);
    window.location.href = "/api/v1/auth/github";
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <button
          onClick={onBack}
          className="mb-8 text-slate-400 hover:text-white transition flex items-center gap-2"
        >
          <span>←</span> Back
        </button>

        <h1 className="text-3xl font-bold mb-2">Login to Grader</h1>
        <p className="text-slate-400 mb-8">Access your codebase reports and insights</p>

        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-400 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <p className="font-medium text-red-300">Login Failed</p>
              <p className="text-sm text-slate-300 mt-1">{error}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleGitHubLogin}
          disabled={isLoading}
          className={`w-full bg-white text-slate-900 py-3 px-6 rounded-lg font-medium flex items-center justify-center gap-2 transition ${isLoading ? "opacity-70 cursor-not-allowed" : "hover:bg-slate-200"}`}
        >
          {isLoading ? (
            <span className="animate-spin">↻</span>
          ) : (
            <>
              <Github size={18} />
              Continue with GitHub
            </>
          )}
        </button>

        <p className="mt-6 text-sm text-slate-400 text-center">
          By continuing, you agree to our <a href="#" className="text-yellow-400 hover:underline">Terms of Service</a> and <a href="#" className="text-yellow-400 hover:underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}