"use client";

import { useEffect, useState } from "react";

interface Sender {
  id: string;
  email: string;
  displayName?: string | null;
  active: boolean;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

export default function ComposePage() {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [senderId, setSenderId] = useState("");

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientsText, setRecipientsText] =
    useState("");

  const [startTime, setStartTime] = useState("");
  const [delaySeconds, setDelaySeconds] =
    useState("0");
  const [hourlyLimit, setHourlyLimit] =
    useState("100");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [csvFileName, setCsvFileName] =
    useState("");

  useEffect(() => {
    const loadSenders = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/senders`,
          {
            credentials: "include",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Failed to load senders"
          );
        }

        setSenders(data.data);

        if (data.data.length > 0) {
          setSenderId(data.data[0].id);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load senders"
        );
      } finally {
        setLoading(false);
      }
    };

    loadSenders();
  }, []);

  const parsedRecipients = recipientsText
    .split(/[\n,;]+/)
    .map((email) => email.trim())
    .filter(Boolean);

  const uniqueRecipients = Array.from(
    new Set(
      parsedRecipients.map((email) =>
        email.toLowerCase()
      )
    )
  );

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setError("");

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const fileName = file.name.toLowerCase();

    if (
      !fileName.endsWith(".csv") &&
      !fileName.endsWith(".txt")
    ) {
      setError(
        "Please select a CSV or TXT file."
      );

      event.target.value = "";
      return;
    }

    try {
      const text = await file.text();

      /*
       * Extract email addresses from CSV/TXT files.
       *
       * Supports:
       * - one email per line
       * - comma-separated emails
       * - semicolon-separated emails
       * - CSV files containing other columns
       * - TXT files containing surrounding text
       */
      const emails =
        text.match(
          /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
        ) || [];

      const existingEmails =
        uniqueRecipients;

      const combinedEmails = Array.from(
        new Set([
          ...existingEmails,
          ...emails.map((email) =>
            email.trim().toLowerCase()
          ),
        ])
      );

      setRecipientsText(
        combinedEmails.join("\n")
      );

      setCsvFileName(file.name);

      if (emails.length === 0) {
        setError(
          "No valid email addresses were found in the file."
        );
      }
    } catch {
      setError(
        "Failed to read the selected file."
      );
    }

    event.target.value = "";
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!senderId) {
      setError("Please select a sender");
      return;
    }

    if (!subject.trim()) {
      setError("Subject is required");
      return;
    }

    if (!body.trim()) {
      setError("Email body is required");
      return;
    }

    if (uniqueRecipients.length === 0) {
      setError(
        "Please enter at least one recipient"
      );
      return;
    }

    if (!startTime) {
      setError("Start time is required");
      return;
    }

    if (Number.isNaN(Date.parse(startTime))) {
      setError("Please enter a valid start time");
      return;
    }

    if (Number(delaySeconds) < 0) {
      setError(
        "Delay cannot be negative"
      );
      return;
    }

    if (Number(hourlyLimit) <= 0) {
      setError(
        "Hourly limit must be greater than 0"
      );
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        `${API_URL}/api/emails/schedule`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            senderId,

            subject: subject.trim(),

            body: body.trim(),

            recipients:
              uniqueRecipients.map(
                (email) => ({
                  email,
                })
              ),

            startTime: new Date(
              startTime
            ).toISOString(),

            delaySeconds:
              Number(delaySeconds),

            hourlyLimit:
              Number(hourlyLimit),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to schedule email campaign"
        );
      }

      setSuccess(
        `Campaign scheduled successfully for ${
          uniqueRecipients.length
        } recipient${
          uniqueRecipients.length === 1
            ? ""
            : "s"
        }.`
      );

      setSubject("");
      setBody("");
      setRecipientsText("");
      setCsvFileName("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to schedule campaign"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">
          Loading compose page...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              ReachInbox
            </h1>

            <p className="text-sm text-gray-500">
              Compose Email
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.href =
                "/dashboard";
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          {/* Title */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Compose Campaign
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Configure your recipients, message
              and sending schedule.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
              {success}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Sender */}
            <div>
              <label
                htmlFor="sender"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Sender
              </label>

              {senders.length === 0 ? (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                  No active senders available.
                  Please add a sender from the
                  dashboard first.
                </div>
              ) : (
                <select
                  id="sender"
                  value={senderId}
                  onChange={(event) =>
                    setSenderId(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-black"
                >
                  {senders.map((sender) => (
                    <option
                      key={sender.id}
                      value={sender.id}
                    >
                      {sender.displayName
                        ? `${sender.displayName} <${sender.email}>`
                        : sender.email}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Recipients */}
            <div>
              <label
                htmlFor="recipients"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Recipients
              </label>

              <textarea
                id="recipients"
                value={recipientsText}
                onChange={(event) =>
                  setRecipientsText(
                    event.target.value
                  )
                }
                placeholder={`Enter email addresses separated by commas or new lines

Example:
alice@example.com
bob@example.com
charlie@example.com`}
                rows={7}
                className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-black"
              />

              {/* File Upload */}
              <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Upload recipient file
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Upload a CSV or TXT file
                      containing email addresses.
                    </p>
                  </div>

                  <label
                    htmlFor="recipientFile"
                    className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Choose File
                  </label>

                  <input
                    id="recipientFile"
                    type="file"
                    accept=".csv,.txt,text/csv,text/plain"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {csvFileName && (
                  <div className="mt-3 rounded-md bg-white px-3 py-2 text-sm text-gray-700">
                    Uploaded:{" "}
                    <span className="font-medium text-gray-900">
                      {csvFileName}
                    </span>
                  </div>
                )}
              </div>

              {/* Detected Count */}
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Detected recipients
                </p>

                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-900">
                  {uniqueRecipients.length}
                </span>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label
                htmlFor="subject"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Subject
              </label>

              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(event) =>
                  setSubject(
                    event.target.value
                  )
                }
                placeholder="Enter email subject"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-black"
              />
            </div>

            {/* Body */}
            <div>
              <label
                htmlFor="body"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Email Body
              </label>

              <textarea
                id="body"
                value={body}
                onChange={(event) =>
                  setBody(event.target.value)
                }
                placeholder="Write your email message..."
                rows={10}
                className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-black"
              />
            </div>

            {/* Scheduling */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
              <h3 className="mb-4 text-base font-semibold text-gray-900">
                Scheduling
              </h3>

              <div className="grid gap-5 md:grid-cols-3">
                {/* Start Time */}
                <div>
                  <label
                    htmlFor="startTime"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Start Time
                  </label>

                  <input
                    id="startTime"
                    type="datetime-local"
                    value={startTime}
                    onChange={(event) =>
                      setStartTime(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-black"
                  />
                </div>

                {/* Delay */}
                <div>
                  <label
                    htmlFor="delay"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Delay Between Emails
                    (seconds)
                  </label>

                  <input
                    id="delay"
                    type="number"
                    min="0"
                    value={delaySeconds}
                    onChange={(event) =>
                      setDelaySeconds(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-black"
                  />
                </div>

                {/* Hourly Limit */}
                <div>
                  <label
                    htmlFor="hourlyLimit"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Hourly Limit
                  </label>

                  <input
                    id="hourlyLimit"
                    type="number"
                    min="1"
                    value={hourlyLimit}
                    onChange={(event) =>
                      setHourlyLimit(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-black"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={
                  submitting ||
                  senders.length === 0
                }
                className="rounded-lg bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? "Scheduling..."
                  : "Schedule Campaign"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}