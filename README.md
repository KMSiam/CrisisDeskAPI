# CrisisDesk API: Intelligent Backend API for Emergency & Service Request Triage

CrisisDesk API is a production-grade, AI-powered emergency triage backend API. It receives emergency reports from citizens, automatically detects the language (prioritizing Bangla and phonetic Banglish), translates and processes them using Google Gemini AI, assigns urgency, detects duplicates via pgvector cosine similarity, and provides admin management endpoints.

## 🚀 Key Features

1. **Bangladesh Context Priority (Bangla/Banglish Support)**: Real-time detection and translation of Bangla and phonetic Banglish (e.g., *"Sylhet Bondor Bazar e agun lagse"*) to English to maintain high classification accuracy.
2. **Multi-AI Resilient Pipeline (Circuit Breaker)**: High availability using Google Gemini AI as the primary processor and failing over to OpenRouter (Llama 3.1 8B Instruct) after 3 consecutive failures, with a 5-minute cooldown.
3. **Advanced Duplicate Detection**: Uses 768-dimensional embeddings (`gemini-embedding-001`) with pgvector's HNSW index to calculate cosine similarity and identify duplicate emergency reports submitted within 72 hours.
4. **Robust Admin Management**: JWT-secured endpoints for status management and analytical summaries.
5. **Auto-Generated API Documentation**: Interactive Swagger/OpenAPI documentation hosted at `/api/docs`.

---

## 🛠️ Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Runtime** | Node.js (ES Modules) | Excellent async execution and performance. |
| **Language** | TypeScript | Strong typing and compilable verification. |
| **Framework** | Express.js | Speed, simplicity, and middleware ecosystem. |
| **Database** | Neon PostgreSQL | Serverless, scaling, and native `pgvector` support. |
| **ORM** | Prisma | Typesafe database client and migrations. |
| **AI (Primary)** | Google Gemini API (`@google/genai`) | Classification, translation, and embeddings (`gemini-embedding-001`). |
| **AI (Backup)** | OpenRouter Llama 3.1 | OpenAI-compatible SDK failover. |
| **Authentication** | JWT (`jsonwebtoken`) | Security for admin management routes. |
| **Validation** | Zod | Deep input schema validation and parsing. |

---

## 📦 Project Setup

### Prerequisites
- Node.js >= 20.x
- Neon PostgreSQL database URL (with `pgvector` extension)
- Google Gemini API Key

### Installation

1. Clone the repository and navigate to the directory:
   ```bash
   cd CrisisDeskAi
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env` (refer to `.env.example`):
   ```env
   DATABASE_URL="postgresql://neondb_owner:npg_...aws.neon.tech/neondb?sslmode=require"
   GEMINI_API_KEY="AIzaSy..."
   OPENROUTER_API_KEY="sk-or-v1-..."
   JWT_SECRET="supersecretadminsecretkey"
   PORT=3000
   NODE_ENV=development
   ```

4. Run migrations to set up database tables and pgvector HNSW index:
   ```bash
   npx prisma migrate dev
   ```

5. Seed the database with sample emergency reports and admin details:
   ```bash
   npm run prisma:seed
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000`. Access Swagger documentation at `http://localhost:3000/api/docs`.

---

## 🧪 Testing

The API uses Vitest + Supertest for integration and unit testing with mocked AI services.

Run tests:
```bash
npm run test
```

---

## 🛡️ API Endpoints

Detailed schemas are available interactively at `/api/docs`.

### Auth Endpoints
- **POST** `/api/auth/register`: Create a new admin account.
- **POST** `/api/auth/login`: Log in to receive a JWT bearer token.

### Public Endpoints
- **POST** `/api/reports`: Submit an emergency or service request report.
  ```json
  {
    "name": "Rahim",
    "contact": "017xxxxxxxx",
    "location": "Sylhet Bondor Bazar",
    "description": "Sylhet Bondor Bazar e ekjon stroke koreche. Taratari ambulance lagbe.",
    "language": "bn"
  }
  ```
- **GET** `/api/reports`: List all reports with search, category, urgency, status, and date range filters (paginated).
- **GET** `/api/reports/:id`: Retrieve single report details.
- **GET** `/api/reports/stats/summary`: Analytics summary dashboard.

### Admin-Only Endpoints (Requires Authorization: `Bearer <JWT_TOKEN>`)
- **PATCH** `/api/reports/:id/status`: Update report status (`pending`, `in_review`, `assigned`, `resolved`, `rejected`).
- **DELETE** `/api/reports/:id`: Delete a report.
