# Student–Tutor Matchmaking Algorithm: Implementation Plan

This document provides a step-by-step implementation plan to improve the precision of the student-tutor matchmaking algorithm. Each phase is designed to be executed in order, with clear acceptance criteria and rollback guidance.

---

## Prerequisites

- [ ] All existing matching tests pass (`npm test` in `server/`)
- [ ] Backup or branch created before Phase 1
- [ ] SystemConfig has subjects configured (`GET /api/system-config/subjects`)

---

## Phase 1: Fix Subject Data Consistency (High Priority)

**Goal:** Unify subject filtering and scoring so tutors are not excluded or mis-scored due to mismatched data sources.

### Step 1.1: Add `subjectsOfInterest` to LearningStyleProfile

**File:** `server/utils/matchingUtils.js`

**Action:**
1. In `LearningStyleProfile` constructor, add:
   ```js
   this.subjectsOfInterest = userData.subjectsOfInterest || [];  // For students: subjects they want to study
   ```
2. Place after `learningNeeds` (line ~22).

**Acceptance:** `LearningStyleProfile` instances can have `subjectsOfInterest` as an array.

---

### Step 1.2: Derive Subject Expertise from tutorInfo.subjects When Empty

**File:** `server/controllers/matchingController.js`

**Action:**
1. In the `tutorProfiles` mapping (around line 99–118), after building the profile, add fallback logic:
   ```js
   // If subjectExpertise is empty but tutorInfo.subjects exists, populate with default proficiency (5/10)
   if (Object.keys(profile.subjectExpertise).length === 0 && tutorUser.tutorInfo?.subjects?.length > 0) {
       tutorUser.tutorInfo.subjects.forEach(s => {
           profile.subjectExpertise[s] = 5;
       });
   }
   ```
2. Ensure `subjectExpertise` is a plain object (not Map) at this point for consistency.

**Acceptance:** Tutors with only `tutorInfo.subjects` (no assessment subjectExpertise) receive a subject match score instead of 0.

---

### Step 1.3: Use tutorInfo.subjects in Subject Filter (matchingUtils)

**File:** `server/utils/matchingUtils.js`

**Action:**
1. In `findOptimalMatches`, change the subject filter (lines 94–97) from:
   ```js
   if (subject && !tutor.subjectExpertise[subject]) {
       continue;
   }
   ```
   To:
   ```js
   if (subject) {
       const hasSubject = tutor.subjectExpertise[subject] !== undefined ||
           (tutor.userData?.tutorInfo?.subjects && tutor.userData.tutorInfo.subjects.includes(subject));
       if (!hasSubject) continue;
   }
   ```
2. Ensure `userData` is attached to tutor profiles in `matchingController.js` (it already is at line 114–120).

**Acceptance:** Tutors with `tutorInfo.subjects` containing the requested subject are included even when `subjectExpertise` is empty.

---

### Step 1.4: Pass subjectsOfInterest into Student Profile (matchingController)

**File:** `server/controllers/matchingController.js`

**Action:**
1. When building `studentProfile` (lines 50–59), add `subjectsOfInterest`:
   ```js
   subjectsOfInterest: (student.studentProfile?.subjectOfFocus || []).concat(
       subject ? [subject] : []
   ).filter((s, i, arr) => arr.indexOf(s) === i)  // dedupe
   ```
2. If `subject` is provided in the request, include it in `subjectsOfInterest`.

**Acceptance:** Student profile includes both `studentProfile.subjectOfFocus` and the requested `subject` (if any) as `subjectsOfInterest`.

---

## Phase 2: Separate Subject Matching from Pedagogical Matching (High Priority)

**Goal:** Use `subjectsOfInterest` for subject matching and `learningNeeds`/`teachingStrengths` for pedagogical alignment only.

### Step 2.1: Refactor _calculateSubjectMatch to Use subjectsOfInterest

**File:** `server/utils/matchingUtils.js`

**Action:**
1. Change `_calculateSubjectMatch` signature to:
   ```js
   _calculateSubjectMatch(subjectsOfInterest, subjectExpertise, requestedSubject = null)
   ```
2. Replace the `learningNeeds` parameter with `subjectsOfInterest` in the logic.
3. Use `subjectsOfInterest` (and `requestedSubject`) to compute the subject match; keep the same scoring logic (proficiency/10, average, requested subject weighting).

**Acceptance:** Subject match is computed from subject names only, not from pedagogical needs.

---

### Step 2.2: Update findOptimalMatches Call Site

**File:** `server/utils/matchingUtils.js`

**Action:**
1. In `findOptimalMatches`, change the call from:
   ```js
   const subjectMatch = this._calculateSubjectMatch(student.learningNeeds, tutor.subjectExpertise, subject);
   ```
   To:
   ```js
   const subjectMatch = this._calculateSubjectMatch(student.subjectsOfInterest, tutor.subjectExpertise, subject);
   ```
2. If `subjectsOfInterest` is empty, pass `subject ? [subject] : []` so requested subject is still considered.

**Acceptance:** `findOptimalMatches` uses `subjectsOfInterest` for subject scoring.

---

### Step 2.3: Update matchingController to Pass subjectsOfInterest

**File:** `server/controllers/matchingController.js`

**Action:**
1. Ensure `studentProfile.subjectsOfInterest` is set in Step 1.4.
2. Verify all call sites that build `LearningStyleProfile` for students include `subjectsOfInterest` (e.g., `getCompatibilityAnalysis`, `recordMatchFeedback`).

**Acceptance:** All matching flows use `subjectsOfInterest` for subject match.

---

### Step 2.4: Keep learningNeeds for Teaching Alignment Only

**File:** `server/utils/matchingUtils.js`

**Action:**
1. Confirm `_assessTeachingAlignment` continues to use `student.learningNeeds` and `tutor.teachingStrengths` only.
2. No changes needed if Step 2.1–2.3 are correct.

**Acceptance:** `learningNeeds` and `teachingStrengths` are used exclusively for pedagogical alignment, not subject matching.

---

## Phase 3: Improve Dimension Scoring (Medium Priority)

**Goal:** Use consistent, smooth scoring for all learning-style dimensions.

### Step 3.1: Document Dimension Semantics

**File:** `server/utils/matchingUtils.js`

**Action:**
1. Add a comment block above `_calculateStyleCompatibility`:
   ```js
   /**
    * Dimension semantics:
    * - visual_verbal, sequential_global: Similarity preferred (student learns best when tutor matches).
    * - active_reflective, structured_flexible: Small complementary difference (≤3) ideal; large gap (≥6) penalized.
    */
   ```

**Acceptance:** Rationale for each dimension’s treatment is documented.

---

### Step 3.2: Use Smooth Gaussian-like Scoring for All Dimensions

**File:** `server/utils/matchingUtils.js`

**Action:**
1. Replace the current dimension scoring logic with a consistent formula:
   - For `visual_verbal` and `sequential_global`: `1 - (|student - tutor| / 10)` (unchanged).
   - For `active_reflective` and `structured_flexible`: use `Math.exp(-0.15 * diff^2)` so small differences score near 1, large differences decay smoothly.
2. Remove the step-function logic (difference ≤3, ≤5, >5).

**Acceptance:** All dimensions use smooth, continuous scoring; no abrupt jumps.

---

## Phase 4: Configurable Weights and Feedback Loop (Medium Priority)

**Goal:** Make weights configurable and enable learning from MatchFeedback.

### Step 4.1: Add Configurable Weights to LearningStyleMatcher

**File:** `server/utils/matchingUtils.js`

**Action:**
1. Add optional `weights` parameter to constructor:
   ```js
   constructor(compatibilityThreshold = 0.5, weights = null) {
       this.weights = weights || {
           styleCompatibility: 0.4,
           subjectMatch: 0.3,
           teachingAlignment: 0.3
       };
       // ... existing
   }
   ```
2. In `findOptimalMatches`, use `this.weights` instead of hardcoded 0.4, 0.3, 0.3.

**Acceptance:** Matcher accepts custom weights; defaults remain 40/30/30.

---

### Step 4.2: Implement updateMatchingWeights from Feedback

**File:** `server/utils/matchingUtils.js`

**Action:**
1. Implement `updateMatchingWeights(feedbackData)`:
   - Use simple grid search or closed-form least-squares to find weights that minimize `|predicted - actual|`.
   - Constrain weights to sum to 1 and be non-negative.
   - Return the optimized weights.
2. Add unit tests for `updateMatchingWeights` with synthetic feedback.

**Acceptance:** Given feedback data, `updateMatchingWeights` returns improved weights; tests pass.

---

### Step 4.3: Persist and Apply Learned Weights (Optional)

**File:** `server/models/SystemConfig.js` (or new `MatchingConfig` model)

**Action:**
1. Add optional `matchingWeights` field to SystemConfig (or create a small config collection).
2. In `getMatcher`, load weights from config if available; otherwise use defaults.
3. Add an admin endpoint or cron job to periodically run `updateMatchingWeights` on MatchFeedback and save new weights.

**Acceptance:** Weights can be stored and loaded; matching uses persisted weights when present.

---

## Phase 5: Availability-Aware Matching (Medium Priority)

**Goal:** Factor tutor availability into match ranking.

### Step 5.1: Add Optional Availability Window to find-tutors Request

**File:** `server/controllers/matchingController.js`

**Action:**
1. Extend request body to accept optional `preferredDays` and `preferredTimeRange` (e.g., `{ days: ['Monday','Wednesday'], start: '14:00', end: '18:00' }`).
2. If not provided, skip availability scoring (backward compatible).

**Acceptance:** API accepts optional availability preferences; existing clients unaffected.

---

### Step 5.2: Implement Availability Overlap Scoring

**File:** `server/utils/matchingUtils.js` (or new `availabilityScoring.js`)

**Action:**
1. Add `_calculateAvailabilityScore(tutor, preferredDays, preferredTimeRange)` that:
   - Uses `tutor.userData.tutorInfo.availability` or system default from SystemConfig.
   - Computes overlap between preferred window and tutor’s weekly schedule.
   - Returns 0–1 score.
2. If availability params are provided, add a 4th component to the final score (e.g., 10% weight) and renormalize others.

**Acceptance:** When availability is requested, tutors with overlapping availability rank higher.

---

## Phase 6: Fuzzy Matching for Teaching Strengths (Lower Priority)

**Goal:** Allow partial and synonym-based matches between learning needs and teaching strengths.

### Step 6.1: Add Synonym Map for Common Terms

**File:** `server/utils/matchingUtils.js` (or `server/utils/matchingSynonyms.js`)

**Action:**
1. Create a small map of synonyms, e.g.:
   ```js
   const PEDAGOGICAL_SYNONYMS = {
       'Visual Learning Support': ['Visual Aids', 'Diagrams', 'Visual Explanations'],
       'Practice Opportunities': ['Practice', 'Drills', 'Exercises'],
       // ...
   };
   ```
2. In `_assessTeachingAlignment`, before exact match, check if any synonym of a need matches a teaching strength (case-insensitive).

**Acceptance:** Synonyms improve alignment score when exact strings differ.

---

### Step 6.2: Add Levenshtein-Based Fuzzy Match (Optional)

**Action:**
1. Add a `string-similarity` or custom Levenshtein helper.
2. If no exact or synonym match, use similarity threshold (e.g., ≥0.8) to grant partial credit.

**Acceptance:** Minor typos or wording variations still contribute to alignment.

---

## Phase 7: Historical Performance Factor (Lower Priority)

**Goal:** Boost tutors with strong past outcomes for similar students.

### Step 7.1: Query Past Session Ratings by Tutor

**File:** `server/controllers/matchingController.js`

**Action:**
1. Before calling `findOptimalMatches`, aggregate `Booking` documents with `matchFeedback` for each tutor.
2. Compute average `actualRating` (or `studentSatisfaction`) per tutor.
3. Pass this as an optional `tutorHistoricalScores` map to the matcher.

**Acceptance:** Historical ratings are available per tutor.

---

### Step 7.2: Add Historical Performance to Score

**File:** `server/utils/matchingUtils.js`

**Action:**
1. Add optional 4th component: `historicalPerformance` (e.g., 10% weight).
2. Use `tutorHistoricalScores[tutorId]` or default 0.5 when missing.
3. Renormalize other weights when this component is present.

**Acceptance:** Tutors with higher historical ratings receive a score boost.

---

## Phase 8: Profile Completeness and Confidence (Lower Priority)

**Goal:** Down-rank or flag matches when profile data is sparse.

### Step 8.1: Compute Profile Completeness

**File:** `server/utils/matchingUtils.js`

**Action:**
1. Add `_getProfileCompleteness(profile, isStudent)` that returns 0–1 based on:
   - Dimensions: count of non-default (≠5) values.
   - For students: `subjectsOfInterest.length`, `learningNeeds.length`.
   - For tutors: `subjectExpertise` keys, `teachingStrengths.length`.
2. Return a completeness score.

**Acceptance:** Completeness is computable for any profile.

---

### Step 8.2: Apply Completeness as Confidence Weight

**Action:**
1. Compute `studentCompleteness` and `tutorCompleteness`.
2. Use `min(studentCompleteness, tutorCompleteness)` as a confidence multiplier on the final score, or add a `lowConfidence` flag when below a threshold (e.g., 0.5).

**Acceptance:** Low-completeness matches are either down-weighted or flagged.

---

## Testing Strategy

| Phase | Test Type | Location |
|-------|-----------|----------|
| 1–2 | Unit | `server/tests/utils/matchingUtils.test.js` (create if missing) |
| 3 | Unit | Same |
| 4 | Unit | Same |
| 5 | Integration | `server/tests/controllers/matchingController.test.js` |
| 6–8 | Unit | `matchingUtils.test.js` |

**Run after each phase:** `cd server && npm test`

---

## Rollback Plan

- **Phase 1–2:** Revert `matchingUtils.js` and `matchingController.js`; ensure `subjectsOfInterest` is optional and backward compatible.
- **Phase 3:** Revert dimension scoring to previous step-function logic.
- **Phase 4:** Remove weights from constructor; use hardcoded values.
- **Phase 5–8:** Feature flags or optional params; disable by not passing new parameters.

---

## Implementation Order Summary

| Order | Phase | Est. Effort | Dependencies |
|-------|-------|-------------|--------------|
| 1 | Phase 1: Subject Data Consistency | 1–2 hrs | None |
| 2 | Phase 2: Separate Subject vs Pedagogical | 1 hr | Phase 1 |
| 3 | Phase 3: Dimension Scoring | 0.5 hr | None |
| 4 | Phase 4: Configurable Weights | 2 hrs | None |
| 5 | Phase 5: Availability | 2 hrs | availabilityUtils |
| 6 | Phase 6: Fuzzy Matching | 1 hr | None |
| 7 | Phase 7: Historical Performance | 1.5 hrs | Booking, MatchFeedback |
| 8 | Phase 8: Profile Completeness | 1 hr | None |

---

## Sign-Off Checklist

- [x] Phase 1 complete, tests pass (executed 2026-03-10)
- [x] Phase 2 complete, tests pass (executed 2026-03-10)
- [x] Phase 3 complete, tests pass (executed 2026-03-10)
- [x] Phase 4 complete including persistence (executed 2026-03-10)
- [x] Phase 5 complete (availability-aware matching, executed 2026-03-11)
- [x] Phase 6 complete (fuzzy matching for teaching strengths, executed 2026-03-11)
- [x] Phase 7 complete (historical performance factor, executed 2026-03-11)
- [x] Phase 8 complete (profile completeness and confidence, executed 2026-03-11)
