# CampusConnect AI Services Module

The **AI Services Module** is a high-performance microservice powering automated listing generation, price estimation, wanted-post semantic matching, and OCR duplicate detection for CampusConnect.

Built with **FastAPI**, **Groq Vision API** (`qwen/qwen3.8-27b`), and integrated with the project's **Express + MongoDB/Mongoose** backend and **React** frontend.

---

## Quick Start & Local Setup

### 1. Environment Configuration

In the `ai/` directory, copy the example environment file:

```powershell
cp .env.example .env
```

Configure your credentials in `.env`:

```ini
# Groq API Key (get from https://console.groq.com/keys)
GROQ_API_KEY=your_groq_api_key_here

# Mode: 'false' for live Groq Vision API, 'true' for offline mock mode
AI_MOCK_MODE=false

# Vision model on Groq
GROQ_VISION_MODEL=qwen/qwen3.8-27b

# Optional Redis connection for matching event stream
REDIS_URL=redis://localhost:6379
MATCH_EVENT_CHANNEL=match.found
```

> **Security Note:** `.env` is included in `.gitignore` to prevent committing sensitive keys. Never commit API keys to version control.

### 2. Install Dependencies & Run AI Service

```powershell
cd ai
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

Once running:
- **Interactive Swagger Documentation:** [http://localhost:8001/docs](http://localhost:8001/docs)
- **Service Health Check:** [http://localhost:8001/api/v1/health](http://localhost:8001/api/v1/health)

### 3. Run Backend & Frontend

In separate terminals:

**Backend (Express + MongoDB):**
```powershell
cd backend
npm.cmd install
npm.cmd run dev
```

**Frontend (Vite + React):**
```powershell
cd Frontend
npm.cmd install
npm.cmd run dev
```

---

## API Endpoints Reference

| HTTP Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Service health status, operating mode (`live`/`mock`), and active model. |
| `POST` | `/api/v1/listings/suggest`<br>`/api/v1/listings/generate` | Generates listing details from `image_base64` or `image_url` + optional seller hints. |
| `POST` | `/api/v1/listings/generate-upload` | Multipart form endpoint accepting direct image file upload and optional hints. |
| `POST` | `/api/v1/pricing/estimate` | Estimates price using same-category comparables, IQR outlier filtering, and condition adjustment. |
| `POST` | `/api/v1/matching/evaluate` | Evaluates and ranks open wanted posts against a newly published listing. |
| `POST` | `/api/v1/ocr/check-upload` | Ingests PDF or image documents and extracts canonical text via OCR. |
| `POST` | `/api/v1/ocr/check` | Compares extracted document text against an existing corpus for duplicates. |

---

## API Request & Response Examples

### Listing Generation (`POST /api/v1/listings/suggest`)

**Request (JSON):**
```json
{
  "image_base64": "<base64-encoded-image>",
  "content_type": "image/jpeg",
  "name_or_brand": "Casio FX-991EX",
  "age": "6 months",
  "condition": "like_new",
  "description": "Used for one calculus semester; all keys and display work perfectly."
}
```

**Response (JSON):**
```json
{
  "title": "Casio FX-991EX ClassWiz Scientific Calculator",
  "category": "Electronics",
  "description": "Casio FX-991EX ClassWiz scientific calculator in like-new condition. Ideal for engineering, mathematics, and physics coursework. Features high-resolution LCD display and full key responsiveness with no cosmetic defects.",
  "condition": "like_new",
  "condition_display": "Like New",
  "estimated_price": 550.0,
  "tags": ["casio", "calculator", "engineering", "electronics", "classwiz"],
  "source": "groq",
  "ai_metadata": {
    "model": "qwen/qwen3.8-27b",
    "source": "groq",
    "generated_at": "2026-10-21T17:15:00.000Z"
  }
}
```

### Direct Multipart Image Upload (`POST /api/v1/listings/generate-upload`)

**curl command:**
```powershell
curl -X POST "http://localhost:8001/api/v1/listings/generate-upload" `
  -F "file=@sample_item.jpg;type=image/jpeg" `
  -F "name_or_brand=Casio FX-991EX" `
  -F "age=6 months" `
  -F "condition=like_new"
```

---

## MongoDB / Mongoose Schema Integration

The generated listings map directly to the existing Mongoose `Listing` schema:

1. **Title, Description, Category, Condition:** Automatically populated into `ListingForm.jsx`.
2. **Category Matching:** The backend controller checks MongoDB's `Category` collection and matches the AI suggested category name or slug to an active `Category._id`.
3. **Condition Normalization:** Validated against the Mongoose enum `['new', 'like_new', 'good', 'fair', 'poor']`.
4. **AI Metadata Persistence (`aiMeta`):** Stores `{ isAiGenerated: true, source: 'groq', model: 'qwen/qwen3.8-27b', ... }` in MongoDB.
5. **Draft Review Workflow:** Users can edit any field before submitting. Clicking **"Save Draft"** saves the listing to MongoDB with `status: 'draft'`, allowing students to review and polish listings later before publishing.

---

## Testing & Verification

### Run AI Microservice Test Suite

```powershell
cd ai
.\.venv\Scripts\python.exe -m unittest test_ai_service.py
```
*(Executes 13 automated tests covering health check, input validation, resolution checks, hint synthesis, condition normalization, pricing, matching, and OCR deduplication).*

### Run Backend Integration Tests

```powershell
cd backend
npm.cmd test
```
*(Executes 10 automated test suites verifying auth, controllers, AI controller validation, and Mongoose schema instantiation with `aiMeta`).*

### Verify Frontend Production Build

```powershell
cd Frontend
npm.cmd run build
```

---

## Mid-Project Evaluation Documentation

For the in-depth architectural analysis, mathematical formulations, and research blueprints for **Price Estimation**, **Intelligent Listing Matching**, and **OCR-Based Duplicate Detection**, see:
- [RESEARCH_AND_PLANNING.md](RESEARCH_AND_PLANNING.md)
