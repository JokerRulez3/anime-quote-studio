// src/components/auth/AuthModal.tsx
import React, { FormEvent } from "react";
import { Loader } from "lucide-react";

interface AuthModalProps {
  mode: "signin" | "signup";
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  onSubmit: (email: string, password: string, isSignUp: boolean) => void;
  onSwitch: () => void;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  mode,
  isOpen,
  isLoading,
  error,
  onSubmit,
  onSwitch,
  onClose,
}) => {
  if (!isOpen) return null;
  const isSignUp = mode === "signup";

  function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget as any;
    onSubmit(form.email.value, form.password.value, isSignUp);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4">
      <div className="bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl p-7 max-w-md w-full">
        <h2 className="text-2xl font-semibold text-slate-50 text-center mb-5">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h2>
        {error && (
          <div className="bg-red-900/40 border border-red-500 text-red-200 px-4 py-2 rounded-lg mb-3 text-xs">
            {error}
          </div>
        )}
        <form onSubmit={handle}>
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="w-full px-4 py-3 mb-3 bg-slate-950 border border-slate-700 rounded-lg text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Password"
            className="w-full px-4 py-3 mb-4 bg-slate-950 border border-slate-700 rounded-lg text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-500 hover:bg-indigo-400 transition-colors text-slate-950 py-3 rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader size={16} className="animate-spin" />}
            {isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>
        <button
          onClick={onSwitch}
          className="w-full mt-3 text-indigo-400 text-xs"
        >
          {isSignUp
            ? "Already have an account? Sign in"
            : "Need an account? Sign up"}
        </button>
        <button
          onClick={onClose}
          className="w-full mt-2 text-slate-500 text-[10px]"
        >
          ← Back
        </button>
      </div>
    </div>
  );
};
