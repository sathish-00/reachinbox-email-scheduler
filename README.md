# ReachInbox Email Scheduler

A scalable, persistent email scheduling platform built for the ReachInbox Software Development Intern assignment.

The system allows users to authenticate with Google, configure senders, upload recipient lists, create email campaigns, schedule emails, control sending speed and hourly limits, monitor delivery status, receive Slack rate-limit notifications, and search email activity through Elasticsearch.

---

## ⭐ Key Highlights

- Persistent email scheduling using **BullMQ + Redis**
- **1,000+ email** bulk campaign scheduling
- Distributed **hourly rate limiting** using Redis
- Configurable **worker concurrency**
- Configurable **minimum delay between emails**
- **Google OAuth 2.0** authentication
- **Slack OAuth** integration and rate-limit notifications
- **Ethereal SMTP** email delivery using Nodemailer
- **Elasticsearch** indexing and search
- **Bull Board** live queue monitoring
- **Restart-safe** scheduled jobs
- Database-backed email state using **PostgreSQL + Prisma**
- Idempotent email processing to prevent duplicate sends
- CSV/TXT recipient upload and automatic email detection
- Scheduled and Sent email dashboard

---

# Architecture

The application uses PostgreSQL as the primary source of truth, Redis and BullMQ for persistent background scheduling, Elasticsearch for search, and dedicated workers for email delivery.

```text
┌───────────────────────┐
│       Next.js UI      │
│ React + TypeScript    │
│ Tailwind CSS          │
└───────────┬───────────┘
            │ REST API
            ▼
┌───────────────────────┐
│   Express Backend     │
│      TypeScript       │
│                       │
│ Auth | Emails | Slack │
│ Senders | Scheduling  │
└──────┬─────────┬──────┘
       │         │
       │         │
       ▼         ▼
┌───────────┐  ┌──────────────────────┐
│PostgreSQL │  │     Redis + BullMQ   │
│           │  │                      │
│ Users     │  │ Persistent Jobs      │
│ Senders   │  │ Delayed Scheduling   │
│ Batches   │  │ Rate Limiting        │
│ Jobs      │  │ Session Storage      │
└───────────┘  └──────────┬───────────┘
                          │
                          ▼
                ┌─────────────────────┐
                │    Email Worker     │
                │      BullMQ         │
                │                     │
                │ Configurable        │
                │ Concurrency         │
                └─────────┬───────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
        ┌──────────┐ ┌──────────┐ ┌──────────────┐
        │  Redis   │ │ Ethereal │ │Elasticsearch │
        │   Rate   │ │   SMTP   │ │   Index &    │
        │ Limiter  │ │Nodemailer│ │    Search    │
        └──────────┘ └──────────┘ └──────────────┘


        ┌─────────────────┐      ┌─────────────────┐
        │    Slack OAuth  │      │    Bull Board   │
        │                 │      │                 │
        │ Rate-limit      │      │ Queue Monitoring│
        │ Notifications   │      │ & Job Status    │
        └─────────────────┘      └─────────────────┘
              └─────────────────────┘
```

---

# Core Workflow

The complete email campaign flow is:

```text
Google Login
      ↓
Dashboard
      ↓
Select Sender
      ↓
Upload CSV/TXT or Enter Recipients
      ↓
Detect & Validate Emails
      ↓
Create Campaign
      ↓
Configure Start Time / Delay / Hourly Limit
      ↓
Store Campaign + Email Jobs in PostgreSQL
      ↓
Add Jobs to BullMQ
      ↓
BullMQ Delayed Scheduling
      ↓
Worker Picks Up Job
      ↓
Idempotency Check
      ↓
Redis Rate-Limit Check
      ↓
Reserve Sending Slot
      ↓
Apply Minimum Delay
      ↓
Send Through Ethereal SMTP
      ↓
Update PostgreSQL
      ↓
Update Elasticsearch
      ↓
Show SENT / FAILED Status
```

---

# Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Node.js, Express.js, TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Queue | BullMQ |
| Queue Storage | Redis |
| Email | Nodemailer + Ethereal SMTP |
| Search | Elasticsearch |
| Authentication | Google OAuth 2.0 |
| Notifications | Slack OAuth |
| Queue Monitoring | Bull Board |
| File Processing | Multer + CSV Parse |
| Infrastructure | Docker |

---

# Key Engineering Features

## 1. Persistent Scheduling

The application uses BullMQ delayed jobs instead of cron jobs or in-memory timers.

Each email receives its own scheduled execution time based on:

```text
scheduledAt = startTime + (recipientIndex × delay)
```

BullMQ stores delayed jobs in Redis, allowing scheduled jobs to survive application or worker restarts.

This avoids relying on:

```text
setTimeout()
setInterval()
cron
node-cron
Agenda
```

for persistent scheduling.

---

## 2. Distributed Hourly Rate Limiting

Hourly rate limiting is implemented using Redis and an atomic Lua script.

The rate limiter maintains shared state for each sender:

```text
Redis
 ├── Current hourly count
 ├── Sending slot
 └── Notification state
```

The Lua script atomically:

1. Checks the current hourly count.
2. Determines whether the hourly limit has been reached.
3. Reserves a sending slot.
4. Updates the sender's count.
5. Maintains the sending delay.
6. Prevents multiple workers from bypassing the limit.

Because the state is stored in Redis, multiple workers can coordinate against the same rate limit.

### Example

```text
Hourly Limit = 2

Email 1
   ↓
Allowed
   ↓
SENT

Email 2
   ↓
Allowed
   ↓
SENT

Email 3
   ↓
Limit reached
   ↓
Rescheduled
   ↓
BullMQ delayed job
   ↓
Next available window
   ↓
SENT
```

Jobs are not intentionally dropped when the hourly limit is reached.

---

## 3. Minimum Delay Between Emails

Each campaign supports a configurable delay between emails.

For example:

```text
Start Time:       10:00:00
Delay:            10 seconds

Email 1 → 10:00:00
Email 2 → 10:00:10
Email 3 → 10:00:20
Email 4 → 10:00:30
```

The worker also uses Redis-backed slot coordination so concurrent workers do not independently ignore the configured delay.

---

## 4. Configurable Worker Concurrency

Worker concurrency is configurable through:

```env
WORKER_CONCURRENCY="5"
```

The worker initializes BullMQ with the configured concurrency.

Example:

```text
Concurrency = 5

Job 1 ─┐
Job 2 ─┤
Job 3 ─┼──→ Worker
Job 4 ─┤
Job 5 ─┘
```

Additional workers can be started against the same BullMQ queue when more processing capacity is required.

---

## 5. Idempotent Email Processing

Before sending an email, the worker performs an atomic database state transition:

```text
SCHEDULED
    ↓
PROCESSING
    ↓
SENT
```

If another worker attempts to process the same email job after it has already been claimed, the job is skipped.

This protects against duplicate email sends caused by duplicate processing attempts.

---

## 6. Restart Safety

The system keeps scheduling information in PostgreSQL and BullMQ/Redis rather than process memory.

Example:

```text
Campaign Scheduled
       ↓
BullMQ Delayed Jobs
       ↓
Worker Stopped
       ↓
Worker Restarted
       ↓
BullMQ Restores Processing
       ↓
Email Sent
```

This allows scheduled jobs to continue processing after a worker restart.

---

## 7. Bulk Campaign Processing

The scheduler is designed to handle large recipient lists.

For a 1,000+ recipient campaign:

```text
1,000+ Recipients
       ↓
Recipient Validation
       ↓
PostgreSQL createMany()
       ↓
BullMQ addBulk()
       ↓
Elasticsearch Bulk Index
       ↓
Persistent Jobs
       ↓
Worker Processing
```

Bulk operations are used to reduce unnecessary database and queue round trips.

The application was tested with a 1,000-recipient campaign.

---

## 8. Slack Rate-Limit Notifications

Slack is integrated using OAuth.

When a sender reaches the configured hourly limit, the application can send a Slack notification.

The notification contains information such as:

```text
ReachInbox hourly email limit reached

Sender ID: <sender>
Hourly limit: <limit> emails
Reserved/sent in current window: <count>
Emails will resume around: <time>
```

A Redis alert key prevents repeated notifications for the same sender during the current rate-limit window.

### Graceful Slack Failure

If Slack is not connected:

```text
Rate Limit
    ↓
No Slack Connection
    ↓
Skip Notification
    ↓
Continue Email Workflow
```

If Slack notification delivery fails, the error is logged without causing the email job itself to be permanently failed.

Slack can also be reconnected without redeploying the application.

---

## 9. Elasticsearch

Email jobs are indexed in Elasticsearch using the `email_jobs` index.

Indexed information includes:

- Recipient
- Subject
- Body
- Status
- Sender ID
- Batch ID
- User ID
- Scheduled time
- Sent time
- Failed time
- Error
- Created time
- Updated time

### Indexing Flow

```text
Email Job Created
       ↓
PostgreSQL
       ↓
Elasticsearch Index
       ↓
Status Changes
       ↓
Elasticsearch Update
```

PostgreSQL remains the primary source of truth.

Elasticsearch provides searchable email-job data.

Search supports fields such as:

- Recipient
- Subject
- Body
- Status

Search results are scoped to the authenticated user.

---

## 10. BullMQ Dashboard

Bull Board provides a live monitoring interface for the email queue.

Dashboard:

```text
http://localhost:5000/admin/queues
```

The dashboard provides visibility into:

- Waiting jobs
- Active jobs
- Completed jobs
- Failed jobs
- Delayed jobs

Queue name:

```text
email-scheduler
```

This makes it easy to inspect scheduled and delayed jobs during development and demonstration.

---

# Application Flow

## Authentication

```text
User
 ↓
Google Login
 ↓
Google OAuth
 ↓
Backend Callback
 ↓
Create / Update User
 ↓
Redis Session
 ↓
Dashboard
```

The dashboard displays:

- Name
- Email
- Avatar
- Logout

---

## Compose Campaign

Users can create campaigns from the Compose page.

Campaign configuration includes:

- Sender
- Recipients
- Subject
- Body
- Start time
- Delay between emails
- Hourly limit

---

## Recipient Upload

The application supports:

```text
.csv
.txt
```

Email addresses are automatically detected from uploaded files.

The frontend:

1. Reads the uploaded file.
2. Extracts email addresses.
3. Removes duplicates.
4. Displays the detected recipient count.
5. Sends the cleaned recipient list to the backend.

Example:

```text
CSV/TXT
   ↓
Extract Emails
   ↓
Remove Duplicates
   ↓
Detected Count
   ↓
Schedule Campaign
```

---

# Dashboard

The dashboard provides an overview of email activity.

## User Information

The authenticated user can see:

- Name
- Email
- Avatar
- Logout

## Email Views

The dashboard contains:

### Scheduled

Displays emails that are waiting to be processed.

### Sent

Displays successfully delivered emails.

Email information includes:

- Recipient
- Subject
- Sender
- Scheduled time
- Sent time
- Status

## Sender Management

The dashboard displays configured email senders and their active status.

## Slack Status

The dashboard displays the current Slack connection state and provides connect/reconnect functionality.

## UI States

The frontend includes:

- Loading states
- Empty states
- Error states
- Success feedback

---

# Email Scheduling

When a campaign is submitted:

```text
Frontend
   ↓
Schedule API
   ↓
Validate Sender
   ↓
Create EmailBatch
   ↓
Create EmailJobs
   ↓
Add BullMQ Jobs
   ↓
Index Elasticsearch
   ↓
Return Campaign
```

Each recipient becomes an individual `EmailJob`.

Each job contains:

```text
jobId
recipient
subject
body
senderId
batchId
scheduledAt
```

---

# Email Status Lifecycle

```text
SCHEDULED
    │
    ▼
PROCESSING
    │
    ├───────────────┐
    ▼               ▼
  SENT            FAILED
```

### SCHEDULED

The email is waiting for its scheduled execution time.

### PROCESSING

The worker has claimed the email for processing.

### SENT

The email was successfully delivered through Ethereal SMTP.

### FAILED

The email could not be delivered and the error is stored.

---

# Ethereal SMTP

The application uses Nodemailer with Ethereal SMTP for development and testing.

When an email is successfully sent, Ethereal provides a preview URL.

The worker logs the preview URL:

```text
Ethereal preview: <preview-url>
```

This allows the email content to be inspected without sending real production emails.

---

# Database Design

PostgreSQL is the primary source of truth.

Main models:

```text
User
 │
 ├── Sender
 │
 ├── EmailBatch
 │       │
 │       └── EmailJob
 │
 └── SlackConnection
```

## User

Stores Google-authenticated user information.

## Sender

Stores configured email senders.

## EmailBatch

Represents a campaign containing multiple email jobs.

Stores:

- Subject
- Body
- Start time
- Delay
- Hourly limit
- User
- Sender

## EmailJob

Represents an individual email.

Stores:

- Recipient
- Subject
- Body
- Scheduled time
- Status
- Sent time
- Failed time
- Error
- BullMQ job ID
- Batch
- Sender

## SlackConnection

Stores connected Slack workspace information for the authenticated user.

---

# Project Structure

```text
reachinbox-assignment/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── elasticsearch.ts
│   │   │   ├── env.ts
│   │   │   ├── passport.ts
│   │   │   ├── redis.ts
│   │   │   └── session-store.ts
│   │   │
│   │   ├── queues/
│   │   │   ├── email.queue.ts
│   │   │   └── email.worker.ts
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── email.routes.ts
│   │   │   ├── sender.routes.ts
│   │   │   └── slack.routes.ts
│   │   │
│   │   ├── services/
│   │   │   ├── elasticsearch.service.ts
│   │   │   ├── rate-limit.service.ts
│   │   │   ├── scheduler.service.ts
│   │   │   ├── slack-notification.service.ts
│   │   │   └── smtp.service.ts
│   │   │
│   │   ├── types/
│   │   │
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   ├── tests/
│   │   ├── scheduler.test.ts
│   │   ├── rate-limit.test.ts
│   │   └── idempotency.test.ts
│   │
│   ├── prisma/
│   │   └── schema.prisma
│   │
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── app/
│   │   ├── compose/
│   │   │   └── page.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   │
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   └── Button.tsx
│   │
│   ├── .env.local.example
│   └── package.json
│
├── docker-compose.yml
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```


# Infrastructure

The application uses Docker Compose for local infrastructure.

## Services

### PostgreSQL

```text
Port: 5432
Database: reachinbox
```

### Redis

```text
Port: 6379
```

### Elasticsearch

```text
Port: 9200
```

The infrastructure configuration is defined in:

```text
docker-compose.yml
```

---

# Prerequisites

Install the following:

- Node.js 20+
- npm
- Docker Desktop
- Git

Docker Desktop should be running before starting the infrastructure.

---

# Environment Variables

Create:

```text
backend/.env
```

Example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reachinbox"

REDIS_HOST="localhost"
REDIS_PORT="6379"

ELASTICSEARCH_URL="http://localhost:9200"

PORT="5000"
NODE_ENV="development"

GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:5000/api/auth/google/callback"

SESSION_SECRET="your-session-secret"

WORKER_CONCURRENCY="5"

SLACK_CLIENT_ID="your-slack-client-id"
SLACK_CLIENT_SECRET="your-slack-client-secret"
SLACK_REDIRECT_URI="http://localhost:5000/api/slack/callback"
```

Create:

```text
frontend/.env.local
```

Example:

```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
```

Never commit real credentials or secrets.

---

# Database Setup

From the backend directory:

```bash
cd backend
npm install
```

Generate Prisma Client:

```bash
npx prisma generate
```

Run migrations:

```bash
npx prisma migrate dev
```

Optional database inspection:

```bash
npx prisma studio
```

---

# Getting Started

## 1. Start Infrastructure

From the project root:

```bash
docker compose up -d
```

Verify:

```bash
docker compose ps
```

---

## 2. Start Backend

Open a terminal:

```bash
cd backend
npm install
npm run dev
```

Backend:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/health
```

---

## 3. Start Worker

Open another terminal:

```bash
cd backend
npm run worker
```

The worker should display:

```text
Email worker ready with concurrency: 5
```

---

## 4. Start Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:3000
```

---

# Local URLs

| Service | URL |
|---|---|
| Frontend | `http://localhost:3000` |
| Backend | `http://localhost:5000` |
| Health Check | `http://localhost:5000/health` |
| BullMQ Dashboard | `http://localhost:5000/admin/queues` |
| Elasticsearch | `http://localhost:9200` |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |

---

# Verification

The following scenarios were verified during development.

| Test | Result |
|---|---|
| Google OAuth login | ✅ Verified |
| Google logout | ✅ Verified |
| User profile display | ✅ Verified |
| CSV upload | ✅ Verified |
| TXT upload | ✅ Verified |
| Email detection | ✅ Verified |
| Duplicate recipient removal | ✅ Verified |
| Campaign scheduling | ✅ Verified |
| Ethereal email delivery | ✅ Verified |
| Scheduled/Sent dashboard | ✅ Verified |
| BullMQ worker | ✅ Verified |
| BullMQ Dashboard | ✅ Verified |
| Redis rate limiting | ✅ Tested |
| Slack rate-limit notification | ✅ Verified |
| Elasticsearch indexing | ✅ Verified |
| Worker restart persistence | ✅ Verified |
| 1,000-recipient campaign scheduling | ✅ Verified |
| Backend TypeScript build | ✅ Passed |
| Frontend production build | ✅ Passed |
| Docker infrastructure | ✅ Verified |

---

# Automated Tests

The backend includes Jest unit tests covering core scheduling, rate-limiting, and email job idempotency logic.

Run the test suite with:

```bash
cd backend
npm test

```

Test Suites: 3 passed, 3 total
Tests:       5 passed, 5 total


# Large Campaign Test

A 1,000-recipient campaign was used to verify the bulk scheduling path.

The application successfully:

```text
Detected 1,000 recipients
        ↓
Created campaign
        ↓
Created email jobs in PostgreSQL
        ↓
Added jobs to BullMQ
        ↓
Indexed jobs in Elasticsearch
        ↓
Displayed delayed jobs in Bull Board
```

The worker processes the campaign according to:

- Worker concurrency
- Minimum delay
- Hourly rate limit

The application does not attempt to send all 1,000 emails simultaneously.

---

# Restart Persistence Test

The restart flow was tested using scheduled jobs.

```text
Schedule Jobs
     ↓
BullMQ Delayed Jobs
     ↓
Stop Worker
     ↓
Start Worker Again
     ↓
BullMQ Reads Persisted Jobs
     ↓
Jobs Continue Processing
```

This verifies that scheduling state is not dependent on the worker process remaining alive.

---

# Security

## Secrets

Real secrets are stored in environment variables.

The repository excludes:

```text
.env
.env.local
.env.*.local
```

through `.gitignore`.

## OAuth

Google OAuth credentials are never hardcoded into application source code.

Slack OAuth credentials are also provided through environment variables.

## Sessions

Authentication sessions use Express Session with Redis-backed storage.

The session cookie is configured as HTTP-only.

## User Data Isolation

Users are associated with their own:

- Senders
- Campaigns
- Email jobs
- Slack connection

Elasticsearch searches are filtered by the authenticated user's ID.

## Email Job Safety

The worker uses an idempotency guard before sending an email to prevent an already claimed or processed job from being sent again.

---

# Scalability

The system is designed around horizontally scalable background processing.

## Bulk Database Operations

Large campaigns use:

```text
Prisma createMany()
```

instead of inserting every email job with a separate database request.

## Bulk Queue Operations

BullMQ uses:

```text
addBulk()
```

to efficiently add many jobs.

## Elasticsearch Bulk Indexing

New email jobs are indexed using Elasticsearch bulk operations.

## Multiple Workers

Multiple BullMQ workers can consume from the same Redis-backed queue.

```text
                Redis
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
     Worker 1  Worker 2  Worker 3
        │         │         │
        └─────────┼─────────┘
                  ▼
             SMTP Server
```

The shared Redis rate-limit state allows workers to coordinate sending limits.

---

# Design Decisions

## Why BullMQ?

BullMQ provides:

- Persistent jobs
- Delayed jobs
- Queue management
- Worker concurrency
- Retry infrastructure
- Redis-backed state

It is a better fit for persistent email scheduling than process-local timers.

---

## Why Redis?

Redis is used for:

- BullMQ queue storage
- Delayed job state
- Distributed rate limiting
- Session storage

Using Redis allows multiple workers to share scheduling and rate-limit state.

---

## Why PostgreSQL?

PostgreSQL provides reliable persistent storage for:

- Users
- Senders
- Campaigns
- Email jobs
- Slack connections

It is the primary source of truth for business state.

---

## Why Elasticsearch?

Elasticsearch is used as a search and indexing layer for email jobs.

This keeps search concerns separate from the transactional PostgreSQL database.

---

## Why Ethereal?

Ethereal provides a safe SMTP testing environment and preview URLs, making it suitable for demonstrating email delivery without sending production emails.

---

## Why Docker?

Docker provides a consistent local environment for:

- PostgreSQL
- Redis
- Elasticsearch

This reduces local setup differences between environments.

---

# Design Trade-offs

### Fixed Hourly Windows

The current rate limiter uses fixed hourly windows rather than a rolling 60-minute window.

This provides a predictable hourly quota and keeps distributed rate-limit coordination simple.

### PostgreSQL as Source of Truth

Elasticsearch is not treated as the primary database.

If Elasticsearch is unavailable, PostgreSQL still contains the authoritative email state.

### Local Development

The application is currently designed for local execution using Docker and Node.js.

The assignment does not require a public deployment, so the documented application URLs use `localhost`.

---

# Application Screenshots

Screenshots can be added here to make the project easier to understand visually.

Recommended screenshots:

### Login

Show the Google authentication screen or application login page.

### Dashboard

Show:

- User profile
- Scheduled emails
- Sent emails
- Senders
- Slack status

### Compose Campaign

Show:

- Sender selection
- CSV/TXT upload
- Detected recipient count
- Subject
- Body
- Start time
- Delay
- Hourly limit

### BullMQ Dashboard

Show:

- Queue name
- Delayed jobs
- Completed jobs
- Active jobs
- Failed jobs

### Slack Notification

Show the Slack rate-limit notification.

---

# Demo Flow

The recommended demonstration flow is:

## 1. Start Infrastructure

```bash
docker compose up -d
```

## 2. Start Backend

```bash
cd backend
npm run dev
```

## 3. Start Worker

```bash
cd backend
npm run worker
```

## 4. Start Frontend

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:3000
```

## 5. Google Authentication

- Sign in using Google.
- Show the authenticated user's name, email, and avatar.

## 6. Dashboard

Show:

- Sender information
- Scheduled tab
- Sent tab
- Slack connection

## 7. Compose Campaign

- Select sender.
- Upload CSV/TXT.
- Show detected recipient count.
- Enter subject and body.
- Configure start time.
- Configure delay.
- Configure hourly limit.
- Schedule campaign.

## 8. BullMQ Dashboard

Open:

```text
http://localhost:5000/admin/queues
```

Show delayed and processing jobs.

## 9. Email Delivery

Show the Ethereal preview URL from the worker and open the preview.

## 10. Rate Limiting

Configure a small hourly limit and demonstrate that additional jobs are delayed/rescheduled instead of being dropped.

## 11. Slack

Show the Slack rate-limit notification when the configured limit is reached.

## 12. Restart Persistence

Stop the worker and restart it while scheduled jobs remain in BullMQ.

Show that the jobs continue processing after restart.

## 13. Bulk Campaign

Show the 1,000-recipient campaign and the corresponding delayed jobs in Bull Board.

---

# Feature Summary

| Feature | Status |
|---|---|
| Google OAuth 2.0 | ✅ |
| User profile | ✅ |
| Logout | ✅ |
| Multiple senders | ✅ |
| CSV upload | ✅ |
| TXT upload | ✅ |
| Recipient detection | ✅ |
| Recipient deduplication | ✅ |
| Campaign scheduling | ✅ |
| Configurable start time | ✅ |
| Configurable email delay | ✅ |
| Configurable hourly limit | ✅ |
| Redis distributed rate limiting | ✅ |
| BullMQ persistent scheduling | ✅ |
| Configurable worker concurrency | ✅ |
| Idempotent job processing | ✅ |
| Ethereal SMTP | ✅ |
| Slack OAuth | ✅ |
| Slack rate-limit notifications | ✅ |
| Elasticsearch indexing | ✅ |
| Elasticsearch search | ✅ |
| Scheduled email dashboard | ✅ |
| Sent email dashboard | ✅ |
| BullMQ Dashboard | ✅ |
| 1,000+ bulk scheduling | ✅ |
| Worker restart persistence | ✅ |
| Docker infrastructure | ✅ |

---

# Build Verification

## Backend

```bash
cd backend
npm run build
```

The backend TypeScript build completes successfully.

## Frontend

```bash
cd frontend
npm run build
```

The Next.js production build completes successfully.

---

# Submission Notes

The project is intended to be submitted as a private GitHub repository.

The repository should contain:

```text
backend/
frontend/
docker-compose.yml
.gitignore
README.md
package.json
package-lock.json
```

The README documents:

- Project architecture
- Local setup
- Environment variables
- Database setup
- Scheduling architecture
- Worker concurrency
- Rate limiting
- Slack integration
- Elasticsearch
- Testing and verification
- Demo flow

A short demo video can be used to demonstrate the main application workflow within the assignment's required time limit.

---

# Author

**Sathish**

ReachInbox Software Development Intern Assignment
