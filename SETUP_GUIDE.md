# 🚀 MindVault – Complete Setup & Sharing Guide

Welcome to **MindVault**, an enterprise-grade, privacy-first AI-powered Personal Knowledge Management (PKM) platform. 

This guide contains everything you need to set up, run, and explore the complete system on Windows, macOS, or Linux.

---

## 📋 1. Prerequisites (Tools to Install First)

Before running the project, make sure you have the following installed:

1. **Node.js (v18 or v20+)**
   - Download from: [https://nodejs.org](https://nodejs.org)
   - Ensure `npm` is included (it comes bundled by default).
2. **Python (v3.10 or v3.11+)**
   - Download from: [https://python.org](https://python.org)
   - ⚠️ **Important on Windows:** During installation, check the box: **"Add Python to PATH"**.
3. **Git** *(Optional, if cloning from GitHub)*
   - Download from: [https://git-scm.com](https://git-scm.com)
4. **Docker Desktop** *(Optional, if you prefer running everything in containers)*
   - Download from: [https://www.docker.com](https://www.docker.com)

---

## ⚡ 2. Quick Start: How to Run the App

Choose whichever method you prefer:

### ⭐ Option A: One-Click Launch (Windows - Recommended)
If you are on Windows, launcher scripts are already provided in the root folder:

1. Double-click **`install-all.bat`**  
   *(Automatically installs backend, frontend, and Python AI libraries, and seeds the demo database).*
2. Double-click **`start-all.bat`**  
   *(Launches all 3 services in separate, organized command windows).*
3. Open your browser and navigate to: **[http://localhost:3000](http://localhost:3000)**.

---

### 🍎 Option B: One-Click Launch (macOS / Linux)
In your terminal, navigate to the project directory:

```bash
chmod +x install-all.sh start-all.sh
./install-all.sh
./start-all.sh
```
Open your browser and navigate to: **[http://localhost:3000](http://localhost:3000)**.

---

### 💻 Option C: Manual Command-by-Command Setup

If you prefer to run services manually, open **3 separate terminal windows**:

#### Terminal 1: Backend REST API (Port 4000)
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run dev
```
> *API will be live at `http://localhost:4000/api/v1`*

#### Terminal 2: Python AI Microservice (Port 8000)
```bash
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
> *AI Service will be live at `http://localhost:8000` (Interactive API docs at `http://localhost:8000/docs`)*

#### Terminal 3: Frontend Web Application (Port 3000)
```bash
cd frontend
npm install
npm run dev
```
> *Web App will be live at `http://localhost:3000`*

---

### 🐳 Option D: Run with Docker Compose
If you have Docker Desktop running:
```bash
docker compose up --build
```

---

## 🔑 3. Demo Account Credentials

You can sign in immediately using the pre-configured demo account:

* **URL:** [http://localhost:3000/login](http://localhost:3000/login)
* **Email:** `demo@mindvault.ai`
* **Password:** `Password123!`
* *(Or simply click the **"Fill Demo Account Credentials"** button on the sign-in screen)*.

You can also create a new account anytime on the [Register](http://localhost:3000/register) page.

---

## 🌐 4. Service URLs & Ports

| Service | URL | Description |
| :--- | :--- | :--- |
| **Frontend UI** | [http://localhost:3000](http://localhost:3000) | Next.js 14 Web Workspace |
| **Backend API** | [http://localhost:4000/api/v1](http://localhost:4000/api/v1) | Express REST API |
| **API Health** | [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health) | System health probe |
| **AI Swagger Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive FastAPI documentation |

---

## ✨ 5. Key Features to Explore

1. **Rich Text Notes (`/notes`)**
   - TipTap editor with headings (H1-H3), bold, italic, code blocks with syntax highlighting, tables, bullet/numbered lists, checklists, and blockquotes.
   - Autosave with debouncing (700ms) and version-based conflict detection.
   - Organize by folder, tags, pinning/favoriting, or archiving.

2. **AI-Powered Semantic Search (`/search`)**
   - Search your knowledge base using natural language (e.g., query *"container orchestration"* to find notes discussing *"Kubernetes"*).
   - Generates 384-dimensional dense vector embeddings (`all-MiniLM-L6-v2`) and computes cosine similarity.
   - Filter by source type (Note vs Document), folder, or tags.

3. **Grounded RAG AI Chat (`/chat`)**
   - Ask questions about any note or uploaded document.
   - Strict grounding: Answers prioritize your notes and clearly cite specific notes, documents, page numbers, and match scores.
   - Conversation history memory with multi-turn context.

4. **Automatic AI Tagging & Categorization**
   - Click **"Analyze with AI"** while editing a note.
   - AI detects the subject, suggests clean categories, extracts key technical entities, and suggests tags with 1-click accept/reject.

5. **Document Intelligence (`/documents`)**
   - Upload PDF, DOCX, TXT, or Markdown documents (up to 25MB).
   - Background semantic recursive chunking preserving sentence boundaries and page metadata.
   - Chunks are vectorized and immediately queryable in Search and Chat.

---

## 🧪 6. Running Tests

To verify the test suite:

```bash
# 1. Backend Vitest Suite (14 tests)
cd backend
npm test

# 2. Frontend Vitest Suite (6 tests)
cd frontend
npm test

# 3. Python AI Microservice Pytest (5 tests)
cd ai-service
pytest tests -v

# 4. Full End-to-End System Verification
python scripts/verify_system.py
```

---

## 💡 7. Tips for Sharing the Project Files

When zipping and sharing this project with friends:
* **Do NOT include the following folders in the zip file:**
  - `node_modules` (in both `backend/` and `frontend/`)
  - `.next` (in `frontend/`)
  - `__pycache__` (in `ai-service/`)
* Excluding these folders reduces the file size from ~1.5 GB down to **< 15 MB**, making it easy to send via Google Drive, email, or Slack.
* Your friend will install fresh dependencies in seconds by running `install-all.bat` (or `npm install`).

---

Enjoy using **MindVault**! If you have questions or want to extend the system, feel free to check the codebase or the interactive API docs at `http://localhost:8000/docs`.
