# Start Right Tutoring

## Institutional Partnership & Educational Impact Report

**Prepared for:** District Superintendents, Building Principals, and Curriculum & Instruction Directors
**Subject:** Platform capability briefing for MTSS/RTI acceleration, compliance audit readiness, and teacher capacity recovery
**Classification:** Partnership / Procurement Briefing

---

> **A note on methodology and honesty.** This report is written directly from the
> platform's source code, not from a marketing deck. Capabilities described as
> **Live Today** are implemented and instrumented in the production codebase.
> Capabilities described as **Phase 2 / Roadmap** are designed and on the product
> roadmap but **not yet shipped**, and are clearly labeled as such so that no
> procurement decision is made on an unverified promise. We would rather under-claim
> and over-deliver in front of a school board.

---

## 1. Executive Summary & The "Start Right" Mandate

Public education runs on a structural contradiction: instruction is delivered to a
classroom *average*, but learning happens one student at a time. The gap between
those two realities — the student who has quietly fallen three skills behind, the
one who is disengaged but not yet flagged — is where chronic absenteeism, failed
state assessments, and eventual dropouts originate. By the time that gap surfaces
on a high-stakes test, the intervention window has already closed.

**Start Right Tutoring** is an AI-assisted, kinetic, gamified peer-education platform
engineered to close that gap *before* it becomes a transcript event. It sits in the
"Tier 2 / Tier 3" space of your MTSS/RTI framework, pairing students with
compatibility-matched tutors, delivering self-grading skill challenges that make
practice feel like a game, and — critically — instrumenting **every meaningful
student action as a structured data event**. The result is a continuously updating
diagnostic picture of each learner that no paper gradebook or quarterly benchmark
can produce.

The "Start Right" mandate is simple: **start the intervention at the point of need,
not at the point of failure.** The platform operationalizes this through three live
pillars and one roadmap pillar:

| Pillar | What it does | Status |
|---|---|---|
| **Engagement Engine** | Gamified, self-grading challenges with streaks, points, achievements, and "Learn-to-Earn" scholarship credit. | **Live Today** |
| **Human Match Engine** | Algorithmic tutor-to-student matching on learning-style compatibility, subject fit, and teaching alignment. | **Live Today** |
| **Evidence Engine** | An immutable, versioned telemetry catalog that converts behavior into audit-grade, cohort-scoped data. | **Live Today** |
| **Whole-Child Wellness Engine** | Automated non-academic intake and routing to in-district counselors. | **Phase 2 / Roadmap** |

This document translates each of these code-level capabilities into the operational,
financial, and compliance language of district leadership.

---

## 2. Data-Driven Decision Making — What We Capture & Why It Benefits Schools

### 2.1 The end of the data blind spot

Most intervention programs are evaluated on a single trailing indicator: attendance,
or a single post-test. Everything that happened *between* enrollment and that test —
the effort, the struggle, the specific skills that did or did not land — is lost.

Start Right's telemetry engine is built to eliminate that blind spot. At the center
is an **immutable event envelope** (`TelemetryEvent`) written on a non-blocking "hot
path" so that instrumentation never slows down a student's experience. Every event
is stamped with a versioned schema (`2025.04.v1`), a globally unique event ID, the
precise time it occurred, and — most importantly for districts — the **`schoolId`
that scopes it to your cohort** and the `subjectStudentId` it concerns.

**Telemetry envelope — the fields every event carries:**

| Field | Plain-English meaning | District value |
|---|---|---|
| `eventId` (unique UUID) | A tamper-evident, one-of-a-kind ID per event | No double-counting; defensible audit line items |
| `occurredAt` + `serverReceivedAt` | When it happened vs. when we logged it | Accurate timelines even with offline/late sync |
| `subjectStudentId` | Which student the event is about | Student-level longitudinal records |
| `schoolId` | Which cohort/campus owns the data | Clean per-campus and per-district reporting |
| `bookingId` / `correlationId` | Ties events into a single session story | Reconstruct a full intervention narrative |
| `clientTimezone` / `deviceContext` | Where/how the learning happened | Equity + access analysis (home vs. school, device) |
| `payload` | The measurements specific to the event | The actual academic signal (scores, durations) |

### 2.2 The instrumented event catalog (verified in code)

The platform currently emits **18 distinct, production-instrumented event types**,
organized into the families below. (The catalog is versioned and intentionally
extensible; additional events are added as new modules ship.)

| Event family | Instrumented events | Diagnostic signal it removes the blind spot on |
|---|---|---|
| **Skill mastery & practice** | `challenge_attempt_started`, `challenge_answer_submitted`, `challenge_attempt_completed` | Per-skill accuracy (`scorePct`), time-on-task, persistence, and question-level success/failure |
| **Direct instruction** | `tutoring_session_completed`, `tutoring_session_no_show`, `booking_created`, `booking_rescheduled`, `booking_cancelled` | Dosage of intervention actually delivered vs. scheduled; early no-show signal |
| **Tutor responsiveness** | `tutor_booking_accepted`, `tutor_booking_declined`, `tutor_session_rating_submitted` | Match quality, time-to-acceptance, and student-rated session efficacy |
| **Cohort operations** | `cohort_student_school_linked`, `cohort_roster_bulk_import_finished` | Verifiable enrollment and roster provenance |
| **Access & equity** | `auth_login_success`, `auth_logout`, `virtual_session_joined` | Engagement cadence, virtual vs. in-person access patterns |
| **Funding & accountability** | `guardian_payment_requested`, `booking_payment_completed` | Financial trail tied to delivered service |

> **Note on `skill_mastered` and `learning_style_assessment_completed`:** these were
> referenced as desired signals. Today, the *underlying data* exists — per-skill
> mastery is captured through `challenge_attempt_completed` (`scorePct`,
> `timeOnTask`) and through tutor-entered **session notes** (`conceptsMastered`,
> `areasForImprovement`), and learning-style profiles are captured by the live
> assessment flow. Promoting these to first-class named telemetry events is a small,
> scheduled enhancement, not a new capability build.

### 2.3 Turning passive data into actionable intelligence

Because every challenge attempt records a per-skill score and time-on-task, and every
tutoring session records the concepts mastered and areas still weak, an administrator
or teacher gains a **real-time diagnostic map of skill gaps** that updates daily —
months ahead of a single spring assessment. A curriculum director can see, at the
cohort level, *which TEKS/standards a campus is collectively struggling with* and
redirect instruction while it still matters.

| Decision question | Traditional manual answer | Start Right automated answer |
|---|---|---|
| "Which students are falling behind right now?" | Wait for the next benchmark/report card | Live per-skill score and session-attendance feed |
| "Is our intervention actually being delivered?" | Sign-in sheets, anecdote | `tutoring_session_completed` vs. `no_show` counts |
| "Where is the cohort weakest before the state test?" | Post-mortem after results return | Aggregated `scorePct` by subject/skill, continuously |
| "Is this tutor pairing working?" | Subjective | `tutor_session_rating_submitted` + match score |

---

## 3. Maximizing State & Federal Funding — The Audit Trail

Districts routinely *leave money on the table* not because intervention didn't happen,
but because it could not be **proven** to an auditor at the line-item level. Title I,
State Compensatory Education (SCE), and school improvement grants all require
verification that funds were spent on identified students, that services were
delivered, and that progress was monitored. Start Right is built to produce exactly
that evidence.

### 3.1 Tamper-evident, immutable records

Telemetry events are written as **append-only**, each with a unique `eventId` and dual
timestamps (`occurredAt` and `serverReceivedAt`). There is no "edit a session after
the fact" pathway in the event log — the record of *what happened and when* is
preserved as an immutable envelope. For an auditor, this is the difference between a
spreadsheet someone could have changed and a defensible system of record.

### 3.2 Role-based reporting (RBAC) keeps data clean and compartmentalized

Access is enforced in code by role:

- **`school_admin`** can see **only their own campus/cohort** (`canAccessSchool`
  scopes every read to their `schoolId`).
- **`admin` / `super_admin`** see district-wide data.
- Education **sector isolation** (public / private / charter) is enforced at the data
  layer so cohorts never commingle.

This means a principal's funding report contains *their* students and no one else's —
exactly the boundary an auditor expects.

### 3.3 One-click verification exports

Cohort data can be exported on demand to **CSV** and **branded PDF**
(`generateSchoolCSV`, `generateSchoolPDF`), each containing the pilot window, active
student count, completed sessions, upcoming sessions, and the linked student roster.
These become the attachable evidence packet for a funding application or monitoring
visit.

| Compliance requirement | Manual reality today | Start Right evidence artifact |
|---|---|---|
| Identify served students | Hand-built lists, prone to error | Roster bound to `schoolId`, exportable |
| Prove service delivery | Paper sign-in sheets | Immutable `tutoring_session_completed` events |
| Document progress monitoring | Teacher binders | Per-skill `scorePct` + tutor session notes |
| Tie spend to service | Manual reconciliation | `booking_payment_completed` linked to `bookingId` |
| Produce it for an auditor | Days of assembly | One-click CSV/PDF cohort export |

**Bottom line for the business office:** schools can *mathematically justify* their
intervention expenditures, because every dollar of service maps to an immutable,
student-scoped, time-stamped event.

---

## 4. Accelerating State Test Scores & Graduation Rates

### 4.1 Academic Pillar — systematic mastery (Live Today)

The academic engine is built to convert practice into measurable confidence:

- **Self-grading micro-challenges** deliver targeted practice on specific skills.
  Each attempt records `scorePct`, time-on-task, total questions, and a
  success/fail outcome — the granular signal needed to target the *next* challenge to
  the *exact* weak skill.
- **Gamification mechanics** (streaks, points, achievements that auto-award on
  session completion, and "Learn-to-Earn" scholarship credit) drive the repeated,
  voluntary practice that actually moves standardized metrics.
- **Learning-style baselines** are established through a live assessment that profiles
  each learner across four research-informed dimensions (visual/verbal,
  sequential/global, active/reflective, structured/flexible). These baselines power
  matching today and establish the per-student starting point for growth.
- **Tutor session notes** capture `conceptsMastered`, `areasForImprovement`,
  `homeworkAssigned`, and `nextSteps` — a structured, longitudinal mastery record
  visible to parents, students, and administrators.

> **Roadmap honesty — the adaptive mastery engine (BKT/IRT).** A formal Bayesian
> Knowledge Tracing / Item Response Theory layer that continuously re-estimates each
> student's latent mastery probability is a stated product goal (`docs/ML_CONTEXT.md`)
> and is **on the roadmap, not yet shipped.** What is **live today** is the complete
> *data foundation* that such a model requires: per-skill scored attempts,
> time-on-task, session-level mastery notes, and learning-style baselines. The
> platform is already collecting the training signal; the adaptive scoring layer is
> the next build, not a from-scratch effort.

### 4.2 Wellness Pillar — The Whole-Child Solution (Phase 2 / Roadmap)

> **Status: planned, not yet implemented.** This pillar is presented as forward
> vision so leadership can evaluate the full direction of the partnership. It is **not**
> a capability available at signing today.

Academic intervention fails when a non-academic barrier — anxiety, instability at
home, food insecurity — goes unaddressed. The planned Whole-Child Wellness Engine
will add a lightweight, dignity-preserving intake that surfaces non-academic hurdles
and **routes the student to the appropriate in-district counselor** rather than
attempting to handle care outside the school's professional structure. The design
intent is to catch the early signals of disengagement (which the engagement and
attendance telemetry can already hint at) and connect them to the humans the district
already employs to help — shortening the path from "something is wrong" to "the right
counselor knows," which is the mechanism that prevents chronic absenteeism from
hardening into a dropout.

| Outcome lever | Academic Pillar (Live) | Wellness Pillar (Roadmap) |
|---|---|---|
| Skill gaps before state tests | Per-skill scoring + targeted challenges | — |
| Engagement / confidence | Gamification, streaks, achievements | Early disengagement signal → counselor |
| Chronic absenteeism | Attendance & no-show telemetry | Routed non-academic support |
| Drop-out risk | Mastery + dosage tracking | In-district counselor escalation |

---

## 5. Reducing Teacher Burnout & Mental Overhead

Teacher attrition is, at root, an administrative-load problem. The single most
draining hidden task in modern schooling is **Tier 2 / Tier 3 intervention
documentation**: tracking who was pulled, for what, when, how it went, and proving it.
Start Right was built to lift that load off the classroom teacher and into automated
server-side workflows.

### 5.1 What the server layer automates today

- **Automatic tutor matching** — when a session is booked without a named tutor and
  the student has a learning-style profile, the system scores all available tutors on
  style compatibility, subject fit, and teaching alignment (and ranks by historical
  ratings) and auto-assigns the best match. No coordinator triage required.
- **Hands-off scheduling & virtual rooms** — virtual sessions auto-provision a video
  room at booking; session-requested, reschedule, and no-show notifications fire
  automatically; an expiry job cleans up stale bookings.
- **Self-grading challenges** — student practice is scored by the system, not by a
  teacher with a red pen.
- **One-click cohort reporting** — the CSV/PDF cohort export and the admin analytics
  dashboard replace the manual assembly of intervention binders.
- **Automatic gamification & rewards** — achievements auto-award and scholarship XP
  auto-credits on qualifying activity, with zero teacher bookkeeping.

### 5.2 The capacity recovery: manual vs. automated

| Tier 2/Tier 3 task | Traditional Manual Intervention Tracking | The Start Right Automated Ecosystem |
|---|---|---|
| Match student to the right support | Coordinator judgment, email chains | Algorithmic auto-match on booking |
| Schedule & set up the session | Phone tag, manual calendar, room setup | Auto-scheduling + auto-provisioned video room |
| Grade practice work | Teacher grades by hand | Self-grading challenges |
| Record what was covered | Handwritten notes in a binder | Structured digital session notes |
| Track who attended | Paper sign-in sheets | Immutable `completed` / `no_show` events |
| Build the cohort report | Hours of spreadsheet assembly | One-click CSV/PDF export |
| Monitor progress for RTI | Manual data entry, quarterly | Continuous per-skill scoring feed |

**The teacher dividend:** by shifting the *documentation and logistics* of
intervention to the platform, the manual burden that currently competes with lesson
planning is removed. Those reclaimed hours return to what only a teacher can do —
premium, in-class instruction — which is also the single highest-leverage move a
district can make on **teacher retention.**

---

## Appendix A — Capability Status at a Glance

| Capability | Status | Code evidence |
|---|---|---|
| Immutable, versioned telemetry envelope | **Live** | `server/models/TelemetryEvent.js`, `server/services/telemetryService.js` |
| 18 instrumented event types, cohort-scoped | **Live** | `trackEvent(...)` across booking, challenge, school, auth, matching, payment controllers |
| B2B school/cohort structure + sector isolation | **Live** | `server/models/School.js`, `server/controllers/schoolController.js` |
| Bulk roster upload + welcome onboarding | **Live** | `rosterUpload` (`schoolController.js`) |
| Cohort metrics aggregation | **Live** | `getSchoolMetrics` (`schoolController.js`) |
| Role-based access (school_admin / admin) | **Live** | `canAccessSchool` (`schoolController.js`) |
| CSV + branded PDF cohort export | **Live** | `client/src/utils/exportUtils.js` |
| Admin analytics dashboard | **Live** | `server/controllers/analyticsController.js` |
| Learning-style assessment | **Live** | `server/controllers/assessmentController.js` |
| Algorithmic tutor matching | **Live** | `server/utils/matchingUtils.js`, `bookingController.js` auto-assign |
| Gamified, self-grading challenges + achievements | **Live** | `server/controllers/challengeController.js`, `achievementController.js` |
| Structured tutor session notes | **Live** | `updateSessionNotes` (`bookingController.js`) |
| BKT/IRT adaptive mastery engine | **Roadmap** | Goal stated in `docs/ML_CONTEXT.md`; data foundation live |
| Wellness intake & counselor routing | **Roadmap** | Not yet implemented (confirmed) |

## Appendix B — Glossary for Cross-Functional Review

- **MTSS / RTI** — Multi-Tiered System of Supports / Response to Intervention; the
  tiered framework Start Right plugs into at Tier 2/Tier 3.
- **Telemetry envelope** — the standard set of fields wrapped around every recorded
  student action.
- **Immutable / append-only** — records are added, never silently edited; the basis of
  audit defensibility.
- **Cohort scoping (`schoolId`)** — every data point is tagged to a campus so reporting
  and access stay cleanly separated.
- **Dosage** — how much intervention was actually delivered vs. planned.

---

*Prepared from a direct review of the Start Right Tutoring codebase. "Live Today"
items are verifiable in source; "Roadmap" items are labeled to support an honest
procurement conversation.*
