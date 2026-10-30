# TeamBrain

TeamBrain is a collaborative AI memory workspace. Each member has private assistant conversations and private extracted memories. Members can submit knowledge to a team or project for review. Search applies personal ownership, team membership, or project membership in the MongoDB Vector Search query itself. Assistant responses keep the IDs of the memory and confirmed fusion sources they used. Team updates use authenticated Socket.IO rooms.

## What works

- Email/password registration and sign in with signed JWTs, password hashing, API rate limits, and team-role authorization.
- Team creation, role management, adding existing users by email, hashed invitation codes with expiry/use limits, and invite-code registration/join.
- Private persistent conversations, OpenAI chat responses, automatic extraction of durable memories, and persisted per-answer source references.
- Personal, team, and project memory scopes; importance, confidence, stage, source message, expiry, and TTL removal.
- Owner/admin review for team/project submissions, private resubmission, correction proposals, supersession lineage, archive/delete actions, and memory lifecycle audit events.
- Embedding generation, scope-filtered Atlas vector retrieval, source citations, AI synthesis, conflict identification, and a resolution action that supersedes selected sources.
- Project membership and role checks, project tasks, related-memory links, duplicate warnings, and persistent draft/confirmed project fusion records.
- Live team notifications for new contributions and approved memories.
- React/TypeScript/Tailwind UI with chat, memory review/search, fusion, project, and member screens.

## Requirements

- Node.js 22 LTS and npm 10 or newer.
- MongoDB Atlas database with network access for the API host.
- OpenAI API key with access to the configured chat and embedding models.
- An Atlas cluster tier/version that supports MongoDB Vector Search.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env`. Set `MONGODB_URI`, `OPENAI_API_KEY`, and a random `JWT_SECRET` with at least 32 characters. Keep `.env` out of version control.

   PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

3. In Atlas, create the `memories` collection if it does not exist. Create the vector index described below and wait until its status is **READY**.

4. Start both apps:

   ```bash
   npm run dev
   ```

   The web app runs at `http://localhost:5173`; the API runs at `http://localhost:4000`. The frontend defaults to that API URL. To change it, set `VITE_API_URL` for the Vite build.

5. Register the first account and team. In **Members & settings**, create an invite code. Register the other two accounts with that code in the registration form. For existing accounts, sign in and join with the same code. Each user keeps their own assistant conversations and private memories.

On startup, the API backfills explicit scopes on older memory records. Older private memories created before embeddings were stored need one run of `npm run reembed-memories` before they are included in semantic assistant context; this makes OpenAI embedding calls for all current personal and shared memories.

The API readiness endpoint is `GET /api/health`; it reports HTTP 503 while MongoDB is disconnected. `GET /api/health/live` is a dependency-independent liveness check.

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | Runtime mode (`development`, `test`, or `production`). |
| `PORT` | No | `4000` | Express and Socket.IO port. |
| `WEB_ORIGIN` | No | `http://localhost:5173` | Allowed browser origin for CORS and Socket.IO. |
| `MONGODB_URI` | Yes | — | Atlas connection URI and target database. |
| `JWT_SECRET` | Yes | — | JWT signing secret; minimum 32 characters. |
| `JWT_EXPIRES_IN` | No | `7d` | JWT lifetime accepted by `jsonwebtoken` (for example `12h`, `7d`). |
| `OPENAI_API_KEY` | For AI/search | Empty | OpenAI credential. Chat/extraction return `AI_NOT_CONFIGURED` until supplied. |
| `OPENAI_CHAT_MODEL` | No | `gpt-4o-mini` | Chat, extraction, and fusion model. |
| `OPENAI_EMBEDDING_MODEL` | No | `text-embedding-3-small` | Model used for both stored and query vectors. This index is configured for its 1536-dimensional default output. |
| `MONGODB_VECTOR_INDEX` | No | `team_memory_vector` | Atlas Vector Search index name. |
| `VITE_API_URL` | No | `http://localhost:4000/api` | Browser build-time API base URL; use `/api` behind the included Nginx proxy. |
| `WEB_PORT` | No | `8080` | Host port for Docker Compose's web container. |

## MongoDB indexes

Mongoose creates ordinary unique/query indexes for email, team and project membership, project/team lookup, conversation ownership, memory owner/team/project/scope/status, invitation code hashes, fusion records, and tasks. It also creates TTL indexes on invitation expiry and optional memory expiry. Atlas Vector Search indexes are managed separately from ordinary collection indexes.

Create an Atlas **Vector Search** index on the `memories` collection with this definition (also available at [`apps/api/mongodb-vector-index.json`](apps/api/mongodb-vector-index.json)):

```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 1536, "similarity": "cosine" },
    { "type": "filter", "path": "teamId" },
    { "type": "filter", "path": "status" },
    { "type": "filter", "path": "scope" },
    { "type": "filter", "path": "ownerId" },
    { "type": "filter", "path": "projectId" },
    { "type": "filter", "path": "expiresAt" }
  ]
}
```

Name the index `team_memory_vector`, or set `MONGODB_VECTOR_INDEX` to the chosen name. The filter fields are required: personal queries filter by owner and personal status, team queries by team and shared status, and project queries by team, project, and shared status. Every query also excludes expired records before ranking. Create the index before approving shared memories. If it is missing or unavailable, semantic search and chat return `VECTOR_SEARCH_UNAVAILABLE`; no lexical or mock-data fallback is used. MongoDB's current Vector Search index format and filterable BSON field types are documented in [MongoDB Vector Search index fields](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type/) and the [`$vectorSearch` reference](https://www.mongodb.com/docs/atlas/atlas-search/operators-collectors/vectorsearch/).

Treat the embedding model and dimension as an index version. If you change `OPENAI_EMBEDDING_MODEL`, schedule a maintenance window: stop API traffic, remove the old Atlas index, run `npm run reembed-memories` with the new model configured, update `numDimensions` in the Atlas index definition to that model's default output size, recreate the index, wait for it to become ready, then restart the API. The re-embedding command updates every personal and shared memory and can incur OpenAI usage charges proportional to the number and length of memories.

## API

All routes are prefixed with `/api`. Protected routes require `Authorization: Bearer <JWT>`. JSON errors use `{ "error": { "code", "message", "details?" } }`.

| Method | Path | Access | Behavior |
| --- | --- | --- | --- |
| `GET` | `/health/live` | Public | Liveness check. |
| `GET` | `/health` | Public | Readiness check; 503 until MongoDB is connected. |
| `POST` | `/auth/register` | Public | Create `{name,email,password,teamName}`; returns JWT, user, and initial owner team. Password is at least 10 characters. |
| `POST` | `/auth/login` | Public | Verify `{email,password}`; returns JWT and memberships. |
| `GET` | `/auth/me` | JWT | Return current user and teams. |
| `GET` | `/teams` | JWT | List memberships. |
| `POST` | `/teams` | JWT | Create `{name}`; caller is owner. |
| `GET` | `/teams/:teamId/members` | Team member | List member IDs, names, emails, and roles. |
| `POST` | `/teams/:teamId/members` | Owner/admin | Add an existing user with `{email,role?}`. Role is `member` or `admin`. |
| `DELETE` | `/teams/:teamId/members/:userId` | Owner/admin | Remove a member; the last owner cannot be removed. |
| `PATCH` | `/teams/:teamId/members/:userId` | Owner | Change a member's team role. |
| `POST` | `/teams/:teamId/invitations` | Owner/admin | Create a hashed, expiring invitation code with a use limit. The raw code is returned once. |
| `POST` | `/teams/join` | JWT | Join a team using `{code}`. Registration accepts the same `inviteCode`. |
| `GET` | `/projects?teamId=...` | Team/project member | List projects the caller can access. Team owners/admins can see all. |
| `POST` | `/projects` | Team owner/admin | Create `{teamId,name,description?}`; creator becomes project owner. |
| `PATCH` | `/projects/:id` | Project owner/admin | Update name, description, or `status` (`active`/`archived`). |
| `POST` | `/projects/:id/members` | Project owner/admin | Assign an existing team member by `{email,role?}`. |
| `GET` | `/projects/:id/members` | Project member | List project members and roles. |
| `PATCH`/`DELETE` | `/projects/:id/members/:userId` | Project owner/admin | Change role or remove a project member. |
| `GET`/`POST` | `/projects/:id/tasks` | Project member | List tasks or create `{title,description?,dueAt?}`. |
| `PATCH`/`DELETE` | `/tasks/:id` | Project member | Update task fields/status or delete a task created by the caller (admins can delete any). |
| `GET` | `/projects/:id/fusions` | Project member | List saved synthesis records. |
| `POST` | `/projects/:id/fuse` | Project member | Fuse relevant approved team and project memories; creates a draft with source IDs and conflict groups. |
| `POST` | `/fusions/:id/confirm` | Project owner/admin | Confirm a draft; the project assistant can then use it as context. |
| `DELETE` | `/projects/:id` | Project owner/admin | Archive the project. |
| `GET` | `/conversations?teamId=...` | Conversation owner + team member | List the caller's conversations for that team. |
| `POST` | `/conversations` | Team member | Create `{teamId,projectId?,title?}` for the caller. |
| `GET` | `/conversations/:id/messages` | Conversation owner + team member | Read persisted conversation messages. |
| `POST` | `/conversations/:id/messages` | Conversation owner + team member | Send `{content}`; persists user/assistant turns and extracted private memories. |
| `GET` | `/memories?scope=personal` | JWT | List only the caller's personal, submitted, rejected, archived, and superseded memories. |
| `GET` | `/memories?scope=team&teamId=...` | Team member | List team memories and visible submissions. |
| `GET` | `/memories?scope=project&teamId=...&projectId=...` | Project member | List project memories and visible submissions. Project admins see the review queue. |
| `POST` | `/memories` | Team member | Create `{teamId,content,kind,scope,projectId?,stage?,importance?,confidence?,expiresInDays?}`. Shared scopes enter review; personal scope stays private. |
| `POST` | `/memories/:id/share` | Memory owner | Submit a private/rejected memory to team or project review. |
| `PATCH` | `/memories/:id` | Memory owner or scope owner/admin | Edit a private memory or archive an owned/shared memory. |
| `POST` | `/memories/:id/correct` | Memory owner or scope member | Create a linked correction; a shared source remains active until the correction is approved. |
| `POST` | `/memories/:id/approve` | Team/project owner/admin | Embed and publish a pending memory; superseded sources are removed from retrieval. |
| `POST` | `/memories/:id/reject` | Team/project owner/admin | Reject a contribution with optional `{reason}`. |
| `DELETE` | `/memories/:id` | Memory owner or scope owner/admin | Delete a memory and record a lifecycle event. |
| `GET` | `/memories/:id/events` | Memory owner or scope member | Read lifecycle audit events. |
| `POST` | `/memories/search` | Authenticated member | Vector-search `{teamId,scope,projectId?,query,limit?}` with owner/team/project filters in Atlas. |
| `POST` | `/memories/fuse` | Authenticated member | Return an AI synthesis, cited source IDs, and identified conflicting source groups for a scope. |
| `POST` | `/memories/resolve` | Team owner/admin | Publish an agreed `{teamId,memoryIds,content}` resolution; supersedes selected team memories and preserves lineage. |

Socket.IO uses the same JWT in `auth.token`. Clients join team rooms with `team:join(teamId, ack)` and project rooms with `project:join(projectId, ack)`; each join verifies current membership. Clients leave project rooms with `project:leave(projectId)`. `memory:pending` only contains notification metadata; the client refetches through the API, which applies review visibility rules. `memory:shared` includes the approved memory and is emitted only to its authorized team or project room. Membership removal also clears the affected sockets from rooms.

## Memory lifecycle and access rules

Private memories stay `personal` until the owner submits them. Team/project submissions move through `pending` to `shared`, or `rejected` and back to `pending`. Corrections create a new linked submission and only supersede the approved source after review. Near-duplicate approved memories are marked with `duplicateOf` and related links; sources are retained for review. Expiring memories use an Atlas TTL index, and the API sweeper records expiry events before deletion where it runs first. Conversation history remains private even when a derived memory is approved for sharing.

## Tests and production build

```bash
npm test
npm run typecheck
npm run build
```

Tests cover API liveness/readiness, input errors, unauthenticated access, team and project role enforcement, scope-isolated vector filters, memory lifecycle transitions, and fusion citation/conflict source validation. A live MongoDB Atlas and OpenAI key are required to run the three-user acceptance flow through registration, chat, embeddings, approval, correction, vector search, and project fusion. Tests do not substitute mock results for these service calls.

## Docker deployment

1. Create `.env` with production Atlas/OpenAI values, a long random `JWT_SECRET`, and the public frontend origin, for example `WEB_ORIGIN=https://team.example.com`.
2. Ensure the Atlas allowlist and `memories` vector index are ready.
3. Build and run:

   ```bash
   docker compose up --build -d
   ```

   The included Nginx container serves the static React build, proxies `/api` and `/socket.io` to Express, and exposes the app on `WEB_PORT` (8080 by default). Put TLS termination and a domain in front of it using your hosting provider's ingress/load balancer. The API container is not published directly to the host.

The API can also be deployed independently from `Dockerfile.api`; set its environment variables directly in the hosting platform. Build the web image with `VITE_API_URL=/api` when Nginx or an equivalent reverse proxy serves both components from one origin.

## Operational notes

- The app cannot create an Atlas search index through the application. An Atlas administrator creates the index once; its JSON definition is versioned in this repository.
- Chat calls the AI provider before writing either turn. If the provider fails, the failed request does not leave a partial message in the conversation.
- The first version does not include email verification, password reset, organization-wide SSO, data export/deletion workflows, or billing. Deploy behind your organization's account and data-retention policies before onboarding production users.
