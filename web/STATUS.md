# Paper Note Agent — Build Status

## Reference
- Full spec: `../paper_note_agent_cursor_spec.md` (repo root)

## Done
- Next.js app scaffold (App Router, TypeScript, Tailwind) in `web/`
- **Full flow (mocked + real AI):**
  - Dashboard: upload, document list, settings (note generation prompt)
  - Document detail: generate note, rename, delete, link to workspace
  - Reading workspace: 4-pane (PDF viewer | outline | note editor | chat)
  - API: upload, generate-note, chat/message, patches accept/reject, documents PATCH/DELETE
  - PatchProposalCard: Accept/Reject, diff preview for replace patches, CitationChips
  - Version history drawer (History button in workspace header)
  - No auth (hardcoded mock user)
- Prisma + **SQLite** (no Postgres): `prisma/schema.prisma`, migrations applied, `dev.db` created
- All core models: User, Document, DocumentChunk, Note, NoteBlock, NoteVersion, ChatThread, ChatMessage, PatchProposal
- Zod installed for validation

## Next (Second task — real AI)
Build end-to-end skeleton **with mocked AI** (no OpenAI key yet):

1. **Pages**
   - Dashboard: list documents, upload entry
   - Document detail: trigger process + generate note, link to reading workspace
   - Reading workspace: three-pane layout (outline/upload list | note editor | chat)

2. **API / server**
   - `POST /api/documents/upload` — store file metadata, set status UPLOADING → PROCESSING → READY (mock)
   - Mock parsing: create placeholder DocumentChunks for the document
   - `POST /api/documents/[id]/generate-note` — create Note + NoteBlocks + NoteVersion 1 (mocked content)
   - `POST /api/chat/[threadId]/message` — return mocked answer + mocked patch proposal (structured JSON)
   - `POST /api/patches/[id]/accept` — apply patch to note blocks, create new NoteVersion
   - `POST /api/patches/[id]/reject` — set patch status REJECTED
   - `GET /api/notes/[id]`, `GET /api/notes/[id]/versions`

3. **UI**
   - Upload dropzone, document list
   - Note editor (simple or TipTap) showing blocks by blockKey
   - Chat panel: send message, show assistant message + citations + **PatchProposalCard** (target block, patch type, rationale, proposed text, Accept/Reject)
   - Accept/Reject updates note and version history (persisted via API)

4. **Auth**
   - For MVP mock: single hardcoded user or skip auth so all flows work without login.

After this works end-to-end, second task: real PDF parsing, retrieval, and LLM (will need OpenAI API key in `.env`).

## How to resume
Open a new Cursor chat and say: *"Continue the Paper Note Agent from STATUS.md in the web folder — finish the first task (mocked flow)."*
