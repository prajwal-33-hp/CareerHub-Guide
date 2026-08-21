# CareerHub

A full-stack job & internship portal — React + Vite + Tailwind CSS frontend,
Node.js + Express + MongoDB backend.

## Quick start

**1. Backend** (see `server/README.md` for full details)
```bash
cd server
npm install
cp .env.example .env    # add your MongoDB URI + a JWT secret
npm run seed             # populate the database
npm run dev    
           # runs on http://localhost:5000
```

**2. Frontend** (see `client/README.md` for full details)
```bash
cd client
npm install
cp .env.example .env    # already points at http://localhost:5000/api
npm run dev               # runs on http://localhost:5173
```

With both running, register a new account or log in with a seeded one
(`student@careerhub.com` / `password123`) — auth is fully wired to the real API.

## Status

- **Frontend**: feature-complete UI across public pages, student/recruiter/admin
  dashboards, SEO, code-splitting, tests. See `client/README.md`.
- **Backend**: all REST routes built and working — auth, jobs, applications, users,
  companies, bookmarks, notifications — with JWT auth, role-based authorization,
  ownership checks, and security middleware. See `server/README.md`.
- **Wired together**: authentication (register/login/session persistence) uses the
  real API end-to-end. Everything else (job listings, applications, saved jobs,
  dashboards) still reads from frontend mock data — the backend is ready for them,
  but each page needs its `mockData.js` calls swapped for `api.js` calls one at a time.

## Repo structure
```
careerhub/
├── client/     React + Vite + Tailwind frontend
├── server/     Express + MongoDB backend
└── README.md   (this file)
```
