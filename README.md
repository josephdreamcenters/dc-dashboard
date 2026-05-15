# Dream Centers OS

A full-stack nonprofit staff operating system for **Dream Centers of Colorado Springs**, built on the 4 Disciplines of Execution (4DX) methodology. The platform gives every team member a single place to track Wildly Important Goals (WIGs), scorecards, to-dos, issues, meetings, and quarterly performance reviews — plus live metrics pulled nightly from Salesforce, Athena Health, Virtuous, and VolunteerHub.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router 6, Axios, Recharts |
| Backend | Node.js, Express, PostgreSQL (via Supabase), node-cron |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Frontend deploy | Vercel |
| Backend deploy | Render |
| Database | Supabase (managed PostgreSQL) |

---

## Repository Structure

```
dc-dashboard/
├── client/                   # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/       # Sidebar, TopBar, Layout
│   │   │   └── ui/           # Button, Card, Badge, LoadingSpinner
│   │   ├── contexts/         # AuthContext (JWT management)
│   │   ├── hooks/            # useAuth
│   │   ├── lib/              # api.js (axios instance)
│   │   └── pages/            # Login, Dashboard, NotFound
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── server/                   # Express API
│   ├── index.js              # Entry point
│   ├── .env.example          # All required env vars
│   └── src/
│       ├── db/               # pg Pool connection
│       ├── middleware/        # auth.js, errorHandler.js
│       ├── routes/            # One file per resource
│       └── cron/              # Daily external data syncs
├── vercel.json               # Frontend deployment config
├── render.yaml               # Backend deployment config
├── .gitignore
└── README.md
```

---

## Local Development Setup

### Prerequisites

- Node.js 18 or higher
- npm 9+
- A [Supabase](https://supabase.com) account (free tier is fine for development)

### 1. Clone and install dependencies

```bash
git clone <your-repo-url>
cd dc-dashboard

# Install frontend dependencies
cd client && npm install

# Install backend dependencies
cd ../server && npm install
```

### 2. Configure environment variables

```bash
# Copy the example file
cp server/.env.example server/.env

# Edit server/.env and fill in real values (see Environment Variables section)
```

Create a frontend env file:

```bash
# client/.env.local
VITE_API_URL=http://localhost:3001/api
```

### 3. Set up the database

```bash
cd server

# Run migrations (creates all tables)
npm run db:migrate

# Seed initial data (creates admin user, sample records)
npm run db:seed
```

### 4. Start the development servers

```bash
# Terminal 1 — backend (port 3001)
cd server && npm run dev

# Terminal 2 — frontend (port 5173)
cd client && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Environment Variables

All variables live in `server/.env` (copy from `server/.env.example`).

### Server

| Variable | Description |
|---|---|
| `PORT` | Port the Express server listens on (default: `3001`) |
| `NODE_ENV` | `development` or `production` |

### Database

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection URI. Found in Supabase project settings → Database → Connection string (URI mode). |

### Authentication

| Variable | Description |
|---|---|
| `JWT_SECRET` | Long random string used to sign tokens. Generate with `openssl rand -base64 64`. |
| `JWT_EXPIRES_IN` | Token lifetime (default: `7d`). |

### CORS

| Variable | Description |
|---|---|
| `ALLOWED_ORIGINS` | Comma-separated list of frontend URLs allowed to call the API. Example: `http://localhost:5173,https://your-app.vercel.app` |

### Salesforce Integration

Used to pull **Mary's Home occupancy rate** nightly.

| Variable | Description |
|---|---|
| `SALESFORCE_CLIENT_ID` | Connected App consumer key |
| `SALESFORCE_CLIENT_SECRET` | Connected App consumer secret |
| `SALESFORCE_USERNAME` | API user email |
| `SALESFORCE_PASSWORD` | API user password |
| `SALESFORCE_SECURITY_TOKEN` | API user security token (appended to password for IP-unrestricted auth) |
| `SALESFORCE_LOGIN_URL` | `https://login.salesforce.com` (or sandbox URL) |

### Athena Health Integration

Used to pull **Women's Clinic unique patient count** nightly.

| Variable | Description |
|---|---|
| `ATHENA_CLIENT_ID` | OAuth client ID from Athena developer portal |
| `ATHENA_CLIENT_SECRET` | OAuth client secret |
| `ATHENA_PRACTICE_ID` | Your practice ID in Athena |
| `ATHENA_BASE_URL` | `https://api.athenahealth.com` |

### Virtuous Integration

Used to pull **Dream Makers count (recurring donors)** and **total operating revenue** nightly.

| Variable | Description |
|---|---|
| `VIRTUOUS_API_KEY` | API key from Virtuous CRM settings |
| `VIRTUOUS_BASE_URL` | `https://api.virtuous.org` |

### VolunteerHub Integration

Used to pull **active volunteer count** nightly.

| Variable | Description |
|---|---|
| `VOLUNTEERHUB_API_KEY` | API key from VolunteerHub admin settings |
| `VOLUNTEERHUB_ORG_ID` | Your organization ID in VolunteerHub |
| `VOLUNTEERHUB_BASE_URL` | `https://api.volunteerhub.com` |

---

## Database Setup (Supabase)

1. Create a new project at [supabase.com](https://supabase.com).
2. Go to **Settings → Database → Connection string** and copy the URI (password substituted).
3. Paste it as `DATABASE_URL` in `server/.env`.
4. Run `cd server && npm run db:migrate` to create all tables.
5. Run `cd server && npm run db:seed` to create an initial admin user and sample data.

---

## Deploy Frontend to Vercel

1. Push this repository to GitHub.
2. Go to [vercel.com](https://vercel.com), click **Add New Project**, and import your GitHub repo.
3. Vercel will auto-detect the `vercel.json` at the root. No framework preset needed.
4. Add the environment variable `VITE_API_URL` set to your Render backend URL (e.g. `https://dc-dashboard-api.onrender.com/api`). In the Vercel dashboard, create a secret named `dc_api_url` with that value.
5. Deploy. The `vercel.json` rewrites handle SPA routing so direct URL navigation works.

---

## Deploy Backend to Render

1. Push this repository to GitHub.
2. Go to [render.com](https://render.com) and click **New → Web Service**.
3. Connect your GitHub repo. Render will auto-detect `render.yaml` and configure the service.
4. In the Render dashboard, set all environment variables marked `sync: false` in `render.yaml` — these are the secrets that cannot be stored in the config file:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `ALLOWED_ORIGINS`
   - All integration credentials (Salesforce, Athena, Virtuous, VolunteerHub)
5. Deploy. Render will run `npm install` then `npm start` in the `server/` directory.
6. The health check endpoint is available at `GET /health`.

---

## Integration Setup

### Salesforce
- Create a **Connected App** in Salesforce Setup → App Manager.
- Enable OAuth with the "api" scope.
- Use the consumer key/secret as `SALESFORCE_CLIENT_ID` / `SALESFORCE_CLIENT_SECRET`.
- The cron job in `server/src/cron/salesforce.js` will implement the username-password OAuth flow.

### Athena Health
- Register at the [Athena Developer Portal](https://developer.athenahealth.com).
- Create an OAuth 2.0 application to get client credentials.
- The cron job in `server/src/cron/athena.js` will call the appointments/encounters API for unique patient counts.

### Virtuous
- Log in to Virtuous CRM → Settings → Integrations → API.
- Generate an API key and paste it as `VIRTUOUS_API_KEY`.
- The cron job in `server/src/cron/virtuous.js` will query recurring gift segments (Dream Makers) and gift totals.

### VolunteerHub
- Log in to VolunteerHub → Admin → API Settings.
- Generate an API key and note your organization ID.
- The cron job in `server/src/cron/volunteerhub.js` will query the active volunteers endpoint.

---

## User Roles

| Role | Permissions |
|---|---|
| `admin` | Full access to all features, user management, admin panel |
| `ceo` | Full read/write access to all modules, admin panel (read), no user creation |
| `director` | Read/write access to their team's scorecards, WIGs, issues, to-dos, and meetings; read-only on org-wide data |
| `staff` | Read/write access to their own to-dos and check-ins; read-only on scorecard and WIG data for their team |

Role-based access is enforced on the backend via the `requireAuth` middleware and role checks within each route handler.

---

## Methodology: 4DX + EOS

Dream Centers OS combines elements of:

- **4 Disciplines of Execution (4DX)**: WIGs (Wildly Important Goals), Lead/Lag measures, Scorecard, Cadence of Accountability
- **Entrepreneurial Operating System (EOS)**: Rocks (quarterly priorities), Issues list (IDS), Level 10 Meetings, 90-Day World, Vision/Traction Organizer

The weekly rhythm is:
1. Staff enter scorecard numbers and update to-dos before Monday meetings.
2. Directors run Level 10 Meetings with the built-in meeting module.
3. Issues are tracked and resolved using the IDS (Identify, Discuss, Solve) process.
4. Quarterly, every staff member completes a self-assessment reviewed by their supervisor.
