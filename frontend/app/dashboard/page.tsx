"use client";

import { useEffect, useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface Sender {
  id: string;
  email: string;
  displayName?: string | null;
  active: boolean;
}

interface EmailJob {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  scheduledAt: string;
  sentAt?: string | null;
  sender?: {
    email: string;
    displayName?: string | null;
  };
}

interface SlackConnection {
  teamId: string;
  teamName?: string | null;
  webhookConnected: boolean;
}

type CampaignTab = "scheduled" | "sent";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [scheduledEmails, setScheduledEmails] = useState<EmailJob[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailJob[]>([]);

  const [activeTab, setActiveTab] =
    useState<CampaignTab>("scheduled");

  const [slackConnection, setSlackConnection] =
    useState<SlackConnection | null>(null);

  const [loading, setLoading] = useState(true);
  const [senderLoading, setSenderLoading] = useState(true);
  const [senderCreating, setSenderCreating] = useState(false);
  const [slackLoading, setSlackLoading] = useState(true);

  const [error, setError] = useState("");
  const [senderError, setSenderError] = useState("");
  const [slackError, setSlackError] = useState("");
  const [slackMessage, setSlackMessage] = useState("");

  const [senderEmail, setSenderEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [
          userResponse,
          senderResponse,
          scheduledResponse,
          sentResponse,
          slackResponse,
        ] = await Promise.all([
          fetch(`${API_URL}/api/auth/me`, {
            credentials: "include",
          }),

          fetch(`${API_URL}/api/senders`, {
            credentials: "include",
          }),

          fetch(`${API_URL}/api/emails/scheduled`, {
            credentials: "include",
          }),

          fetch(`${API_URL}/api/emails/sent`, {
            credentials: "include",
          }),

          fetch(`${API_URL}/api/slack/connection`, {
            credentials: "include",
          }),
        ]);

        if (!userResponse.ok) {
          throw new Error("Unable to load user");
        }

        if (!senderResponse.ok) {
          throw new Error("Unable to load senders");
        }

        if (!scheduledResponse.ok) {
          throw new Error("Unable to load scheduled emails");
        }

        if (!sentResponse.ok) {
          throw new Error("Unable to load sent emails");
        }

        const userData = await userResponse.json();
        const senderData = await senderResponse.json();
        const scheduledData =
          await scheduledResponse.json();
        const sentData = await sentResponse.json();

        setUser(userData.data);
        setSenders(senderData.data);
        setScheduledEmails(scheduledData.data);
        setSentEmails(sentData.data);

        if (slackResponse.ok) {
          const slackData = await slackResponse.json();

          if (slackData.connected) {
            setSlackConnection(slackData.data);
          } else {
            setSlackConnection(null);
          }
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong"
        );
      } finally {
        setLoading(false);
        setSenderLoading(false);
        setSlackLoading(false);
      }
    };

    loadDashboard();

    const params = new URLSearchParams(window.location.search);
    const slackStatus = params.get("slack");

    if (slackStatus === "connected") {
      setSlackMessage(
        "Slack connected successfully."
      );
    } else if (slackStatus === "failed") {
      setSlackError(
        "Slack connection failed. Please try again."
      );
    } else if (slackStatus === "cancelled") {
      setSlackMessage(
        "Slack connection was cancelled."
      );
    }

    if (slackStatus) {
      window.history.replaceState(
        {},
        document.title,
        "/dashboard"
      );
    }
  }, []);

  const handleCreateSender = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setSenderError("");

    if (!senderEmail.trim()) {
      setSenderError("Sender email is required");
      return;
    }

    try {
      setSenderCreating(true);

      const response = await fetch(
        `${API_URL}/api/senders`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: senderEmail.trim(),
            displayName:
              displayName.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to create sender"
        );
      }

      setSenders((current) => [
        ...current,
        data.data,
      ]);

      setSenderEmail("");
      setDisplayName("");
    } catch (err) {
      setSenderError(
        err instanceof Error
          ? err.message
          : "Failed to create sender"
      );
    } finally {
      setSenderCreating(false);
    }
  };

  const handleConnectSlack = () => {
    setSlackError("");
    setSlackMessage("");

    window.location.href =
      `${API_URL}/api/slack/connect`;
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      window.location.href = "/";
    } catch {
      setError("Logout failed");
    }
  };

  const handleCompose = () => {
    window.location.href = "/compose";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "Invalid date";
    }

    return date.toLocaleString();
  };

  const activeEmails =
    activeTab === "scheduled"
      ? scheduledEmails
      : sentEmails;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">
          Loading dashboard...
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="rounded-xl bg-white p-8 text-center shadow">
          <h1 className="text-xl font-semibold text-gray-900">
            Unable to load dashboard
          </h1>

          <p className="mt-2 text-sm text-red-500">
            {error}
          </p>

          <button
            onClick={() => {
              window.location.href = "/";
            }}
            className="mt-6 rounded-lg bg-black px-5 py-2 text-sm font-medium text-white"
          >
            Back to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              ReachInbox
            </h1>

            <p className="text-sm text-gray-500">
              Email Scheduler
            </p>
          </div>

          <div className="flex items-center gap-4">
            {user?.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-10 w-10 rounded-full"
              />
            )}

            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-gray-900">
                {user?.name}
              </p>

              <p className="text-xs text-gray-500">
                {user?.email}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Page Heading */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Dashboard
          </h2>

          <p className="mt-1 text-gray-500">
            Manage your email campaigns and scheduled messages.
          </p>
        </div>

        {/* Slack Integration */}
        <div className="mb-8 rounded-xl bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Slack Notifications
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Connect Slack to receive notifications when a sender
                reaches its hourly email limit.
              </p>

              {slackLoading ? (
                <p className="mt-4 text-sm text-gray-500">
                  Checking Slack connection...
                </p>
              ) : slackConnection ? (
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500" />

                    <span className="text-sm font-medium text-green-700">
                      Slack connected
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-gray-600">
                    Workspace:{" "}
                    <span className="font-medium text-gray-900">
                      {slackConnection.teamName ||
                        slackConnection.teamId}
                    </span>
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Webhook:{" "}
                    {slackConnection.webhookConnected
                      ? "Connected"
                      : "Not available"}
                  </p>
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />

                  <span className="text-sm text-gray-600">
                    Slack not connected
                  </span>
                </div>
              )}

              {slackMessage && (
                <p className="mt-3 text-sm text-green-600">
                  {slackMessage}
                </p>
              )}

              {slackError && (
                <p className="mt-3 text-sm text-red-500">
                  {slackError}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleConnectSlack}
              className="shrink-0 rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
            >
              {slackConnection
                ? "Reconnect Slack"
                : "Connect Slack"}
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Scheduled */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Scheduled
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {scheduledEmails.length}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Emails waiting to be sent
            </p>
          </div>

          {/* Sent */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Sent
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {sentEmails.length}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Successfully sent emails
            </p>
          </div>

          {/* Senders */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Senders
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {senders.length}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Active sender accounts
            </p>
          </div>
        </div>

        {/* Email Senders */}
        <div className="mt-8 rounded-xl bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Email Senders
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Add the sender addresses you want to use for campaigns.
            </p>
          </div>

          <form
            onSubmit={handleCreateSender}
            className="grid gap-4 md:grid-cols-[1fr_1fr_auto]"
          >
            <input
              type="email"
              placeholder="Sender email"
              value={senderEmail}
              onChange={(event) =>
                setSenderEmail(event.target.value)
              }
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-black"
            />

            <input
              type="text"
              placeholder="Display name (optional)"
              value={displayName}
              onChange={(event) =>
                setDisplayName(event.target.value)
              }
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-black"
            />

            <button
              type="submit"
              disabled={senderCreating}
              className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {senderCreating
                ? "Adding..."
                : "Add Sender"}
            </button>
          </form>

          {senderError && (
            <p className="mt-3 text-sm text-red-500">
              {senderError}
            </p>
          )}

          {/* Sender List */}
          <div className="mt-6">
            {senderLoading ? (
              <p className="text-sm text-gray-500">
                Loading senders...
              </p>
            ) : senders.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                <p className="text-sm text-gray-500">
                  No senders added yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {senders.map((sender) => (
                  <div
                    key={sender.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {sender.displayName ||
                          sender.email}
                      </p>

                      {sender.displayName && (
                        <p className="text-sm text-gray-500">
                          {sender.email}
                        </p>
                      )}
                    </div>

                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Email Campaigns */}
        <div className="mt-8 rounded-xl bg-white p-8 shadow-sm">
          {/* Campaign Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Email Campaigns
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                View your scheduled and sent emails.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCompose}
              className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              Compose Email
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-8 border-b border-gray-200">
            <div className="flex gap-6">
              <button
                type="button"
                onClick={() =>
                  setActiveTab("scheduled")
                }
                className={`border-b-2 pb-3 text-sm font-medium transition ${
                  activeTab === "scheduled"
                    ? "border-black text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                Scheduled

                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                  {scheduledEmails.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveTab("sent")
                }
                className={`border-b-2 pb-3 text-sm font-medium transition ${
                  activeTab === "sent"
                    ? "border-black text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                Sent

                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                  {sentEmails.length}
                </span>
              </button>
            </div>
          </div>

          {/* Email List */}
          <div className="mt-6">
            {activeEmails.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
                <p className="font-medium text-gray-700">
                  No{" "}
                  {activeTab === "scheduled"
                    ? "scheduled"
                    : "sent"}{" "}
                  emails
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {activeTab === "scheduled"
                    ? "Emails you schedule will appear here."
                    : "Emails that are successfully sent will appear here."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full min-w-[750px] text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Recipient
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Subject
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Sender
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {activeTab === "scheduled"
                          ? "Scheduled At"
                          : "Sent At"}
                      </th>

                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 bg-white">
                    {activeEmails.map((email) => (
                      <tr
                        key={email.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-gray-900">
                            {email.recipient}
                          </p>
                        </td>

                        <td className="max-w-xs px-5 py-4">
                          <p className="truncate text-sm text-gray-700">
                            {email.subject}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm text-gray-700">
                            {email.sender?.displayName ||
                              email.sender?.email ||
                              "—"}
                          </p>

                          {email.sender?.displayName && (
                            <p className="text-xs text-gray-400">
                              {email.sender.email}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="whitespace-nowrap text-sm text-gray-600">
                            {formatDate(
                              activeTab === "scheduled"
                                ? email.scheduledAt
                                : email.sentAt ||
                                  email.scheduledAt
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                              email.status === "SENT"
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {email.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}