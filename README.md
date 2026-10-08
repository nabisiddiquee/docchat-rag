# DocChat: Chat with your PDFs (RAG)

Upload PDFs and ask questions in plain English. DocChat finds the most relevant passages with vector search and asks an LLM to answer **only from those passages**, with numbered citations back to the source. If the documents do not contain the answer, it says so instead of guessing.

Built with **NestJS, TypeScript, Prisma ORM, PostgreSQL + pgvector** and any **OpenAI-compatible LLM**.

## How it works

```
 Upload PDF ──► extract text ──► clean + split into overlapping chunks ──► embed ──► store in pgvector
                                                                                         │
 Question ──► embed ──► cosine search (HNSW index) ──► top-k passages ──► LLM prompt ──► answer + [1][2] sources
```

1. **Ingestion**: `pdf-parse` extracts text; the chunker normalises it and splits on sentence boundaries (default 900 chars, 150-char overlap so context is not lost between chunks).
2. **Embeddings**: chunks are embedded in batches (`text-embedding-3-small`, 1536 dimensions) and stored in a `vector(1536)` column.
3. **Retrieval**: the question is embedded and matched with pgvector's cosine distance operator `<=>`, served by an **HNSW** index. Weak matches below `MIN_SIMILARITY` are dropped.
4. **Generation**: the top passages are numbered and sent with a strict system prompt (answer only from context, cite passages, admit when the answer is missing). If nothing relevant is retrieved, the LLM is not called at all.

## Features

- PDF upload with size and type validation (15 MB limit)
- Sentence-aware chunking with overlap
- Vector search with pgvector + HNSW index, optional filter by document
- Grounded answers with numbered source citations and similarity scores
- Pluggable LLM layer: OpenAI or any OpenAI-compatible API (Azure OpenAI, Groq, Ollama), with retry and backoff on 429/5xx
- **Offline mock provider** (`LLM_PROVIDER=mock`) to run and test without an API key
- Simple web UI at `/` and Swagger docs at `/docs`
- Jest unit tests, Docker and docker-compose (pgvector image)

## Tech stack

| Layer | Tools |
|---|---|
| API | NestJS 10, TypeScript |
| Database | PostgreSQL 16, pgvector (HNSW, cosine), Prisma ORM 7 with `@prisma/adapter-pg` |
| AI | OpenAI-compatible embeddings and chat completions |
| Parsing | pdf-parse |
| Testing | Jest, ts-jest |
| DevOps | Docker, docker-compose |

## Run locally

Needs PostgreSQL with the pgvector extension (the Docker setup includes it).

```bash
npm install
cp .env.example .env            # add OPENAI_API_KEY, or set LLM_PROVIDER=mock
npx prisma generate
npx prisma migrate deploy       # creates tables, the vector column and the HNSW index
npm run start:dev
```

Open `http://localhost:3000` for the UI and `http://localhost:3000/docs` for Swagger.

### With Docker

```bash
cp .env.example .env
docker compose up --build
docker compose exec api npx prisma migrate deploy
```

### Without an API key

Set `LLM_PROVIDER=mock` and `MIN_SIMILARITY=0.05`. The mock uses hashed bag-of-words embeddings and returns the best-matching sentence as the answer. It is meant for development and tests, not for answer quality.

## API

| Method | Endpoint | What |
|---|---|---|
| POST | `/api/documents` | Upload a PDF (`multipart/form-data`, field `file`, optional `title`) |
| GET | `/api/documents` | List documents |
| GET | `/api/documents/:id` | One document |
| DELETE | `/api/documents/:id` | Delete a document and its chunks |
| POST | `/api/chat` | `{ "question": "...", "documentId?": "...", "topK?": 5 }` |

Example response:

```json
{
  "answer": "Employees get 18 days of annual leave every calendar year [1].",
  "sources": [
    { "ref": 1, "title": "Employee Handbook", "part": 1, "score": 0.71, "snippet": "Leave policy. Employees get 18 days..." }
  ],
  "provider": "openai",
  "tookMs": 840
}
```

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `LLM_PROVIDER` | `openai` | `openai` or `mock` |
| `OPENAI_API_KEY` | | API key |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Point to any OpenAI-compatible server |
| `CHAT_MODEL` | `gpt-4o-mini` | Model used to answer |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Must return 1536 dimensions |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | `900` / `150` | Chunking |
| `MIN_SIMILARITY` | `0.2` | Drop passages below this cosine similarity |

## Tests

```bash
npm test
```

Covers text normalisation, chunk size and overlap, prompt building, pgvector literals, the mock provider and the retrieval guard (no LLM call when nothing relevant is found).

## License

MIT
