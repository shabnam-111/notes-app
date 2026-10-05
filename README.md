# Notes App

A Notes application built with Flask and PostgreSQL (SQLite for quick local runs) for the DevOps & Automation Lab
(ENSP461) capstone project. The DevOps phases (Docker, Jenkins, Kubernetes, ...) are added in later pull requests;
see `docs/` as they land.

## Features

- User registration and login (hashed passwords, CSRF-protected forms)
- Create, read, update, delete, search and **pin** notes
- **Rich-text editor**: text size, colour, highlight, headings, lists, alignment, links, **images** and **shapes**
- REST API with token (JWT) authentication
- Responsive web interface with automatic dark mode
- Error handling: friendly pages in the browser, JSON errors from the API
- Operations endpoints: `/health`, `/metrics` (Prometheus) and JSON logs on stdout

More detail and the security model: [docs/FEATURES.md](docs/FEATURES.md).

## Run locally (SQLite, no setup)

```bash
cd app
python -m venv .venv && source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
flask --app wsgi run --port 5000
```

Open <http://localhost:5000>, create an account and write a note. Data is stored in `app/instance/notes.db`, which is git-ignored.

## Run against PostgreSQL

```bash
export DATABASE_URL=postgresql+psycopg2://notes:password@localhost:5432/notes
export SECRET_KEY=$(python -c "import secrets;print(secrets.token_hex(32))")
export JWT_SECRET=$(python -c "import secrets;print(secrets.token_hex(32))")
flask --app wsgi run --port 5000
```

When `DATABASE_URL` is set the app **refuses to start without `SECRET_KEY` and `JWT_SECRET`** - there is no insecure default.

## Run tests

```bash
cd app
pip install -r requirements-dev.txt
flake8 .
pytest --cov=app
TEST_DATABASE_URL=postgresql+psycopg2://notes:password@localhost/notes_test pytest   # same suite on PostgreSQL
```

## API

Log in once to get a token, then send it as `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/register | Create an account (`username`, `password`) |
| POST | /api/login | Returns a token (valid 1 hour) |
| GET | /api/notes | List my notes (`?q=` search, `?pinned=true`) |
| POST | /api/notes | Create a note (`title`, `body`, `body_format`, `pinned`) |
| GET | /api/notes/<id> | Get one note |
| PUT | /api/notes/<id> | Update a note (any of the fields above) |
| DELETE | /api/notes/<id> | Delete a note |
| GET | /health | Health check (also checks the database) |
| GET | /metrics | Prometheus metrics |

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | local SQLite file | SQLAlchemy URL of the database |
| `SECRET_KEY` | dev value, local only | Signs browser sessions |
| `JWT_SECRET` | dev value, local only | Signs API tokens |
| `LOG_LEVEL` | `INFO` | Log verbosity |

## Layout

```
app/app/        Flask application (models, routes, sanitiser, editor assets)
app/tests/      pytest suite
app/wsgi.py     entry point (gunicorn wsgi:app / flask --app wsgi run)
docs/           documentation
```

## Changes from the first prototype

The first version (`app.py`, SQLite only, session-cookie API, 6-character passwords) was rebuilt on SQLAlchemy.
Behaviour that changed on purpose: the API now uses bearer tokens instead of the browser session; passwords need
8 characters; forms carry CSRF tokens; `/logout` is a POST. Every behaviour covered by the old tests (health check,
login required, wrong password, CRUD flow, title required, short password) is covered by the new suite.
