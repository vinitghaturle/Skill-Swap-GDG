# SkillSwap Hub — LLM-Ready Product Specification

This document is a **single source of truth**. Any LLM or developer reading this should be able to build the product without guessing architecture, ownership, or priorities.

---

## 1. PRODUCT REQUIREMENTS DOCUMENT (PRD)

### 1.1 Product Summary
SkillSwap Hub is a **1:1 peer-to-peer skill exchange platform** where users teach skills they know and learn skills they want in live sessions.

Core value: **high-quality matching + real interaction**, not content consumption.

---

### 1.2 Target Users
- Students
- Early-career developers/designers
- Professionals wanting to upskill

Non-goals:
- No group classes
- No recorded courses
- No marketplaces with money (initially)

---

### 1.3 Core User Journey (ONLY ONE MVP FLOW)
1. User signs in
2. User completes profile + skills
3. System suggests best matches
4. User requests a session
5. Other user accepts
6. Users chat
7. Users start 1:1 video call
8. Session ends
9. Both users rate each other

If a feature does not support this flow, it is **out of scope**.

---

### 1.4 Core Features (MVP)

#### A. Authentication
- Google login
- Email/password login
- Single identity per user

#### B. Profile & Skills
- Bio
- Skills user can TEACH
- Skills user wants to LEARN
- Availability (time slots)
- Language

#### C. Matching System (Deterministic v1)
- Skill overlap (teach ↔ learn)
- Availability overlap
- Language match
- Trust score

Produces:
- Ranked list of matches
- Match score (0–100)
- Explanation text

#### D. Communication
- Realtime chat
- Read/unread status
- Presence indicator

#### E. Sessions
- Request session
- Accept / decline
- Session lifecycle tracking

#### F. Video Calls
- 1:1 peer-to-peer only
- we can use simple peer(optional)
- No recording
- No group calls

#### G. File Sharing
- Upload notes/resources
- Share inside chat/session

#### H. Ratings & Trust
- Rate after session
- Builds trust score

---

### 1.5 Explicit Non-Goals
- Payments
- AI-only matching
- Group calls
- Public file hosting

---

## 2. SYSTEM ARCHITECTURE

### 2.1 Architecture Principle
**Convex-first architecture** with strict ownership boundaries.

Rule: *If two services can do the same thing, one of them must not.*

---

### 2.2 High-Level Components

#### Frontend
- React web app
- Thin client
- No business logic

#### Backend Core
- Convex (primary backend)

#### Auxiliary Services
- Node.js services (limited scope)

#### External Services
- Firebase Auth
- Firebase Cloud Messaging
- Dropbox (file storage)

---

### 2.3 Ownership Breakdown (CRITICAL)

#### Convex (Primary Backend)
Owns:
- Users
- Profiles
- Skills
- Availability
- Matching engine (v1)
- Conversations
- Messages
- Presence
- Session lifecycle
- Call session state
- In-app notifications

Convex **must not**:
- Handle media
- Handle OAuth
- Store raw files

---

#### Node.js Services (Auxiliary)
Owns ONLY:
- WebRTC signaling (Simple-Peer wrapper)
- Dropbox file upload/download
- Optional AI matching (future)

Node **must not**:
- Store application state
- Own user profiles
- Decide permissions

---

#### Frontend (React)
Responsibilities:
- UI rendering
- Form handling
- Calling Convex mutations/queries
- Calling Node services only when required

Frontend **must not**:
- Implement business rules
- Store sensitive secrets

---

### 2.4 Authentication Architecture

- Firebase Auth is the **only identity provider**
- Convex trusts Firebase-issued ID tokens

Flow:
1. User logs in via Firebase
2. Frontend receives ID token
3. Convex validates token
4. Convex creates or links user record

Convex does **authorization**, not authentication.

---

### 2.5 Video Call Architecture

- 1:1 peer-to-peer WebRTC
- Media never touches backend

Responsibilities:
- Convex: call session state machine
- Node: signaling only

Call states:
- idle
- requested
- ringing
- connected
- ended
- failed

Convex is the **source of truth** for call state.

---

### 2.6 File Storage Architecture

- Dropbox used for MVP
- Node service handles all Dropbox interactions
- Convex stores file metadata only

File abstraction:
- storageProvider ("dropbox" | "s3")
- externalFileId
- owner
- permissions

Migration to S3 must not require schema changes.

---

### 2.7 Matching System Architecture

#### Phase 1 — Deterministic Matching (MVP)
Implemented inside Convex.

Inputs:
- Skill overlap
- Availability overlap
- Language match
- Trust score

Weighted scoring system produces:
- Match score
- Rank
- Explanation

#### Phase 2 — Semantic Matching (Future)
- Optional AI microservice
- Embeddings augment, never replace constraints

---

## 3. EXECUTION PLAN (STRICT ORDER)

### Phase 0 — Freeze Decisions (Before Coding)
- Lock PRD
- Lock architecture
- Define schemas

---

### Phase 1 — Foundation (Week 1)
- Monorepo setup
- React app boot
- Convex setup
- Node service skeleton
- Firebase Auth integration

Deliverable: users can sign in and exist in Convex.

---

### Phase 2 — Core Value (Week 2)
- Profile & skills
- Availability model
- Deterministic matching engine
- Match explanation

Deliverable: user sees meaningful matches.

---

### Phase 3 — Interaction (Week 3)
- Chat (Convex realtime)
- Presence
- Session request/accept

Deliverable: users can coordinate sessions.

---

### Phase 4 — Real Sessions (Week 4)
- Video calling
- Call state handling
- Dropbox file upload
- Notifications

Deliverable: full end-to-end session works.

---

### Phase 5 — Hardening (Week 5)
- Edge case handling
- Permission audits
- Abuse prevention
- Basic analytics

Deliverable: system does not collapse under misuse.

---

## 4. DEVELOPMENT RULES FOR ANY LLM

- Do NOT invent features
- Do NOT change ownership boundaries
- Do NOT add AI to matching in MVP
- Do NOT bypass Convex for core data
- If unsure, default to simplicity

---

## 5. SUCCESS CRITERIA

The product is successful if:
- A complete stranger can go from signup → call → rating
- Matching feels explainable and fair
- System survives refreshes, disconnects, retries

Anything else is noise.

---

END OF SPECIFICATION

