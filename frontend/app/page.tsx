"use client";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function Home() {
  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            ReachInbox
          </h1>

          <p className="mt-2 text-gray-500">
            Email Scheduler
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <span className="text-lg font-bold">G</span>
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-gray-400">
          Sign in to manage your scheduled emails.
        </p>
      </div>
    </main>
  );
}