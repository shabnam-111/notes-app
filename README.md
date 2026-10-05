# Notes App

A simple Notes application built with Flask and SQLite for the DevOps & Automation Lab (ENSP461) capstone project.

## Features

- User registration and login
- Create, read, update and delete notes (CRUD)
- SQLite database
- REST APIs
- Responsive web interface (Bootstrap)
- Error handling

## Run locally

1. Install the requirements:

        pip install -r requirements.txt

2. Start the app:

        python app.py

3. Open http://localhost:5000 in your browser.

## Run tests

    pytest

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/notes | List my notes |
| POST | /api/notes | Create a note |
| GET | /api/notes/<id> | Get one note |
| PUT | /api/notes/<id> | Update a note |
| DELETE | /api/notes/<id> | Delete a note |
| GET | /health | Health check |