# CampusBoard — Digital Notice Board

A beginner-friendly full-stack college notice board built with plain HTML, CSS, and JavaScript, an Express API, and Supabase PostgreSQL. Students can browse announcements, search and filter them, publish new notices, and edit or delete existing notices.

> **Important security note:** This is an educational starter. The API uses a server-only Supabase service-role key for database writes, and the UI currently allows anyone who can reach the API to create, edit, and delete notices. Do not deploy it publicly as-is. Add login, administrator/author authorization, rate limiting, and deployment-specific CORS before real use.

## 1. Features

- Responsive campus-style landing page and notice cards.
- Live search across notice content, category filter, and sort order.
- Create, read, update, and delete notices through REST API routes.
- Supabase PostgreSQL persistence — no mock notice data.
- Client and server validation, loading states, empty states, and user-friendly errors.
- SQL schema with constraints, indexes, timestamps, trigger, and RLS.
- Beginner-friendly source structure and commands.

## 2. Technology stack

- Frontend: HTML5, CSS3, Vanilla JavaScript, Fetch API
- Backend: Node.js, Express.js, CORS, dotenv
- Database: Supabase PostgreSQL
- Version control: Git and GitHub

## 3. Prerequisites

Install:
- Node.js 18 or later (Node.js 20+ recommended) and npm
- A free Supabase account/project
- A code editor such as VS Code
- Optional: VS Code Live Server extension

## 4. Set up Supabase

1. Create a project at [Supabase](https://supabase.com/). Wait until the database is ready.
2. Open **SQL Editor** in the Supabase dashboard.
3. Open `database/schema.sql` from this project, copy the full SQL, and run it.
4. In **Project Settings → API** (or the current API keys page), copy the project URL and a server-only secret/service-role key. The dashboard labels can vary by Supabase version.
5. Keep the secret/service-role key only in `backend/.env`. Never put it in `frontend/script.js`, HTML, GitHub, or screenshots.

RLS is enabled. The schema permits public reads through the anon/authenticated roles but intentionally has no public direct-write policies. The Express server uses its server-only service-role key to perform writes. That key bypasses RLS, so the API itself must be protected. For a real campus deployment, implement Supabase Auth and authorization before enabling public access.

## 5. Configure and install the backend

Open a terminal and move into the backend directory first:

```bash
cd backend
npm install
```

The `package.json` already declares every required runtime package and nodemon. These extra commands are optional and are not necessary after a successful `npm install`; they are included to match common classroom instructions:

```bash
npm install express cors dotenv @supabase/supabase-js ws
npm install --save-dev nodemon
```

Create your local environment file by copying the example:
- Windows PowerShell: `Copy-Item .env.example .env`
- Windows Command Prompt: `copy .env.example .env`
- macOS/Linux: `cp .env.example .env`

Edit `backend/.env` with your real values:

```dotenv
PORT=3000
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SUPABASE_KEY
FRONTEND_ORIGIN=http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:5501,http://localhost:5501
```

Do not include quotes unless your values require them. Do not commit `.env`.

## 6. Start the application

### Terminal 1 — API server

From the project root:

```bash
cd backend
npm install
npm run dev
```

Or use `npm start` for the non-watch server. Expected startup message: `CampusBoard API running at http://localhost:3000`.

Check health in your browser: [http://localhost:3000/api/health](http://localhost:3000/api/health). `databaseConfigured` should be `true` once the environment variables are present. This health check confirms configuration presence, not that a database query has succeeded.

### Terminal 2 — frontend

Serve `frontend/` with VS Code Live Server (right-click `frontend/index.html` → **Open with Live Server**). Confirm its origin is listed in `FRONTEND_ORIGIN`. The common default is `http://127.0.0.1:5500`.

Alternatively, from the project root with Python installed:

```bash
python -m http.server 5500 --directory frontend
```

Then open [http://localhost:5500](http://localhost:5500). If your frontend is served from another port, add that exact origin to `FRONTEND_ORIGIN` and restart the API server. Avoid opening the HTML as a `file://` URL because browser requests and CORS may not work correctly.

## 7. REST API endpoints

Base URL: `http://localhost:3000/api`

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Server and configuration status |
| GET | `/notices` | List notices, newest first |
| GET | `/notices/:id` | Get one notice by UUID |
| POST | `/notices` | Create a notice |
| PUT | `/notices/:id` | Replace editable notice fields |
| DELETE | `/notices/:id` | Delete a notice |

Example create request:

```bash
curl -X POST http://localhost:3000/api/notices ^
  -H "Content-Type: application/json" ^
  -d "{\"title\":\"Library hours update\",\"category\":\"General\",\"author\":\"Library Team\",\"description\":\"The library closes at 5 PM today.\",\"event_date\":null,\"contact\":null}"
```

On macOS/Linux, replace the Windows `^` line continuations with `\\`, or send the request using Postman/Thunder Client. API validation errors return HTTP 400; missing records return HTTP 404; unconfigured database returns HTTP 503.

## 8. Git and GitHub submission

Run these commands from the project root:

```bash
git init
git add .
git commit -m "Build Digital Notice Board"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/digital-notice-board.git
git push -u origin main
```

Create the GitHub repository first and replace the remote URL with your repository URL. Confirm `backend/.env` is not staged or uploaded. If it was committed by mistake, rotate the Supabase key immediately; removing a file from a later commit does not erase it from Git history.

## 9. Common errors

- **`Database is not configured` / `databaseConfigured: false`:** ensure `backend/.env` exists, variable names match exactly, and restart the server.
- **`Invalid API key` / database operation failed:** check the project URL and server-only key. Make sure you ran `database/schema.sql` in the same Supabase project.
- **CORS error:** add the exact frontend origin (including hostname and port) to `FRONTEND_ORIGIN`, comma-separated, then restart Node.
- **Notices do not load:** keep the backend terminal open, visit `/api/health`, inspect the browser console/network tab, and verify Supabase project status.
- **Port already in use:** change `PORT` in `.env`, then update `API_BASE` at the top of `frontend/script.js` to match the new port.
- **Schema/column errors:** rerun or inspect `database/schema.sql`; table and field names must match the code.
- **Date issue:** the optional date must be a valid date in `YYYY-MM-DD` format.
- **CORS allowed origin error:** do not add a trailing slash unless the browser origin includes it; browser origins normally do not include a trailing slash.

## 10. Project demo script (about 1 minute)

1. Introduce CampusBoard as one place for campus announcements.
2. Show the responsive page and the notice list loaded from Supabase.
3. Search for a word and filter by a category.
4. Publish a sample notice with title, category, author, description, and optional due date.
5. Edit the notice and save the change.
6. Delete the sample notice after confirming.
7. Briefly explain that the browser uses Fetch API to call Express routes, and Express reads/writes the Supabase PostgreSQL table.

## 11. Viva questions and answers

**Q1. What is the purpose of a digital notice board?**  
It stores campus announcements in one online place so students can view updates easily.

**Q2. What is Express.js used for in this project?**  
Express.js creates the backend server and REST API endpoints that receive requests from the frontend.

**Q3. What is Supabase?**  
Supabase is a backend platform that provides a PostgreSQL database and related services.

**Q4. What does CRUD mean?**  
CRUD stands for Create, Read, Update, and Delete — the four main operations for managing records.

**Q5. Why must the service-role key stay on the backend?**  
It has powerful database permissions and can bypass Row Level Security. Exposing it in browser code could allow unauthorized database access.

## 12. Limitations and next steps

- No user accounts, author ownership, moderation, pagination, or rate limiting.
- Anyone who can access the API can modify any notice. Add authentication/authorization before deployment.
- Configure production HTTPS, exact CORS origins, environment secrets, and server hosting separately.
- Google Fonts are loaded from an external service; the layout still works with fallback fonts if they are unavailable.
- No live Supabase credentials are included. You must configure your own project and run the SQL schema.
