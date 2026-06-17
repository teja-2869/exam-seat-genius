# AI Exam Optimization Engine — Implementation Plan

Refactors the four existing Exam pages (**Create Exam**, **Exam Schedule**, **Generate Seating AI**, **Seating Plans**) into a coordinated optimization pipeline. **No UI/theme/layout changes** — only backend logic, new helper modules, and small additive UI badges (score chips, conflict counts) inside existing cards.

---

## 1. New shared engine module

Create `src/lib/examOptimizer.ts` exposing pure functions used by all four pages:

- `classifySubjects(subjects, allSubjectsAcrossBranches)` → tags each subject as `COMMON | CORE | BRANCH | LAB | SUPPLEMENTARY` using:
  - same `subjectCode` or normalized `subjectName` appearing across ≥3 branches → `COMMON`
  - `roomTypeHint === 'lab'` or name contains `lab/practical` → `LAB`
  - `examType === 'Supplementary'` → `SUPPLEMENTARY`
  - shared across 2 branches in same year → `CORE`
  - else → `BRANCH`
- `buildBranchSimilarityMatrix(subjects)` → `{ [branchA]: { [branchB]: { sharedSubjects, sharedCodes[], riskScore } } }`. Risk = sharedSubjects / min(totalA,totalB).
- `computeSeatingRisk(subject, studentCount, totalCapacity)` → `LOW | MEDIUM | HIGH`. HIGH when same-subject students > 40% of capacity or subject is COMMON with >150 students.
- `scoreSchedule(scheduleRows, similarityMatrix)` → 0–100 based on: cohort gap respect, common-subject distribution across days, parallel-branch-same-subject penalty.
- `scoreSeating(seats, rows, cols, isLab)` → 0–100. Deductions for any same-subject adjacency (L/R/front/back/diagonal), capacity overflows, low branch diversity.
- `detectConflicts(seats)` → array of `{type, row, col, rollA, rollB, subject}` for the 4 adjacency types + duplicates + overflow.

## 2. Create Exam (`AdminCreateExam.tsx`)

On submit, additionally:
- Run `classifySubjects` over the chosen subjects (using all branch subjects fetched for context) and persist `subjectClassifications[]` on the `examSessions` doc.
- Run `buildBranchSimilarityMatrix` and store as `branchSimilarity` map.
- Store `commonSubjectCodes[]` for downstream use.
- AI Preparation Summary sidebar gains read-only chips: *Common subjects: N*, *High-risk: N* (no layout change, just extra Badges in existing card).

## 3. Exam Schedule (`AdminExamSchedule.tsx`)

Rewrite `handleGenerate` into an optimizer:
1. Pull `subjectClassifications`, `branchSimilarity`, room capacity total (sum of `roomCapacity` for usable rooms).
2. Compute per-subject `seatingRisk`.
3. Sort subjects: HIGH-risk common first (spread thin), then CORE, then BRANCH.
4. Slot assignment honors existing minGap/maxPerDay + new constraints:
   - Two cohorts whose `branchSimilarity.riskScore > 0.5` cannot be in the same slot writing the *same* subject code unless `allowParallel`.
   - HIGH-risk common subjects: only one per day across the institution.
   - Same date+slot may host **different** subjects from similar branches (encouraged).
5. After scheduling, call `scoreSchedule` and persist `optimizationScore` on `examSessions` + each `examSchedule` row gets `seatingRisk` + `mode` (`ONE_PER_BENCH` if HIGH risk lab/common, else `TWO_PER_BENCH`).
6. Add a Badge in the existing session card header: `Score: 87/100` (uses existing Badge component, no new layout).

## 4. Generate Seating AI (`AdminGenerateSeating.tsx`)

Refactor allocator:
- Read `mode` from each `examSchedule` row.
- For each room: choose layout
  - Lab → always one student per workstation.
  - Classroom + any HIGH-risk subject for that slot → checkerboard (`seatPosition: 'single'`, alternating cells).
  - Classroom + only different subjects on bench → two-per-bench.
- Allocator pass 1: bucket students by subject; round-robin interleave across buckets to maximize subject diversity per row.
- Allocator pass 2 (validator): walk seats, if any same-subject neighbor (L/R/front/back/diagonal) exists, swap with the nearest different-subject candidate in a later row. Max 3 passes.
- Run `detectConflicts` + `scoreSeating`; persist on each `seatingPlans` doc: `seatingQualityScore`, `conflictCount`, `conflicts[]` (flat objects only — no nested arrays), `mode`, `utilizationPct`.
- Keep existing flat `seats[]` schema (Firestore safe). Validate with existing `hasNestedArray` guard.

## 5. Seating Plans (`AdminSeatingPlans.tsx`)

Inside the existing filter/cards UI, additively show in each plan card and at the top KPI strip:
- `Quality: 92/100` Badge
- `Conflicts: 0` Badge (red if >0)
- `Utilization: 88%` Badge
- Master KPI row reuses existing KpiCard component — no new layout.

PDF exports already exist; add `Conflict Report` and `Optimization Summary` as extra autoTable sections inside the existing Master Report PDF.

## 6. Firestore additions (no new collections)

Extra fields on existing docs only — no rule/grant changes needed (collections already covered):
- `examSessions`: `subjectClassifications`, `branchSimilarity`, `commonSubjectCodes`, `optimizationScore`.
- `examSchedule`: `seatingRisk`, `mode`.
- `seatingPlans`: `seatingQualityScore`, `conflictCount`, `conflicts`, `mode`, `utilizationPct`.

## 7. Out of scope

- No Gemini/Cloud Function call — the optimizer runs deterministically client-side (matches the existing pattern). The Cloud Function `generateSeatingPlan.ts` remains untouched.
- No UI redesign, no new pages, no navigation/sidebar changes.
- No manual schedule editor.
- Holidays UI unchanged.

## 8. Files touched

- **Create**: `src/lib/examOptimizer.ts`
- **Edit**: `src/pages/admin/AdminCreateExam.tsx`, `src/pages/admin/AdminExamSchedule.tsx`, `src/pages/AdminGenerateSeating.tsx`, `src/pages/admin/AdminSeatingPlans.tsx`

Approve to implement.
