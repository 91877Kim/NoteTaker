# Cursor Instruction File — Paper Note Agent

## Goal
Build a web app where a user uploads a scientific paper or other publication, gets an initial rough note automatically generated, then chats with an in-built LLM agent about confusing or interesting parts. When the discussion reveals a useful clarification, the agent should propose a **targeted patch** to the existing note rather than silently rewriting it. The user can **accept or reject** the patch. If accepted, the note is updated and remains a living document shaped by the conversation.

This product is **not** just a PDF chat app and **not** just a summarizer. The core interaction is:

1. Upload source document.
2. Parse document into retrievable chunks.
3. Generate first-pass structured note.
4. User asks a question about a specific part.
5. Agent answers using source-grounded retrieval.
6. Agent proposes an explicit note update.
7. User approves or rejects.
8. Accepted changes are committed into the note with history.

---

## Product Requirements

### Core user story
As a user reading a paper, I want to build a note that updates through conversation, so I do not need to manually rewrite my notes every time I understand a section better.

### Non-negotiable behaviors
- The app must treat the uploaded document as the primary source.
- The app must support **source-grounded answers** with references to exact pages or chunk locations.
- The agent must **not** directly edit the note without proposing a patch first.
- Every patch must be scoped to a specific section or block of the note.
- The user must be able to review, accept, or reject each patch.
- Accepted patches must be saved in version history.
- Rejected patches should remain visible in history as rejected suggestions.
- The note should remain structured and readable rather than becoming a raw chat log.

### Nice-to-have behaviors
- Let the user highlight a note paragraph and ask the agent to expand/clarify it.
- Let the user highlight a passage in the PDF and ask the agent to explain it and propose a note patch.
- Let the app show side-by-side diff preview before commit.
- Let the user request different note modes: concise revision notes, deep reading notes, exam-oriented notes, or literature review notes.

---

## MVP Scope

### In scope
- User authentication.
- Upload PDF.
- Parse PDF text.
- Generate initial rough note.
- Chat with retrieval over the uploaded paper.
- Agent can propose note patches.
- User can accept or reject proposed patch.
- Note updates persist.
- Version history persists.
- Citations for answers and patch rationale.

### Out of scope for MVP
- Multi-document synthesis.
- Collaborative editing.
- Reference manager integrations.
- OCR for scanned PDFs unless necessary.
- Audio/video source handling.
- Full mobile app.

---

## Recommended Tech Stack

Use a pragmatic stack optimized for fast iteration in Cursor.

### Frontend
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Query or built-in server actions where appropriate
- PDF viewer: react-pdf or pdf.js
- Rich text note editor: TipTap preferred

### Backend
- Next.js API routes or Route Handlers for MVP
- Node.js / TypeScript
- PostgreSQL via Prisma
- pgvector for embeddings if using Postgres-based vector retrieval

### AI / Retrieval
- LLM for note generation, Q&A, and patch proposal
- Embedding model for chunk retrieval
- Retrieval pipeline over parsed paper chunks

### Auth / Storage
- Clerk or NextAuth for auth
- Upload storage: S3 or Supabase Storage

### Observability
- Basic structured logs
- Capture prompt/response metadata, but do not store raw paper text redundantly if avoidable

---

## Suggested Architecture

### Main entities
- `User`
- `Document`
- `DocumentChunk`
- `Note`
- `NoteSection` or `NoteBlock`
- `ChatThread`
- `ChatMessage`
- `PatchProposal`
- `PatchDecision`
- `NoteVersion`

### High-level flow

#### 1. Document upload and processing
- User uploads PDF.
- Backend stores file metadata.
- Parsing pipeline extracts text page by page.
- Text is chunked with overlap.
- Chunks are embedded and stored for retrieval.
- A document processing status is tracked.

#### 2. Initial note generation
- Once processing is complete, generate a first-pass structured note.
- The note should be sectioned, for example:
  - Overview
  - Research question
  - Background
  - Methods
  - Results
  - Interpretation
  - Limitations
  - Terms to clarify
- Save this as `NoteVersion 1`.

#### 3. Conversational clarification loop
- User asks a question in chat, optionally anchored to:
  - a note section,
  - a note block,
  - a PDF selection,
  - or a general paper question.
- Retrieval fetches relevant chunks.
- LLM answers grounded in those chunks.
- LLM separately proposes a note patch in structured format.

#### 4. Patch review and commit
- UI shows:
  - answer,
  - evidence/citations,
  - proposed patch,
  - diff preview.
- User clicks accept or reject.
- If accepted:
  - patch is applied,
  - note content updates,
  - new version stored.
- If rejected:
  - patch stored as rejected,
  - note unchanged.

---

## UX Requirements

### Main layout
Three-pane layout on desktop:

#### Left pane
- Document outline / pages / upload list

#### Center pane
- Note editor / structured note view

#### Right pane
- Chat with agent
- Proposed patch card below relevant response

Alternative layout acceptable: PDF left, note center, chat right.

### Key UI components
- Upload area
- PDF viewer with page navigation
- Structured note editor
- Chat panel
- Citation chips linking to pages/chunks
- Patch proposal card
- Inline diff viewer
- Accept / Reject buttons
- Version history drawer

### Patch card fields
Each patch proposal must contain:
- target note section or block id
- patch type: insert / replace / append / rewrite
- rationale
- source citations
- proposed text
- confidence level

### Note editing rules
- User can edit note manually.
- AI patches should target stable block IDs rather than fragile raw string positions.
- Avoid entire-document rewrites unless explicitly requested by the user.

---

## AI Behavior Specification

### Important
Separate the AI outputs into **three different concerns**:

1. **Answer** to the user question
2. **Evidence** from source document
3. **Patch proposal** for the note

Do not merge these into one blob.

### Initial note generation prompt behavior
The initial summarizer should:
- produce a rough but structured note
- preserve uncertainty where the paper is unclear
- avoid hallucinating missing details
- include placeholders like “unclear from current read” where needed
- be optimized for revision usefulness, not literary polish

### Chat answer behavior
The chat agent should:
- answer using retrieved chunks from the uploaded document first
- explicitly distinguish direct evidence from inference
- say when the document does not state something clearly
- explain confusing methods/results in plainer language if asked

### Patch proposal behavior
The patch proposer should:
- decide whether the note should be updated at all
- propose **minimal, local changes** where possible
- avoid duplicating content already present
- preserve note structure and style
- include citations supporting the change

### When not to propose a patch
Do not propose a patch if:
- the user asked a purely off-topic question
- the answer does not improve the note
- the proposed change would be redundant
- the source support is too weak

### Structured patch output
Have the model return strict JSON for patch proposals.

Example schema:

```json
{
  "should_propose_patch": true,
  "target_block_id": "results-main-1",
  "patch_type": "replace",
  "rationale": "The user asked for clarification of the main result, and the current note omits the key comparison and effect direction.",
  "citations": [
    {"page": 5, "chunk_id": "chunk_22"},
    {"page": 6, "chunk_id": "chunk_26"}
  ],
  "proposed_text": "The main result is that ...",
  "confidence": 0.87
}
```

The conversational answer can be separate JSON or a separate model call.

---

## Data Model

Use Prisma.

### Example models

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  documents Document[]
  notes     Note[]
  threads   ChatThread[]
  createdAt DateTime @default(now())
}

model Document {
  id          String          @id @default(cuid())
  userId      String
  user        User            @relation(fields: [userId], references: [id])
  title       String
  fileUrl     String
  status      DocumentStatus
  pageCount   Int?
  chunks      DocumentChunk[]
  notes       Note[]
  createdAt   DateTime        @default(now())
}

model DocumentChunk {
  id          String   @id @default(cuid())
  documentId  String
  document    Document @relation(fields: [documentId], references: [id])
  pageNumber  Int?
  content     String
  embedding   Unsupported("vector")?
  chunkIndex  Int
}

model Note {
  id          String        @id @default(cuid())
  documentId  String
  document    Document      @relation(fields: [documentId], references: [id])
  title       String
  currentJson Json
  versions    NoteVersion[]
  blocks      NoteBlock[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

model NoteBlock {
  id          String   @id @default(cuid())
  noteId       String
  note         Note     @relation(fields: [noteId], references: [id])
  blockKey     String
  sectionTitle String?
  content      String
  orderIndex   Int
}

model NoteVersion {
  id          String   @id @default(cuid())
  noteId       String
  note         Note     @relation(fields: [noteId], references: [id])
  versionNum   Int
  snapshotJson Json
  createdAt    DateTime @default(now())
}

model ChatThread {
  id          String        @id @default(cuid())
  userId       String
  user         User          @relation(fields: [userId], references: [id])
  documentId   String
  document     Document      @relation(fields: [documentId], references: [id])
  messages     ChatMessage[]
  createdAt    DateTime      @default(now())
}

model ChatMessage {
  id          String    @id @default(cuid())
  threadId     String
  thread       ChatThread @relation(fields: [threadId], references: [id])
  role         String
  content      String
  createdAt    DateTime  @default(now())
}

model PatchProposal {
  id             String      @id @default(cuid())
  noteId          String
  note            Note        @relation(fields: [noteId], references: [id])
  threadId        String?
  targetBlockId   String?
  patchType       String
  rationale       String
  proposedText    String
  citationsJson   Json
  status          PatchStatus
  createdAt       DateTime    @default(now())
}

enum DocumentStatus {
  UPLOADING
  PROCESSING
  READY
  FAILED
}

enum PatchStatus {
  PENDING
  ACCEPTED
  REJECTED
}
```

Adjust schema if needed, but preserve the separation between note state, version history, and proposed patches.

---

## API Routes / Server Actions

### Required endpoints
- `POST /api/documents/upload`
- `POST /api/documents/:id/process`
- `POST /api/documents/:id/generate-note`
- `POST /api/chat/:threadId/message`
- `POST /api/patches/:id/accept`
- `POST /api/patches/:id/reject`
- `GET /api/notes/:id`
- `GET /api/notes/:id/versions`

### Chat endpoint contract
Input:
- user message
- thread id
- optional selected note block id
- optional selected PDF location

Output:
- answer text
- citations
- optional patch proposal object

---

## Retrieval Design

### Chunking
- Chunk by semantic paragraph windows, not arbitrary fixed token counts only.
- Include page number and chunk index metadata.
- Use overlap.
- Keep chunk size moderate so citations remain precise.

### Retrieval
- Top-k semantic retrieval from the document chunks.
- Optionally rerank before sending context to the LLM.
- Always carry citations through to the answer and patch rationale.

### Grounding rule
If evidence is weak or ambiguous, the model must say so.

---

## Patch Application Logic

### Important implementation detail
Do not patch raw note text with naive string replacement.
Use block-based note structure.

Each note should be stored as structured JSON or a list of blocks. A patch should target one block id or section id.

### Patch types
- `insert_before`
- `insert_after`
- `replace`
- `append`
- `prepend`
- `split_block`

### Accept flow
When accepting a patch:
1. Validate target block exists.
2. Apply transformation deterministically.
3. Save updated note blocks.
4. Create new `NoteVersion` snapshot.
5. Mark patch accepted.

### Reject flow
- Mark patch rejected.
- Preserve record for history.

---

## Suggested Development Order

### Phase 1
- Scaffold Next.js app
- Set up auth
- Set up Prisma/Postgres
- Add PDF upload
- Add document list page

### Phase 2
- Add PDF parsing and chunk storage
- Add embeddings and retrieval
- Add processing state UI

### Phase 3
- Generate initial structured note
- Store note blocks + version 1
- Render note in editor

### Phase 4
- Add chat UI
- Add grounded answer generation
- Show citations

### Phase 5
- Add patch proposal generation
- Add patch preview card
- Add accept/reject actions
- Add version history

### Phase 6
- Polish UX
- Add anchor-based questioning from selected note block / PDF region
- Add error handling and guardrails

---

## Guardrails

### Avoid these mistakes
- Do not silently mutate the note.
- Do not let the agent answer without grounding in retrieved chunks when the question is about the uploaded paper.
- Do not rewrite the whole note when a local edit is enough.
- Do not lose prior versions.
- Do not collapse answer and patch into one unstructured paragraph.
- Do not make citation support optional.

### Error cases
Handle:
- PDF parse failure
- empty extraction
- low-confidence retrieval
- patch target no longer valid because note changed
- model returns malformed JSON

For malformed patch JSON, retry once with a strict repair prompt, then fail gracefully.

---

## UI/UX Quality Bar

The product should feel like a serious reading tool, not a toy chatbot.

### Style direction
- Clean academic workspace
- Dense but readable
- Minimal visual noise
- Strong information hierarchy
- Citations easy to inspect
- Diffs easy to scan

### Interaction quality
- Fast loading states
- Clear processing states
- No mysterious AI actions
- Every note change traceable to a human approval event

---

## Example User Flow

1. User uploads a Nature paper PDF.
2. App processes it and generates first-pass note.
3. User clicks a sentence in Results and asks: “What exactly does this comparison imply?”
4. Chat agent retrieves the relevant chunks and explains the comparison.
5. Agent proposes: “Replace the current result-summary paragraph with this clearer explanation.”
6. UI shows diff plus citations to pages 4 and 5.
7. User accepts.
8. The note updates and version history records the change.

---

## Deliverables Cursor Should Build

### Pages
- Dashboard page
- Document detail page
- Reading workspace page

### Components
- UploadDropzone
- PdfViewer
- NoteEditor
- ChatPanel
- CitationChip
- PatchProposalCard
- DiffViewer
- VersionHistoryDrawer

### Backend modules
- pdf parsing service
- chunking service
- embedding service
- retrieval service
- note generation service
- patch proposal service
- patch application service

### Database
- Prisma schema and migrations

---

## Coding Expectations

- Use TypeScript everywhere.
- Keep modules small and composable.
- Prefer explicit types over vague objects.
- Write clean server/client separation.
- Add comments only where they clarify non-obvious logic.
- Use Zod for request validation and AI JSON schema validation.
- Use optimistic UI carefully; patch acceptance should still confirm persisted success.

---

## First Task for Cursor

Start by scaffolding the app and implementing the end-to-end skeleton with mocked AI:

1. Next.js app with three-pane reading workspace.
2. Upload PDF and store metadata.
3. Create placeholder parsed chunks.
4. Generate mocked initial note.
5. Chat panel accepts user question.
6. Return mocked answer + mocked patch proposal.
7. Accept/reject patch updates note state and version history.

Do this before integrating real model calls. The main goal is to validate the product interaction loop first.

---

## Second Task for Cursor

After the mocked flow works:
- integrate real PDF parsing
- integrate retrieval
- integrate real grounded LLM answers
- integrate real patch proposal JSON generation

---

## Final instruction
If implementation choices are ambiguous, optimize for the core loop:
**source-grounded discussion -> explicit patch proposal -> human approval -> versioned note update**

Anything that does not strengthen this loop is secondary.

