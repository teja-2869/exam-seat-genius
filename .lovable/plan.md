# Exams Module — Full Implementation Plan

This rebuilds the four Admin → Exams pages so data flows cleanly: **Create Exam → Schedule → Generate Seating → Seating Plans**. Existing UI palette, AdminLayout, and design language are preserved.

## 1. Data model (Firestore)

New collection structure (all docs carry `institutionId`, `createdBy`, `createdAt`):

- `examSessions/{id}` — the "exam dataset" created on page 1:
  - `examName`, `examType`, `academicYear`, `semester`, `regulation`
  - `branches: string[]`, `years: string[]`, `examCategory` (Regular | Supplementary | Both)
  - `subjectIds: string[]` (refs into existing `subjects` collection)
  - `rules: { minGapDays, maxPerDay, includeSunday, includeHolidays, allowParallel }`
  - `status`: `DRAFT` → `SCHEDULED` → `SEATED` → `PUBLISHED`
  - Cached metrics: `totalStudents`, `totalSubjects`, `totalDaysEstimated`

- `examSchedule/{id}` — one row per subject session:
  - `sessionId` (parent examSessions id), `subjectId`, `subjectCode`, `subjectName`
  - `date`, `slot` (Morning | Afternoon | Evening), `startTime`, `endTime`
  - `branches`, `year`, `studentCount`, `status`

- `seatingPlans/{id}` — already exists; extend with `sessionId`, `scheduleId`, `roomType`, room layout snapshot.

## 2. Page 1 — Create Exam (`AdminCreateExam.tsx`)

Sectioned form per spec:
1. **Exam Information** — name, type (Internal / Mid / Semester / Supplementary / Practical / Lab), academic year, semester, regulation, multi-select years, multi-select branches (loaded from `branches`), exam category.
2. **Subject Selection** — auto-fetch from `subjects` filtered by branches/years/semester/regulation. Table with Select All / individual checkboxes (code, name, credits, year, semester, branch).
3. **Examination Rules** — minGapDays, maxPerDay, includeSunday switch, includeHolidays switch, allowParallel switch.
4. **AI Preparation Summary** — live computed Total Students / Subjects / Branches / Estimated Days.
5. **Create Exam** button → writes `examSessions` doc with `status: DRAFT`, then navigates to Schedule page.

## 3. Page 2 — Exam Schedule (`AdminExamSchedule.tsx`)

- Cards: Total Exams, Scheduled Subjects, Pending Subjects, Exam Days.
- Left: list of `examSessions`. Selecting one shows its detail.
- **Generate Schedule** button → deterministic local generator (no Cloud Function needed; runs in browser to avoid extra infra). Algorithm:
  - Sort subjects by year+branch grouping.
  - Walk dates forward starting tomorrow, skipping Sunday (if disabled) and holidays.
  - Assign each subject to Morning/Afternoon slot respecting `maxPerDay` and `minGapDays` per branch-year cohort.
  - Avoid scheduling two subjects on the same day for the same (branch, year) unless `allowParallel`.
  - Writes batch to `examSchedule`, updates session `status: SCHEDULED`.
- Table columns per spec: Date, Session, Code, Name, Year, Branch, Students, Status.

## 4. Page 3 — Generate Seating AI (`AdminGenerateSeating.tsx`)

- Select a scheduled exam session.
- Constraints UI: one/two per bench, branch separation, year separation, supp separation.
- Room source: fetch `classrooms` for institution, **ignore** rooms whose `roomType` is HOD/Faculty/Wash; **use** classroom + lab.
- For each `examSchedule` row of the session:
  - Fetch matching students from `students` collection.
  - Allocation algorithm (deterministic, runs client-side using Gemini only as optional optimizer if `VITE_GEMINI_API_KEY` is present; otherwise local logic):
    - Sort students by roll, then shuffle with branch-interleave so neighbours differ in branch.
    - Walk rooms (classrooms first, then labs). Classroom = 2 seats/bench, Lab = 1 student/system.
    - Skip pairing students of the same branch / consecutive rolls on the same bench.
  - Write `seatingPlans` doc per (schedule, room).
- Progress indicator + status messages. Updates session `status: SEATED`.

## 5. Page 4 — Seating Plans (`AdminSeatingPlans.tsx`)

- Filters: Exam Session, Date, Block, Floor, Room, Branch, Year.
- Cards grid per room; clicking opens visual layout modal:
  - **Classroom**: existing bench grid (gray empty / yellow occupied, shows roll + branch).
  - **Lab**: render workstations as dark-gray rectangles, one student per system.
- Search: roll / room / name / branch.
- Exports (jsPDF + autoTable, already common pattern):
  - Room-wise PDF, Block-wise PDF, Student-wise PDF, Invigilator Sheet, Master Report.
- Dashboard counts (Active Exams, Scheduled, Generated Plans, Students Allocated, Rooms Utilized) updated in `AdminDashboard.tsx`.

## 6. Firestore rules

Add rules for `examSessions` and `examSchedule` mirroring existing `exams`/`seatingPlans` (institution-scoped, ADMIN write, HOD/Faculty/Student read).

## 7. Out of scope (kept as follow-up)
- Editing existing schedule rows manually (drag-drop) — generated only.
- Holidays collection UI — `includeHolidays` toggle is honored only if a `holidays` collection exists.
- Cloud-side AI call — kept optional; deterministic local engine is the default so users without billing still see results.

## 8. Files touched
- `src/pages/admin/AdminCreateExam.tsx` (rewrite)
- `src/pages/admin/AdminExamSchedule.tsx` (rewrite)
- `src/pages/AdminGenerateSeating.tsx` (rewrite)
- `src/pages/admin/AdminSeatingPlans.tsx` (extend: filters, lab rendering, PDF exports, search)
- `src/pages/AdminDashboard.tsx` (add seating/session KPIs)
- `firestore.rules` (new collections)
- `package.json` (add `jspdf`, `jspdf-autotable` if missing)

Approve and I'll build it.
