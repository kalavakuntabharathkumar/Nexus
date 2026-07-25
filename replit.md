# Nexus Enterprise OS

Nexus is a React/Vite + Tailwind dashboard backed by FastAPI, SQLAlchemy, and SQLite.
The visual system follows the imported Enterprise Dashboard design: compact Inter typography,
indigo accents, white cards on a pale gray canvas, a fixed workspace sidebar, and light/dark
theme tokens.

## Run locally

The Replit workflow starts both services:

```bash
python main.py & npm run dev
```

The Vite preview is served on port 5000 and proxies `/api` calls to FastAPI on port 8000.

## Demo accounts

All demo accounts use password `demo123`:

- `admin@demo.com` — full access
- `manager@demo.com` — operational CRUD, read-only Finance
- `employee@demo.com` — read-only modules, no Finance or Workflow

The SQLite database is created and seeded automatically on the first backend start.

## Current implementation

- Authentication uses JWTs and bcrypt-hashed passwords.
- Overview, Analytics, AI Copilot, and CRUD module surfaces are wired to FastAPI endpoints.
- Role access is checked on the backend as well as reflected in the sidebar.
- The source design package remains in `attached_assets/` for reference.