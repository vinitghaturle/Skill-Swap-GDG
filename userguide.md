# Nexus Project: End-to-End Testing & User Guide

This guide provides a systematic approach to testing every feature of the Nexus platform, from initial onboarding to advanced administrative controls and security compliance.

## 🛠 Prerequisites
Ensure the full stack is running:
1. **Convex Backend**: `cd packages/convex && npx convex dev`
2. **Web Frontend**: `cd packages/web && pnpm dev`
3. **Signaling Server**: `cd packages/services/signaling && pnpm dev`

---

## 1. The Core User Journey (Phase 0 - 2)

### A. Authentication & Onboarding
- [ ] **Login**: Sign in with Google/GitHub on the Landing Page.
- [ ] **Onboarding**: Complete the multi-step `ProfileSetupPage`.
    - Select at least 3 "Teach" skills and 3 "Learn" skills.
    - Set your availability and bio.
- [ ] **Dashboard Check**: Verify your name, skills, and "Mastery" bars appear on the Dashboard.

### B. The Matching Engine (Intelligence)
- [ ] **Discovery**: Go to the Matches page.
- [ ] **Fairness Check**: Verify you see potential matches based on skill overlap.
- [ ] **Diagnostics**: Click on a match to see the "Fairness Adjustment" and "Skill Overlap" breakdown.
- [ ] **Exposure Tracking**: Refresh the matches page 5 times. Check the Convex dashboard `profiles` table to see if your `impressions` count for those users increased.

---

## 2. Interaction & Communication (Phase 1 & 3)

### A. Session Lifecycle
- [ ] **Request**: Send a session request to a match.
- [ ] **Acceptance**: Log in as the *other* user and accept the request.
- [ ] **Chat**: Open the accepted session and send multiple messages.
- [ ] **Presence**: Verify the "Online" status indicator updates in the chat header.

### B. High-Fidelity Video Calls
- [ ] **Initiate**: Click "Join Call" as both users.
- [ ] **WebRTC**: Verify video/audio stream stability.
- [ ] **Quality Monitor**: In the browser console, check for WebRTC stats logs.
- [ ] **Security Token**: Verify the call only starts if the `sessionToken` (generated in Phase 6) is valid.

---

## 3. Trust, Safety & Feedback (Phase 3 & 4)

### A. Post-Session Feedback
- [ ] **Rating**: End a call and verify the `FeedbackModal` appears.
- [ ] **Skill Progress**: Submit a 5-star rating. Verify the receiver's "Mastery" progress on their dashboard increases.
- [ ] **Reputation**: Verify that high ratings increase the user's `reputationScore` in Convex.

### B. Protective Flows
- [ ] **Reporting**: Report a user for "Inappropriate Behavior". Verify a record appears in the Convex `reports` table.
- [ ] **Blocking**: Block a user. Verify they no longer appear in your matching list.
- [ ] **Soft Blocks**: Rate a user and check "Don't match again". Verify they are excluded from future matches but *not* blocked from chat.

---

## 4. Admin & Operational Control (Phase 5)

### A. Command Center (`/admin`)
- [ ] **Access Guard**: Attempt to access `/admin` with a non-admin account (should show "Access Revoked").
- [ ] **Live Monitor**: View active calls and pending reports in real-time.
- [ ] **Feature Flags**: Toggle "Matching Engine" to OFF. Go to the Matches page and verify it now says "Matching is temporarily disabled".
- [ ] **Emergency Kill-Switch**: Find an active session in the admin list and click "Terminate". Verify users are kicked from the call immediately.

---

## 5. Security & Compliance (Phase 6)

### A. Data Portability
- [ ] **Export**: Go to `/settings/data`. 
- [ ] **JSON Download**: Click "Export My Data". Open the downloaded file and verify it contains your profile, messages, and session history.

### B. Right to Erasure
- [ ] **Hard Delete**: On the `/settings/data` page, type `DELETE MY ACCOUNT` and confirm.
- [ ] **Cascade Verification**: Check the Convex dashboard to ensure all related records (messages, sessions, ratings) for that user are gone.

---

## 🐛 Troubleshooting Common Issues

| Issue | Solution |
| :--- | :--- |
| **"White Screen" on Login** | Check if Firebase environment variables are correctly set in `.env.local` |
| **Video Call not connecting** | Ensure the Signaling server is running on port 3001 |
| **Matches are empty** | Ensure you have overlapping skills with other users in the DB |
| **Admin Route 404** | Ensure you have manually set `isAdmin: true` in your Convex profile record |
| **Schema Validation Errors** | Run `npx convex dev` to ensure your local data matches the latest `schema.ts` |

---
*Created by Antigravity for the Nexus Production Readiness Roadmap.*
