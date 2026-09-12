# ReachInbox Email Scheduler

A production-oriented email scheduling system built for the ReachInbox Software Development Intern assignment.

The application allows users to authenticate with Google, configure email senders, upload recipient lists, compose campaigns, schedule emails, control sending speed and hourly limits, and monitor email delivery status.

The system is designed around persistent background processing using BullMQ and Redis, with PostgreSQL as the primary data store and Elasticsearch for email search and indexing.

## Tech Stack

### Backend

- **TypeScript**
- **Node.js**
- **Express.js**
- **Prisma ORM**
- **PostgreSQL**
- **BullMQ**
- **Redis**
- **Nodemailer**
- **Ethereal SMTP**
- **Elasticsearch**
- **Bull Board**
- **Passport.js**
- **Google OAuth 2.0**
- **Slack OAuth**
- **Multer**
- **CSV Parse**

### Frontend

- **Next.js**
- **React**
- **TypeScript**
- **Tailwind CSS**

### Infrastructure

- **Docker**
- **PostgreSQL**
- **Redis**
- **Elasticsearch**

## Architecture

The application follows a persistent, queue-based architecture where PostgreSQL stores the source-of-truth email and campaign data, while Redis and BullMQ handle persistent scheduling and background execution.

```text
                         ┌─────────────────────┐
                         │      Next.js UI      │
                         │  React + TypeScript  │
                         └──────────┬──────────┘
                                    │
                                    │ HTTP / REST API
                                    ▼
                         ┌─────────────────────┐
                         │   Express Backend   │
                         │     TypeScript      │
                         └──────┬──────┬───────┘
                                │      │
                ┌───────────────┘      └────────────────┐
                ▼                                        ▼
       ┌─────────────────┐                     ┌─────────────────┐
       │   PostgreSQL    │                     │ Redis + BullMQ  │
       │                 │                     │                 │
       │ Users           │                     │ Persistent      │
       │ Senders         │                     │ Scheduling      │
       │ Campaigns       │                     │ Job Queue       │
       │ Email Jobs      │                     │ Rate Limiting   │
       └─────────────────┘                     └────────┬────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │  Email Worker   │
                                               │                 │
                                               │ Configurable    │
                                               │ Concurrency     │
                                               └────────┬────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │ Ethereal SMTP   │
                                               │   Nodemailer    │
                                               └─────────────────┘

              ┌─────────────────────┐
              │    Elasticsearch    │
              │                     │
              │ Email indexing      │
              │ Status updates      │
              │ Search              │
              └─────────────────────┘

              ┌─────────────────────┐
              │    Slack OAuth      │
              │                     │
              │ Rate-limit alerts   │
              └─────────────────────┘

              ┌─────────────────────┐
              │    Bull Board       │
              │                     │
              │ Queue monitoring    │
              └─────────────────────┘
```
Core Design
PostgreSQL is the source of truth for users, senders, campaigns, and email jobs.
Redis provides persistent queue storage and distributed rate-limit state.
BullMQ schedules and executes email jobs without relying on cron or in-memory timers.
Email workers process jobs with configurable concurrency.
Ethereal SMTP is used for email delivery during development and testing.
Elasticsearch indexes email jobs for searching and keeps status information synchronized.
Slack provides real-time notifications when an hourly sending limit is reached.
Bull Board provides a live view of BullMQ queue activity.

## Project Structure

```text
reachinbox-assignment/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── queues/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   ├── app.ts
│   │   └── server.ts
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
│   │   ├── dashboard/
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
└── README.md
```
## Prerequisites

Before running the application, make sure the following are installed:

- Node.js 20+
- npm
- Docker Desktop
- Git

The application uses Docker for the following services:

- PostgreSQL
- Redis
- Elasticsearch
- ## Infrastructure Setup

The project uses Docker Compose to run the required infrastructure services.

### Start Infrastructure

From the project root:

```bash
docker compose up -d

This starts:

PostgreSQL on port 5432
Redis on port 6379
Elasti csearch on port 9200
```
Check Running Services
-docker compose ps

All three services should be running before starting the backend.

Stop Infrastructure
-docker compose down

Docker volumes are configured in docker-compose.yml so PostgreSQL, Redis, and Elasticsearch data can persist across container restarts.
## Environment Variables

Create the required environment files locally. Do not commit files containing real credentials or secrets.

### Backend

Create:

```text
## Environment Variables

Create the required environment files locally. Do not commit files containing real credentials or secrets.

### Backend

Create:

```text
backend/.env
```

Use:

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

### Frontend

Create:

```text
frontend/.env.local
```

Use:

```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
```

Example environment files are included in the repository:

```text
backend/.env.example
frontend/.env.local.example
```

Never commit real OAuth credentials, Slack credentials, database passwords, or session secrets.
## Database Setup

The application uses PostgreSQL with Prisma ORM.

### Generate Prisma Client

From the backend directory:

```bash
cd backend
npm install
npx prisma generate
```

### Run Database Migrations

```bash
npx prisma migrate dev
```

This creates the required database tables and relationships defined in:

```text
backend/prisma/schema.prisma
```

### Database Models

The application uses the following main models:

- **User** — Google-authenticated users
- **Sender** — Configured email senders
- **EmailBatch** — Email campaign information
- **EmailJob** — Individual scheduled email jobs and their delivery status
- **SlackConnection** — Connected Slack workspace information

### Optional: Prisma Studio

To inspect the database through Prisma Studio:

```bash
npx prisma studio
```
## Running the Application

Start the infrastructure services first, then run the backend and frontend separately.

### 1. Start Docker Services

From the project root:

```bash
docker compose up -d
```

Verify that PostgreSQL, Redis, and Elasticsearch are running:

```bash
docker compose ps
```

### 2. Start the Backend API

Open a terminal:

```bash
cd backend
npm install
npm run dev
```

The backend runs at:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/health
```

### 3. Start the BullMQ Worker

Open a second terminal:

```bash
cd backend
npm run worker
```

The worker processes scheduled email jobs using the configured concurrency.

### 4. Start the Frontend

Open a third terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at:

```text
http://localhost:3000
```

### 5. BullMQ Dashboard

The live BullMQ queue dashboard is available at:

```text
http://localhost:5000/admin/queues
```

### Running Services

When the application is running, the local services are:

| Service | URL / Port |
|---|---|
| Frontend | `http://localhost:3000` |
| Backend API | `http://localhost:5000` |
| BullMQ Dashboard | `http://localhost:5000/admin/queues` |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |
| Elasticsearch | `http://localhost:9200` |

## Authentication

The application uses Google OAuth 2.0 for user authentication.

### Google Login Flow

1. The user opens the application.
2. The user selects **Continue with Google**.
3. The backend redirects the user to Google OAuth.
4. Google authenticates the user and redirects back to the configured callback URL.
5. The backend creates or updates the user in PostgreSQL.
6. A session is maintained using Express Session with Redis as the session store.
7. The frontend displays the authenticated user's name, email, and avatar.

### Logout

Users can log out from the dashboard. The backend destroys the session and the user is returned to the login page.

### Session Persistence

Sessions are stored in Redis rather than in application memory, allowing sessions to survive backend process restarts.

## Email Scheduling

The application uses BullMQ with Redis for persistent email scheduling and background processing.

### Scheduling Flow

1. The user authenticates with Google.
2. The user selects an active sender.
3. The user enters recipients manually or uploads a CSV/TXT file.
4. The frontend validates and counts the detected email addresses.
5. The user configures:
   - Subject
   - Body
   - Start time
   - Delay between emails
   - Hourly sending limit
6. The backend creates an `EmailBatch` in PostgreSQL.
7. Individual `EmailJob` records are created for each recipient.
8. Each email job is added to the BullMQ queue with its calculated delay.
9. The BullMQ worker processes jobs when they become eligible.
10. The worker applies the configured delay and hourly rate limit before sending.
11. Successful emails are marked as `SENT`.
12. Failed emails are marked as `FAILED`.
13. Email status changes are also reflected in Elasticsearch.

### Persistent Scheduling

Scheduled jobs are stored in Redis through BullMQ rather than in application memory.

This means scheduled jobs remain available if the backend or worker process is restarted. When the worker starts again, BullMQ continues processing the persisted jobs.

The scheduler does not use cron, `setInterval`, Agenda, or another in-memory scheduling mechanism.

### Email Status

Each email job can have one of the following statuses:

- `SCHEDULED`
- `PROCESSING`
- `SENT`
- `FAILED`
## Worker Concurrency and Throttling

Email delivery is handled by a dedicated BullMQ worker.

### Configurable Concurrency

Worker concurrency is configurable through the environment:

```env
WORKER_CONCURRENCY="5"
```

The worker reads this value when it starts and processes multiple jobs concurrently according to the configured limit.

### Minimum Delay

Each campaign supports a configurable delay between individual emails.

The scheduler calculates the intended execution time for each recipient:

```text
scheduledAt = startTime + (recipientIndex × delay)
```

The worker also coordinates sending slots through Redis so multiple workers do not bypass the configured delay.

### Processing Flow

```text
BullMQ Job
    ↓
Idempotency Check
    ↓
Distributed Rate-Limit Check
    ↓
Reserve Sending Slot
    ↓
Apply Minimum Delay
    ↓
Send through Ethereal SMTP
    ↓
Update PostgreSQL Status
    ↓
Update Elasticsearch
```

This design allows the application to control sending speed while still supporting concurrent background workers.

## Distributed Hourly Rate Limiting

The application implements hourly email rate limiting using Redis and an atomic Lua script.

### How It Works

1. Each sender has an independently tracked hourly limit.
2. Redis stores the number of reserved email slots for the current hour.
3. The rate-limit check and slot reservation are performed atomically using a Redis Lua script.
4. Multiple workers can safely share the same rate-limit state.
5. When the hourly limit is reached, the email is returned to the `SCHEDULED` state and rescheduled in BullMQ instead of being dropped.
6. A Redis alert key prevents repeated Slack notifications for the same sender during the current rate-limit window.
7. When the next hourly window becomes available, queued emails can continue processing.

### Rate-Limit State

Redis maintains:

- Current hourly email count
- Sender sending-slot timing
- Rate-limit notification state

This prevents separate workers from independently exceeding the configured hourly limit.

### Example

```text
Hourly Limit = 2

Email 1 → SENT
Email 2 → SENT
Email 3 → Rate limit reached
             ↓
         Rescheduled
             ↓
       BullMQ Delayed Job
             ↓
       Next available window
             ↓
          Email 3 → SENT
```

The rate limiter is backed by Redis rather than process-local memory, making the limit shared across worker instances.

## Slack Integration

The application integrates with Slack using OAuth and stores the connected workspace information in PostgreSQL.

### Slack Connection Flow

1. The user selects **Connect Slack** from the dashboard.
2. The backend redirects the user to Slack OAuth.
3. After authorization, Slack redirects back to the configured callback URL.
4. The backend stores the Slack workspace and access information.
5. The dashboard displays the Slack connection status.
6. The user can reconnect Slack without redeploying the application.

### Rate-Limit Notification

When a sender reaches its configured hourly email limit, the application sends a Slack notification containing:

- Sender information
- Configured hourly limit
- Current reserved/sent count
- Approximate time when sending can resume

A Redis alert key prevents repeated notifications for the same sender within the current hourly window.

### Graceful Failure

If Slack is not connected, the email workflow continues normally and the notification is skipped.

If Slack notification delivery fails, the failure is logged but does not cause the email job to be dropped or permanently failed.

## Ethereal SMTP

The application uses Nodemailer with Ethereal SMTP for development and testing email delivery.

### Email Sending

When a scheduled job becomes eligible:

1. The worker retrieves the email job from PostgreSQL.
2. The sender information is loaded from the database.
3. Nodemailer sends the email through the configured Ethereal SMTP transporter.
4. The email job is marked as `SENT` after successful delivery.
5. The `sentAt` timestamp is stored in PostgreSQL.
6. The Elasticsearch document is updated with the new status.

### Preview Emails

Ethereal provides a preview URL for successfully sent test emails. The worker logs the preview URL so the email content can be inspected during development and demonstration.

### Failure Handling

If SMTP delivery fails:

- The email job is marked as `FAILED`.
- The failure timestamp is recorded.
- The error message is stored in PostgreSQL.
- The Elasticsearch document is updated with the failure status and error.

## Elasticsearch

The application uses Elasticsearch to index email jobs and provide searchable email data.

### Indexing

When email jobs are created, they are indexed in the `email_jobs` Elasticsearch index.

The indexed information includes:

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
- Error information
- Creation and update timestamps

### Status Updates

The Elasticsearch document is updated when an email job changes state:

```text
SCHEDULED
    ↓
SENT

or

SCHEDULED
    ↓
FAILED
```

The PostgreSQL database remains the primary source of truth, while Elasticsearch provides search and indexing capabilities.

### Search

Email jobs can be searched using Elasticsearch across relevant fields such as:

- Recipient
- Subject
- Body
- Status

Search results are filtered by the authenticated user's ID.

## BullMQ Dashboard

The application includes Bull Board for real-time monitoring of the BullMQ email queue.

### Dashboard URL

```text
http://localhost:5000/admin/queues
```

The dashboard provides visibility into:

- Waiting jobs
- Active jobs
- Completed jobs
- Failed jobs
- Delayed jobs

This makes it possible to monitor scheduled email processing and verify delayed or rescheduled jobs during development and testing.

### Queue

The application uses the following BullMQ queue:

```text
email-scheduler
```

BullMQ stores the queue state in Redis, allowing scheduled and delayed jobs to survive worker process restarts.

## Compose Campaign

The Compose page provides a simple interface for creating and scheduling email campaigns.

### Campaign Configuration

Users can configure:

- Sender
- Recipients
- Email subject
- Email body
- Start time
- Delay between emails
- Hourly sending limit

### Recipient Input

Recipients can be entered manually or uploaded through:

- CSV files
- TXT files

The application automatically extracts email addresses from uploaded files, removes duplicate addresses, and displays the detected recipient count before scheduling.

### Scheduling

After the user submits the campaign:

1. The frontend sends the campaign details to the backend scheduling API.
2. The backend validates the sender and campaign configuration.
3. The campaign is stored in PostgreSQL.
4. Individual email jobs are created for each recipient.
5. Jobs are added to BullMQ with their calculated execution delays.
6. Elasticsearch indexes the created email jobs.

The Compose page provides loading, success, and error states to give users feedback during scheduling.

## Dashboard

The dashboard provides an overview of email campaigns and delivery activity.

### User Profile

After Google authentication, the dashboard displays:

- User name
- Email address
- Profile avatar
- Logout option

### Email Tabs

The dashboard provides separate views for:

- **Scheduled** — Emails waiting to be processed
- **Sent** — Successfully delivered emails

### Sender Management

The dashboard displays configured email senders and their active status.

### Slack Status

The dashboard shows the current Slack connection status and provides options to connect or reconnect Slack.

### Campaign Information

Email records include relevant information such as:

- Recipient
- Subject
- Sender
- Scheduled time
- Sent time
- Status

The dashboard also handles loading, empty, and error states to provide clear feedback to the user.

## Bulk Campaign Processing

The scheduler is designed to handle large campaigns without creating one in-memory timer per email.

### Bulk Scheduling

For large recipient lists:

- PostgreSQL uses `createMany()` to create email job records efficiently.
- BullMQ uses `addBulk()` to enqueue jobs efficiently.
- Elasticsearch uses bulk indexing for newly created email jobs.

This approach allows the application to schedule 1,000+ email jobs as a single campaign.

### Large Campaign Flow

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
Persistent Scheduled Jobs
       ↓
BullMQ Workers
       ↓
Rate Limit + Delay
       ↓
Ethereal SMTP
```

The worker processes the jobs according to the configured concurrency, minimum delay, and hourly sending limit rather than attempting to send all emails simultaneously.

## Verification

The following application scenarios have been tested during development.

### Authentication

- Google OAuth login tested successfully.
- Authenticated user information displayed on the dashboard.
- Logout tested successfully.

### Email Scheduling

- Campaign scheduling tested with multiple recipients.
- CSV and TXT recipient uploads tested.
- Recipient email detection and duplicate removal tested.
- Scheduled and Sent dashboard views tested.

### Email Delivery

- Ethereal SMTP delivery tested successfully.
- Ethereal preview URLs generated for sent emails.
- Email status updates reflected in PostgreSQL.

### Queue Processing

- BullMQ worker started successfully with configurable concurrency.
- BullMQ Dashboard verified.
- Delayed jobs verified in the queue.
- Worker restart tested successfully.
- Persisted scheduled jobs continued processing after worker restart.

### Bulk Scheduling

- A 1,000-recipient campaign was successfully detected and scheduled.
- Bulk database insertion and BullMQ bulk job creation were verified.

### Rate Limiting

- Hourly rate limiting has been tested with a small campaign.
- Redis-backed rate-limit state was verified.
- Slack rate-limit notification was tested successfully.

### Infrastructure

The following services were verified during development:

- PostgreSQL
- Redis
- Elasticsearch
- BullMQ
- Backend API
- Next.js frontend

## Security

The application follows basic security practices for authentication, sessions, credentials, and application data.

### Credentials

- Real environment files are excluded from Git using `.gitignore`.
- OAuth client secrets are stored in environment variables.
- Slack credentials are stored in environment variables.
- Database credentials are stored in environment variables.
- Example environment files contain placeholders instead of real secrets.

### Authentication and Sessions

- Google OAuth 2.0 is used for user authentication.
- Sessions are maintained using Express Session.
- Session data is stored in Redis instead of application memory.
- HTTP-only cookies are used for the session cookie.

### Data Isolation

Authenticated users are associated with their own senders, campaigns, email jobs, and Slack connections.

Elasticsearch searches are filtered by the authenticated user's ID so that search results remain scoped to the current user.

### Job Safety

Email jobs use unique identifiers for BullMQ jobs and database records.

Before sending an email, the worker performs an idempotency check to prevent an already processed email job from being sent again.

## Scalability

The application is designed to support large email campaigns and multiple worker processes.

### Bulk Operations

Large campaigns use database and queue bulk operations:

- Prisma `createMany()` for email job creation
- BullMQ `addBulk()` for queue insertion
- Elasticsearch bulk indexing for search documents

### Horizontal Workers

Additional BullMQ workers can be started against the same Redis-backed queue.

Because queue state and rate-limit state are stored in Redis, workers can share the workload while maintaining centralized scheduling controls.

### Configurable Concurrency

Each worker supports configurable concurrency through:

```env
WORKER_CONCURRENCY="5"
```

This allows processing capacity to be adjusted without changing the application code.

### Persistent Infrastructure

PostgreSQL, Redis, and Elasticsearch run as separate Docker services, allowing the application layer and infrastructure services to be restarted independently.

### Large Campaign Handling

The scheduler avoids creating thousands of application-level timers. Instead, execution timing is delegated to BullMQ and Redis, allowing large numbers of scheduled jobs to be persisted and processed by workers.

## Design Trade-offs

### PostgreSQL as the Source of Truth

PostgreSQL is used as the primary source of truth for users, senders, campaigns, and email jobs.

Redis and Elasticsearch are used for specialized responsibilities such as queue processing, distributed rate limiting, and search.

### BullMQ Instead of Cron

BullMQ delayed jobs are used instead of cron-based scheduling.

This keeps scheduling state in Redis and allows jobs to survive worker restarts without relying on an in-memory timer.

### Redis Rate Limiting

The hourly rate limiter uses Redis with an atomic Lua script so multiple workers can coordinate safely.

The current implementation uses fixed hourly windows rather than a rolling 60-minute window. This provides predictable hourly quotas while keeping the distributed implementation simple and efficient.

### Elasticsearch as a Search Layer

Elasticsearch is not treated as the primary database.

PostgreSQL remains authoritative, while Elasticsearch provides fast searchable indexing of email jobs.

### Ethereal SMTP

Ethereal SMTP is used because the assignment requires a test SMTP service and it provides preview URLs for verifying email delivery without sending production emails.

### Local Development

The application is currently designed to run locally using Docker and Node.js.

Deployment is not required for the assignment, so the documented application URLs use `localhost`.

## Feature Summary

| Feature | Status |
|---|---|
| Google OAuth 2.0 authentication | Implemented |
| User profile and logout | Implemented |
| Multiple email senders | Implemented |
| CSV/TXT recipient upload | Implemented |
| Recipient detection and deduplication | Implemented |
| Campaign scheduling | Implemented |
| Configurable email delay | Implemented |
| Configurable hourly rate limit | Implemented |
| Redis-backed distributed rate limiting | Implemented |
| Persistent BullMQ scheduling | Implemented |
| Worker concurrency configuration | Implemented |
| Idempotent email processing | Implemented |
| Ethereal SMTP delivery | Implemented |
| Slack OAuth integration | Implemented |
| Slack rate-limit notifications | Implemented |
| Elasticsearch indexing and search | Implemented |
| Scheduled/Sent dashboard | Implemented |
| BullMQ monitoring dashboard | Implemented |
| Bulk scheduling for 1,000+ emails | Verified |
| Worker restart persistence | Verified |
| Docker-based infrastructure | Implemented |

## Local Development

The application is designed to run locally using Docker and Node.js.

### Frontend

```text
http://localhost:3000
```

### Backend API

```text
http://localhost:5000
```

### Backend Health Check

```text
http://localhost:5000/health
```

### BullMQ Dashboard

```text
http://localhost:5000/admin/queues
```

### Elasticsearch

```text
http://localhost:9200
```

### PostgreSQL

```text
localhost:5432
```

### Redis

```text
localhost:6379
```
## Demo Flow

The following flow can be used to demonstrate the main functionality of the application.

### 1. Start Infrastructure

```bash
docker compose up -d
```

### 2. Start Backend and Worker

```bash
cd backend
npm run dev
```

In another terminal:

```bash
cd backend
npm run worker
```

### 3. Start Frontend

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:3000
```

### 4. Authenticate

- Sign in using Google OAuth.
- Verify the user's name, email, and avatar on the dashboard.

### 5. Configure Campaign

- Open the Compose page.
- Select a sender.
- Upload a CSV/TXT recipient list.
- Verify the detected email count.
- Enter the subject and body.
- Configure the start time, delay, and hourly limit.
- Schedule the campaign.

### 6. Monitor Jobs

Open the BullMQ dashboard:

```text
http://localhost:5000/admin/queues
```

Show scheduled, delayed, active, completed, and failed jobs.

### 7. Verify Email Delivery

Use the Ethereal preview URL printed by the worker to inspect successfully sent emails.

### 8. Demonstrate Persistence

Schedule jobs for a future time, stop the worker, restart it, and show that BullMQ continues processing the persisted jobs.

### 9. Demonstrate Rate Limiting

Configure a low hourly limit and show that jobs are delayed/rescheduled when the limit is reached rather than being dropped.

### 10. Demonstrate Slack Notification

Connect Slack and trigger the configured hourly limit to show the rate-limit notification.

### 11. Demonstrate Bulk Scheduling

Upload a 1,000-recipient list and show that the application detects and schedules the large campaign successfully.

## Build Verification

The project was verified locally during development.

### Backend

```bash
cd backend
npm run build
```

The TypeScript backend builds successfully without compilation errors.

### Frontend

```bash
cd frontend
npm run build
```

The Next.js application builds successfully.

### Infrastructure

The following services were verified locally:

- PostgreSQL
- Redis
- Elasticsearch

### Queue Worker

The BullMQ worker starts successfully with the configured concurrency:

```text
Email worker ready with concurrency: 5
```

### Health Check

The backend health endpoint is available at:

```text
http://localhost:5000/health
```

and confirms that the backend is running.

## Author

**Sathish**

This project was developed as part of the ReachInbox Software Development Intern assignment.
