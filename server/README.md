# CareerHub — Backend (Express + MongoDB)

REST API for CareerHub. Matches the routes already expected by `client/src/services/api.js`.

## Setup

1. **Get a MongoDB connection string.** Easiest option: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
   free tier — create a cluster, create a database user, get the connection string
   (Database → Connect → Drivers). Alternatively, run MongoDB locally and use
   `mongodb://localhost:27017/careerhub`.

2. Install and configure:
   ```bash
   cd server
   npm install
   cp .env.example .env
   # edit .env: paste your MONGO_URI, set a real JWT_SECRET
   ```

3. Seed the database with data matching the frontend's mock data:
   ```bash
   npm run seed
   ```
   This creates:
   - Admin: `admin@careerhub.com` / `admin1234`
   - Recruiters: `recruiter1@careerhub.com` through `recruiter5@careerhub.com` / `password123`
   - Student: `student@careerhub.com` / `password123`
   - 5 companies, 6 jobs, 3 articles — matching `client/src/utils/mockData.js`

4. Run the server:
   ```bash
   npm run dev      # with nodemon (auto-restart on file changes)
   # or
   npm start        # plain node
   ```
   Runs on `http://localhost:5000` by default. Health check: `GET /api/health`.

## Connecting the frontend

The frontend's `.env` already points `VITE_API_URL` at `http://localhost:5000/api` by
default, matching this server. With both running (`npm run dev` in `client/` and
`npm run dev` in `server/`), login/register on the frontend now hit this real API —
`AuthContext.jsx` has already been updated to call `/auth/login` and `/auth/register`
instead of using mock data.

**Try it:** register a new account (or log in with `student@careerhub.com` / `password123`)
— you should land on the real student dashboard, and the account persists in MongoDB.

## What's NOT yet wired up on the frontend

The backend is complete for all these routes, but the frontend pages listed below
still read from `mockData.js` / `contentData.js` rather than calling these APIs.
This is intentional — wiring 20+ pages to real endpoints is a lot of repetitive,
mechanical work, and doing it page-by-page (with you reviewing each) is safer than
one giant diff. Auth was wired first since it's the foundation everything else needs.

| Frontend page | Backend route ready | Still uses mock data |
|---|---|---|
| Jobs / Internships search | `GET /api/jobs` | Yes |
| Job Details | `GET /api/jobs/:idOrSlug` | Yes |
| Apply flow | `POST /api/jobs/:id/apply` | Yes (localStorage) |
| Save/bookmark | `POST /DELETE /api/jobs/:id/bookmark` | Yes (localStorage) |
| Companies | `GET /api/companies` | Yes |
| Student Profile | `PUT /api/users/:id` | Yes |
| Recruiter: post/edit job | `POST /PUT /api/jobs` | Yes |
| Recruiter: applicants | `GET /api/applications/job/:jobId` | Yes |
| Admin: users/companies/jobs | `GET/PUT` on respective routes | Yes |

## API reference

**Auth**
```
POST   /api/auth/register       { name, email, password, role }
POST   /api/auth/login          { email, password }
GET    /api/auth/me             (protected)
```

**Jobs**
```
GET    /api/jobs                ?keyword&location&jobType&workMode&skills&page&limit&sort
GET    /api/jobs/mine           (protected, recruiter)
GET    /api/jobs/all            (protected, admin)
GET    /api/jobs/:idOrSlug
POST   /api/jobs                (protected, recruiter)
PUT    /api/jobs/:id            (protected, owner or admin)
DELETE /api/jobs/:id            (protected, owner or admin)
PUT    /api/jobs/:id/status     (protected, admin) -- approve/reject
POST   /api/jobs/:id/apply      (protected, student)
POST   /api/jobs/:id/bookmark   (protected, student)
DELETE /api/jobs/:id/bookmark   (protected, student)
```

**Applications**
```
GET    /api/applications             (protected, student's own)
GET    /api/applications/job/:jobId  (protected, recruiter who owns the job, or admin)
GET    /api/applications/:id         (protected, applicant/job owner/admin)
PUT    /api/applications/:id/status  (protected, recruiter or admin)
```

**Users**
```
GET    /api/users               (protected, admin)
GET    /api/users/:id           (protected)
PUT    /api/users/:id           (protected, self or admin)
PUT    /api/users/:id/status    (protected, admin) -- suspend/reactivate
```

**Companies**
```
GET    /api/companies
GET    /api/companies/:idOrSlug
POST   /api/companies           (protected, recruiter)
PUT    /api/companies/:id       (protected, owner or admin)
DELETE /api/companies/:id       (protected, admin)
```

**Bookmarks & Notifications**
```
GET    /api/bookmarks                (protected, student)
GET    /api/notifications            (protected)
PUT    /api/notifications/:id/read   (protected)
```

## Security measures in place
- Passwords hashed with bcrypt (never stored in plain text)
- JWT auth with configurable expiry
- `helmet` for secure HTTP headers
- CORS locked to `CLIENT_URL`
- Rate limiting on all `/api` routes (300 req/15min per IP)
- Request body size limit (10kb)
- Role-based authorization on every mutating route
- Ownership checks (a recruiter can only edit their own jobs/company; a student can only
  view their own applications) enforced in controllers, not just the frontend

## Folder structure
```
server/
├── config/db.js              MongoDB connection
├── controllers/               Route handler logic
├── middleware/                 auth (JWT + roles), centralized error handling
├── models/                     Mongoose schemas
├── routes/                     Express routers
├── seed/seed.js                 Seed script matching frontend mock data
├── utils/                       asyncHandler, generateToken, slugify
└── server.js                    App entry point
```
