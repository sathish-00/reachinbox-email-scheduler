ReachInbox Email Scheduler
A full-stack email scheduling application built for the ReachInbox Software Development Intern assignment.

The application supports bulk email scheduling, persistent job execution, configurable worker concurrency, per-sender hourly rate limiting, delayed rescheduling, Slack notifications, Google OAuth, Elasticsearch indexing, BullMQ monitoring, and CSV/TXT recipient uploads.

Tech Stack
Backend
Node.js
TypeScript
Express.js
Prisma ORM
PostgreSQL
Redis
BullMQ
Nodemailer
Ethereal SMTP
Elasticsearch
Passport.js
Google OAuth 2.0
Slack OAuth
Frontend
Next.js
React
TypeScript
Tailwind CSS
Infrastructure
Docker
Docker Compose
Architecture
                           ┌─────────────────────┐
                           │       Next.js       │
                           │       Frontend      │
                           └──────────┬──────────┘
                                      │
                                      │ HTTP / REST
                                      ▼
                           ┌─────────────────────┐
                           │       Express       │
                           │         API         │
                           └──────┬─────┬────────┘
                                  │     │
                    ┌─────────────┘     └───────────────┐
                    ▼                                   ▼
             ┌─────────────────┐               ┌─────────────────┐
             │   PostgreSQL    │               │      Redis      │
             │                 │               │                 │
             │ Users           │               │ BullMQ          │
             │ Senders         │               │ Sessions        │
             │ Batches         │               │ Rate limiting   │
             │ Email Jobs      │               │ Queue state     │
             └─────────────────┘               └────────┬────────┘
                                                        │
                                                        ▼
                                                 ┌──────────────────┐
                                                 │   BullMQ Worker  │
                                                 │                  │
                                                 │ Configurable     │
                                                 │ concurrency      │
                                                 └────────┬─────────┘
                                                          │
                                                          ▼
                                                 ┌──────────────────┐
                                                 │   Ethereal SMTP  │
                                                 │     Nodemailer   │
                                                 └──────────────────┘

             ┌──────────────────────────────────────────────────────┐
             │                    Elasticsearch                     │
             │                                                      │
             │ Email job search/index                               │
             │ Scheduled / Sent / Failed state indexing             │
             └──────────────────────────────────────────────────────┘

             ┌──────────────────────────────────────────────────────┐
             │                       Slack                          │
             │                                                      │
             │ OAuth connection                                     │
             │ Hourly rate-limit notification                       │
             └──────────────────────────────────────────────────────┘
Project Structure
reachinbox-assignment/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── queues/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   ├── validators/
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   ├── prisma/
│   │   └── schema.prisma
│   │
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── compose/
│   │   └── page.tsx
│   │
│   ├── .env.local
│   └── package.json
│
├── docker-compose.yml
└── README.md
Prerequisites

Ensure the following tools are installed locally:

Node.js (v18+)
npm
Docker
Docker Desktop (running)
Git
Infrastructure Setup

From the project root:

docker compose up -d

This starts:

PostgreSQL: localhost:5432
Redis: localhost:6379
Elasticsearch: localhost:9200

Verify running containers:

docker ps

Expected active containers:

reachinbox-postgres
reachinbox-redis
reachinbox-elasticsearch
Environment Variables
Backend Environment

Create:

backend/.env

Add:

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reachinbox"

REDIS_HOST="localhost"
REDIS_PORT="6379"

ELASTICSEARCH_URL="http://localhost:9200"

PORT="5000"
NODE_ENV="development"

GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
GOOGLE_CALLBACK_URL="http://localhost:5000/api/auth/google/callback"

SESSION_SECRET="YOUR_SESSION_SECRET"

WORKER_CONCURRENCY="5"

SLACK_CLIENT_ID="YOUR_SLACK_CLIENT_ID"
SLACK_CLIENT_SECRET="YOUR_SLACK_CLIENT_SECRET"
SLACK_REDIRECT_URI="http://localhost:5000/api/slack/callback"
Frontend Environment

Create:

frontend/.env.local

Add:

NEXT_PUBLIC_API_URL=http://localhost:5000

Never commit real OAuth credentials, session secrets, Slack tokens, or other sensitive credentials.

Database Setup

Navigate to the backend:

cd backend

Install dependencies:

npm install

Generate Prisma Client:

npm run prisma:generate

Run database migrations:

npm run prisma:migrate

PostgreSQL acts as the primary persistent source of truth for:

Users
Senders
Campaigns
Email jobs
Slack connection state
Running the Application
1. Start the Backend API
cd backend
npm run dev

Base API:

http://localhost:5000

Health Check:

http://localhost:5000/health
2. Start the BullMQ Worker

Open another terminal:

cd backend
npm run worker

The worker processes scheduled email jobs from BullMQ.

3. Start the Frontend

Open another terminal:

cd frontend
npm install
npm run dev

Frontend:

http://localhost:3000
Complete Startup Summary
Terminal 1
Project Root
docker compose up -d

Terminal 2
backend/
npm run dev

Terminal 3
backend/
npm run worker

Terminal 4
frontend/
npm run dev
Core System Design & Implementation Details
Authentication Flow
Frontend
   │
   ▼
Google Login
   │
   ▼
OAuth Callback
   │
   ▼
Create/Update User
   │
   ▼
PostgreSQL
   │
   ▼
Redis Session
   │
   ▼
Dashboard

The application provides Google OAuth 2.0 authentication with Redis-backed sessions and logout support.

Email Scheduling Pipeline
Compose Campaign
       │
       ▼
Validate Request
       │
       ▼
Create EmailBatch
       │
       ▼
Create EmailJob Records
(PostgreSQL)
       │
       ▼
BullMQ addBulk()
(Redis)
       │
       ▼
BullMQ Worker
       │
       ├──► Rate Limit / Delay Verification
       │
       ├──► Ethereal SMTP Send
       │
       ├──► PostgreSQL Update
       │       SENT / FAILED
       │
       └──► Elasticsearch Index Update

Deterministic relationship:

PostgreSQL EmailJob.id == BullMQ jobId
Persistent Scheduling (Zero-Cron)

The scheduler does not use:

node-cron
cron
Agenda
in-memory setTimeout timers

Queue state is stored in Redis and managed by BullMQ.

Business state is stored durably in PostgreSQL.

If the backend or worker process terminates, pending jobs remain preserved in the queue and database.

When the worker restarts, pending jobs can resume processing.

Idempotency Guarantee

Before executing an email job, the worker performs an atomic database transition:

UPDATE "EmailJob"
SET status = 'PROCESSING'
WHERE id = :jobId
AND status = 'SCHEDULED';

If another worker instance has already claimed the record, the update affects zero rows.

The job is then skipped, preventing duplicate delivery.

Worker Concurrency & Throttling

Worker concurrency is configurable through:

WORKER_CONCURRENCY="5"

Minimum email delay is calculated using:

startTime + (index × delaySeconds)

The distributed rate limiter also reserves delivery slots atomically to coordinate email spacing across workers.

Distributed Hourly Rate Limiting

Hourly limits are enforced per sender using Redis and an atomic Lua script.

Worker A ──┐
           │
Worker B ──┼──► Redis Atomic Rate Limiter
           │       (Lua Script)
Worker C ──┘

When an hourly limit is encountered:

The email is not dropped.
The email is not permanently failed.
PostgreSQL status remains SCHEDULED.
The next eligible delivery time is calculated.
The email is rescheduled through BullMQ.
A Slack rate-limit notification is triggered.

This allows multiple worker instances to share the same distributed rate-limit state.

Slack Integration

The application uses real Slack OAuth for workspace connection.

Slack connection information is stored per user in PostgreSQL.

When a sender reaches its configured hourly limit, Slack receives a notification containing:

Sender ID
Hourly limit
Current count
Expected resume time

If Slack is not connected, email scheduling continues normally.

If Slack notification delivery fails, the scheduling workflow continues without crashing.

Slack can also be disconnected and reconnected through the application without redeploying the backend.

Ethereal SMTP Testing

The application uses Nodemailer with Ethereal SMTP for email testing.

After a successful email send, the worker logs an Ethereal preview URL:

Ethereal preview:
https://ethereal.email/message/...

The preview URL can be opened to inspect the generated email.

Elasticsearch Indexing & Search

Index name:

email_jobs

Indexed fields include:

recipient
subject
body
status
senderId
batchId
userId
scheduledAt
sentAt
failedAt
error
createdAt
updatedAt

Campaign creation uses bulk Elasticsearch indexing for efficient ingestion.

Large campaigns are handled using:

Prisma.createMany()
+
BullMQ.addBulk()
+
Elasticsearch Bulk API

Elasticsearch is an auxiliary search layer.

If Elasticsearch indexing fails, the transactional email scheduling or delivery operation is not failed because of the indexing problem.

Dashboard

The frontend dashboard provides:

Google authenticated user information
Name
Email
Avatar
Logout
Sender management
Slack connection status
Slack connect/reconnect
Scheduled email view
Sent email view
Campaign statistics
Compose campaign navigation
Loading states
Empty states
Error states
Compose Campaign

The compose interface supports:

Sender selection
Recipient textarea
CSV upload
TXT upload
Automatic email extraction
Duplicate recipient removal
Detected recipient count
Subject
Body
Start time
Minimum delay
Hourly limit
Campaign scheduling
Loading state
Error state
Success state

Supported file formats:

.csv
.txt
Bulk Campaign Processing

The system is designed to support campaigns containing 1000+ recipients.

Bulk operations are used for:

PostgreSQL
createMany()

BullMQ
addBulk()

Elasticsearch
Bulk API

This avoids creating each campaign record and queue entry through separate sequential operations.

BullMQ Monitoring

Bull Board provides a live queue monitoring interface.

Open:

http://localhost:5000/admin/queues

The dashboard allows inspection of:

Waiting jobs
Active jobs
Completed jobs
Failed jobs
Delayed jobs
Queue activity
Verification & Useful Links

Frontend Dashboard:

http://localhost:3000

Backend Health Check:

http://localhost:5000/health

BullMQ Admin UI:

http://localhost:5000/admin/queues

Elasticsearch:

http://localhost:9200

Elasticsearch Email Job Count:

http://localhost:9200/email_jobs/_count
Build Verification
Backend
cd backend
npm run build
Frontend
cd frontend
npm run build

Both applications should compile successfully.

Feature Matrix
Requirement	Implementation	Status
TypeScript Backend	TypeScript	Complete
Express.js Framework	Express.js	Complete
PostgreSQL & Prisma ORM	PostgreSQL + Prisma	Complete
Redis Storage	Redis	Complete
BullMQ Integration	BullMQ	Complete
Persistent Delayed Scheduling	BullMQ / Redis, No cron	Complete
Multiple Senders Support	Sender management	Complete
Configurable Worker Concurrency	WORKER_CONCURRENCY	Complete
Minimum Email Delay Enforcement	Redis slot reservation	Complete
Per-Sender Hourly Rate Limiting	Redis	Complete
Atomic Redis Rate Limiter	Lua Script	Complete
Rate-Limit Delayed Rescheduling	BullMQ delayed jobs	Complete
Real Slack OAuth Flow	Slack OAuth	Complete
Slack Rate-Limit Trigger Notification	Slack Webhook	Complete
Disconnect / Reconnect Slack Handling	OAuth reconnect flow	Complete
Ethereal SMTP Dispatch	Nodemailer + Ethereal	Complete
Elasticsearch Job Indexing	Elasticsearch	Complete
Elasticsearch Bulk API Handling	Bulk API	Complete
Elasticsearch Multi-field Search	Multi-match query	Complete
Live BullMQ Dashboard	Bull Board	Complete
Google OAuth 2.0 Integration	Passport Google OAuth	Complete
CSV / TXT Lead File Parsing	CSV/TXT upload	Complete
Detected Recipient Counter	Frontend parsing	Complete
Scheduled Emails View	Dashboard	Complete
Sent Emails View	Dashboard	Complete
Full UI State Handling	Loading / Empty / Error	Complete
Server Restart Persistence	Redis + PostgreSQL	Complete
1000+ Campaign Bulk Execution	Bulk database + queue operations	Complete
5-Minute Demo Flow
Open:
http://localhost:3000
Sign in using Google OAuth.
Confirm the dashboard displays:
Name
Email
Avatar
Connect Slack using the OAuth flow.
Click Compose.
Upload a test CSV or TXT recipient file.
Confirm the detected recipient count.
Configure:
Start Time
Delay
Hourly Limit
Submit the campaign.
Open Scheduled Emails and confirm the scheduled jobs.
Open the BullMQ dashboard:
http://localhost:5000/admin/queues
Verify worker console output for Ethereal SMTP preview URLs.
Navigate to Sent Emails.
Use the Elasticsearch-powered search functionality.
Trigger a small hourly limit to demonstrate rate limiting.
Show the Slack rate-limit notification.
Stop the worker/server process.
Restart the worker/server.
Demonstrate that scheduled jobs remain persisted and resume without duplicate delivery.
Security Best Practices

Do not commit:

.env
.env.local
OAuth secrets
Session secrets
Slack access tokens
Webhook secrets
Other credentials

All credentials should be configured through environment variables.

For production deployments, use:

TLS / HTTPS
Secure session cookies
Enterprise SMTP relays
Access-controlled Redis
Access-controlled Elasticsearch
Proper secret management
Scalability Considerations

The current architecture separates responsibilities between persistent storage, queue execution, rate limiting, search, and frontend presentation.

Potential production improvements include:

Horizontal worker scaling
Redis cluster
PostgreSQL connection pooling
Elasticsearch cluster
Dedicated SMTP provider
Centralized secret management
Distributed observability
Structured logging
Metrics and alerting
Queue backpressure management
Design Trade-offs
Decision	Benefit	Trade-off
PostgreSQL	Durable transactional business state	Requires relational database management
Redis + BullMQ	Reliable distributed queue execution	Additional infrastructure
Elasticsearch	Fast multi-field search	Additional storage system
Ethereal SMTP	Safe email testing	Not intended for production delivery
Redis Lua rate limiter	Atomic distributed coordination	Lua script adds implementation complexity
Slack Webhook	Simple operational notifications	Requires Slack connection
Google OAuth	Secure authentication flow	Requires OAuth application configuration
Conclusion

ReachInbox Email Scheduler demonstrates a distributed email scheduling architecture that separates:

PostgreSQL
Durable business state
Redis + BullMQ
High-throughput queue execution
Elasticsearch
Search and indexing
Ethereal SMTP
Email delivery verification
Slack OAuth
Operational rate-limit alerts

The system provides persistent scheduling, configurable worker concurrency, distributed rate limiting, idempotent processing, OAuth authentication, Slack notifications, Elasticsearch indexing, bulk recipient processing, CSV/TXT uploads, scheduled and sent email views, and a live BullMQ monitoring dashboard.

Author

Sathish Kodari

Built as part of the ReachInbox Software Development Intern assignment.


**That entire thing is ONE `README.md` file.** Your GitHub editor should look like your screenshot while
