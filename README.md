# AI_NOTES_APP

MindVault is an enterprise-grade, privacy-first personal knowledge management (PKM) platform engineered with clean architecture, high-precision retrieval-augmented generation (RAG), asynchronous document indexing, and strict user-level data isolation.

See [DEMO.md](DEMO.md) for the Docker, Jenkins, and Kubernetes walkthrough.

---

## 1. System Architecture

```
                    ┌───────────────────────────────────────────────┐
                    │     Frontend: Next.js 14 + TipTap + Zustand   │
                    │   (Dark Charcoal, Warm Surfaces, Purple UI)   │
                    └───────────────────────┬───────────────────────┘
                                            │ HTTP / REST
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │     Backend API: Node.js / Express / TS       │
                    │   - JWT Auth & User Scoping Isolation         │
                    │   - Notes, Folders & Tags CRUD                │
                    │   - Multer Document Upload Validator          │
                    │   - Redis Task Dispatcher & Background Jobs   │
                    └───────────────┬───────────────────────────────┘
                                    │
            ┌────────────────────────┴────────────────────────┐
            ▼                                                 ▼
┌───────────────────────────┐                     ┌───────────────────────────┐
│       PostgreSQL 16       │                     │    Python 3.11 FastAPI    │
│  - Relational Schema      │                     │  - PDF/DOCX/OCR Pipeline  │
│  - Multi-tenant records   │                     │  - Recursive Chunker      │
│  - Optimistic concurrency │                     │  - SentenceTransformers   │
│  - Prisma Migrations      │                     │  - RAG Citation Generator │
└───────────────────────────┘                     │  - AI Auto-Tagger Engine  │
                                                   └─────────────┬─────────────┘
                                                                 │
                                                                 ▼
                                                   ┌───────────────────────────┐
                                                   │       Qdrant Vector DB    │
                                                   │  - 384-dim / 768-dim      │
                                                   │  - user_id Payload Filter │
                                                   │  - Cosine Hybrid Search   │
                                                   └───────────────────────────┘
```

---

## 2. Core Features (Implemented)

### FEATURE 1: Rich Text Notes Editor
- Built with extensible **TipTap** (H1–H3, Bold, Italic, Underline, Strikethrough, Bullet/Numbered Lists, Checklists/Task Lists, Blockquotes, Syntax-highlighted Code Blocks, Tables, Hyperlinks).
- **Debounced Autosave (700ms)** with visual state indicators (`Saved`, `Saving...`, `Unsaved changes`, `Edit conflict`).
- **Optimistic Concurrency Control**: Tracks integer version increments; prevents silent overwriting during concurrent tabs or updates.
- Folder hierarchies, tag management, favorite/pin toggle, and archive/restore lifecycle.
- Dirty navigation warnings (`beforeunload`) to prevent accidental data loss.

### FEATURE 2: AI-Powered Semantic Search
- Converts natural language queries into dense vector embeddings using `all-MiniLM-L6-v2` (or Google Gemini / OpenAI embeddings).
- High-speed vector similarity queries executed against **Qdrant** with strict `user_id` payload isolation.
- Displays relevance match percentages, source type badges (`Note` vs `Document`), and contextual highlighted excerpts.
- Filters by source type, folder, or tag with real-time debounced search.

### FEATURE 3: RAG-Based AI Chat With Notes
- Dedicated conversational workspace grounded exclusively on the user's indexed notes and document chunks.
- Multi-turn conversation history tracking.
- **Verifiable Citations**: Every answer provides clickable source cards displaying the exact source title, source type, page number, match score, and expandable excerpt.
- Strict anti-hallucination prompt guard: Never invents nonexistent notes and explicitly clarifies if the knowledge base lacks information on the requested topic.

### FEATURE 4: Automatic AI Tagging and Categorization
- Analyzes note title and body asynchronously or on-demand.
- Identifies main subject, suggests appropriate category (e.g. `DevOps`, `Architecture`, `AI/ML`), and generates concise tags.
- Re-uses existing user tags where appropriate to maintain a clean ontology without duplicate synonyms.
- Extracts key technical entities and suggests related notes already existing in the vault.
- **User Agency**: 1-click interface to accept all, accept selected, or modify suggestions.

### FEATURE 5: PDF and Document Intelligence
- Secure multi-format upload validator supporting **PDF**, **DOCX**, **TXT**, and **Markdown** (up to 25MB).
- Text extraction preserving page numbers, structure, and tables.
- OCR fallback capability via `pytesseract` for scanned or image-based PDF pages.
- Recursive semantic chunking (~800 characters with 150-character boundary overlap).
- Background worker status tracking (`uploaded` ➔ `processing` ➔ `indexed` ➔ `failed`).
- Delete capability removes physical files, database chunks, and vector points from Qdrant.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, TipTap, Zustand, Lucide Icons |
| **Backend API** | Node.js, Express.js, TypeScript, Prisma ORM, Multer, Bcrypt, JWT, Zod |
| **AI Microservice** | Python 3.11, FastAPI, Pydantic, Qdrant Client, SentenceTransformers, PyPDF, pdfplumber, python-docx, pytesseract |
| **Databases** | PostgreSQL 16 (Relational DB), Qdrant (Vector DB), Redis 7 (Cache & Queues) |
| **DevOps & Infra** | Docker, Docker Compose, GitHub Actions CI/CD |

---

## 4. Quick Start Guide

### Prerequisites
- [Docker & Docker Compose](https://www.docker.com/) (Recommended)
- Or Node.js 20+ and Python 3.11+ for bare-metal setup.

### Option A: Run via Docker Compose (Recommended)

1. Clone the repository and navigate into the project directory:
   ```bash
   git clone https://github.com/shabnam-111/notes-app.git
   cd notes-app
   ```

2. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```
   *(Optional: Add your `GEMINI_API_KEY` or `OPENAI_API_KEY` into `.env` to enable cloud LLM models. If left blank, MindVault runs with local SentenceTransformers embeddings and zero external API calls.)*

3. Start all services:
   ```bash
   docker compose up --build
   ```

4. Access the services:
   - **Frontend Workspace**: `http://localhost:3000`
   - **Backend REST API**: `http://localhost:4000/api/v1`
   - **AI Microservice**: `http://localhost:8000/docs`
   - **Qdrant Vector Dashboard**: `http://localhost:6333/dashboard`

---

### Option B: Local Bare-Metal Development

#### 1. Backend Service
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed   # Seeds demo account demo@mindvault.ai / Password123!
npm run dev
```

#### 2. Python AI Service
```bash
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 3. Frontend Web Client
```bash
cd frontend
npm install
npm run dev
```

---

## 5. Default Demo Credentials

You can sign in immediately using the pre-seeded account:
- **Email**: `demo@mindvault.ai`
- **Password**: `Password123!`
*(Or click the "Fill Demo Account Credentials" shortcut directly on the login screen).*

---

## 6. Running Tests

### Backend Unit & Isolation Tests (Vitest)
```bash
cd backend
npm test
```
*Validates JWT authentication, password hashing, note CRUD, optimistic locking concurrency, and cross-user data isolation.*

### AI Service Tests (Pytest)
```bash
cd ai-service
python -m pytest tests -v
```
*Validates semantic chunking, token counts, deterministic vector generation, cross-tenant vector isolation, and citation assembly.*
