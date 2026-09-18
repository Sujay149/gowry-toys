# WoodPlay Supervisor Attendance App --- Screen Flow & Field Specification

## 1. Role

This document defines the complete mobile flow for the **Supervisor**
role.

The Supervisor is responsible primarily for worker attendance.

The application uses:

-   React Native
-   Supabase Auth
-   Supabase PostgreSQL
-   Supabase Storage
-   Supabase Edge Functions
-   QR scanning

------------------------------------------------------------------------

# 2. Supervisor Navigation

Primary navigation:

``` text
Home
Attendance
Reports
Profile
```

Primary workflow:

``` text
Login
  ↓
Home
  ↓
Select Shift
  ↓
QR Scanner
  ↓
Worker Verification
  ↓
Mark Attendance
  ↓
Success
  ↓
Scan Next Worker
```

------------------------------------------------------------------------

# 3. Authentication Flow

## Screen: Splash

### Purpose

Restore the existing Supabase session.

### Logic

``` text
Open app
  ↓
Check Supabase session
  ↓
Session exists?
 ├── Yes → Fetch profile
 │          ↓
 │       Active supervisor?
 │          ↓
 │       Home
 │
 └── No → Login
```

### Fields

  Field     Type           Required   Source
  --------- -------------- ---------- ---------------
  session   Auth Session   Yes        Supabase Auth
  user_id   UUID           Yes        Supabase Auth
  role      enum           Yes        profiles
  active    boolean        Yes        profiles

------------------------------------------------------------------------

# 4. Login

## Screen

``` text
Welcome Back
Sign in to your supervisor account

Email
Password

Remember me
Forgot password?

[Login]
```

## Fields

  Field        Type      Required   Validation
  ------------ --------- ---------- --------------------------
  email        string    Yes        Valid email
  password     string    Yes        Minimum auth requirement
  rememberMe   boolean   No         Default true

### API

Supabase Auth:

``` text
signInWithPassword({
  email,
  password
})
```

### After login

``` text
Auth success
  ↓
Fetch profiles row
  ↓
Check role
  ↓
Check active
  ↓
Home
```

### Error cases

``` text
Invalid email/password
Account inactive
Network error
Session error
```

------------------------------------------------------------------------

# 5. Home Dashboard

## Screen Purpose

Give the supervisor immediate visibility into today's attendance and
provide a fast route to scanning.

### Fields

  Field              Type      Source
  ------------------ --------- ---------------
  supervisorName     string    profiles
  currentDate        date      device/server
  shift1Present      integer   attendance
  shift1Total        integer   workers
  shift2Present      integer   attendance
  shift2Total        integer   workers
  recentAttendance   array     attendance

### Actions

``` text
Scan Attendance
View Attendance
View Reports
Open Profile
```

### Flow

``` text
Home
 ├── Scan Attendance
 ├── Attendance
 ├── Reports
 └── Profile
```

------------------------------------------------------------------------

# 6. Select Shift

## Screen Purpose

Select the shift for which attendance will be recorded.

### Fields

  Field          Type      Required
  -------------- --------- ----------
  shiftId        UUID      Yes
  shiftCode      string    Yes
  shiftName      string    Yes
  presentCount   integer   No
  totalWorkers   integer   No
  selected       boolean   UI state

### Options

``` text
Shift 1
Shift 2
```

### Validation

A shift must be selected before continuing.

### Flow

``` text
Select Shift
  ↓
Select Shift 1/2
  ↓
Continue
  ↓
QR Scanner
```

------------------------------------------------------------------------

# 7. QR Scanner

## Screen Purpose

Scan a worker's unique QR code.

### QR payload

Recommended:

``` json
{
  "type": "worker",
  "workerId": "WRK001"
}
```

### Fields

  Field             Type     Required
  ----------------- -------- ----------
  qrRawValue        string   Yes
  qrType            string   Yes
  workerId          string   Yes
  selectedShiftId   UUID     Yes

### Client validation

``` text
QR readable?
QR valid JSON?
type == worker?
workerId present?
```

If invalid:

``` text
Invalid QR
```

### Backend lookup

``` text
workerId
   ↓
workers.worker_id
```

------------------------------------------------------------------------

# 8. Worker Validation

After scanning:

``` text
QR
 ↓
Extract workerId
 ↓
Fetch worker
 ↓
Worker exists?
 ↓
Worker active?
```

### Worker fields returned

  Field         Type
  ------------- -------------
  id            UUID
  worker_id     string
  name          string
  phone         string/null
  department    string/null
  designation   string/null
  active        boolean

### Possible outcomes

``` text
Worker found + active
        ↓
Worker Verification

Worker not found
        ↓
Invalid QR / Worker Not Found

Worker inactive
        ↓
Inactive Worker
```

------------------------------------------------------------------------

# 9. Worker Verification Screen

## Purpose

Give the supervisor a final confirmation before recording attendance.

### Display fields

``` text
Worker Name
Worker ID
Department
Designation
Shift
Date
Status
```

### Example

``` text
Ravi Kumar
WRK001

Department
Wood Cutting

Designation
Worker

Shift
Shift 1

Date
18 September 2026

Status
Active
```

### Actions

``` text
Mark Attendance
Scan Another
```

### Flow

``` text
Mark Attendance
       ↓
POST mark-attendance
       ↓
Success / Duplicate / Error
```

------------------------------------------------------------------------

# 10. Mark Attendance

## Edge Function

``` text
POST /functions/v1/mark-attendance
```

### Request

``` json
{
  "worker_id": "WRK001",
  "shift_id": "SHIFT_UUID"
}
```

### Do NOT trust from client

Do not accept these as authoritative:

``` text
marked_by
marked_at
attendance_date
worker_name
```

The Edge Function determines them.

### Backend processing

``` text
Authenticate Supabase JWT
       ↓
Fetch profile
       ↓
Check role
       ↓
Check profile.active
       ↓
Fetch worker
       ↓
Check worker.active
       ↓
Fetch shift
       ↓
Determine server date/time
       ↓
Check duplicate
       ↓
Insert attendance
       ↓
Return result
```

------------------------------------------------------------------------

# 11. Attendance Record Fields

``` json
{
  "id": "UUID",
  "worker_id": "UUID",
  "shift_id": "UUID",
  "attendance_date": "2026-09-18",
  "status": "present",
  "marked_at": "2026-09-18T09:12:22+05:30",
  "marked_by": "UUID",
  "method": "qr",
  "created_at": "timestamp"
}
```

### Business rule

Unique combination:

``` text
worker_id
+
shift_id
+
attendance_date
```

Only one attendance record is allowed.

------------------------------------------------------------------------

# 12. Successful Attendance

## Screen

Display:

``` text
Attendance Marked Successfully

Ravi Kumar
WRK001

Shift 1
09:12 AM
18 September 2026

[ Scan Next Worker ]
```

### Flow

``` text
Success
  ↓
Scan Next Worker
  ↓
Scanner
```

This is the main high-speed attendance loop.

------------------------------------------------------------------------

# 13. Duplicate Attendance

## Trigger

Database unique constraint or server-side duplicate check.

### Response

``` json
{
  "success": false,
  "code": "ALREADY_MARKED",
  "message": "Attendance already marked for this worker for this shift."
}
```

### Display

``` text
Attendance Already Marked

Ravi Kumar
WRK001

Shift 1
Marked at 09:12 AM

[ Scan Another ]
[ View Details ]
```

### Flow

``` text
Duplicate
  ↓
Scan Another
  ↓
Scanner
```

------------------------------------------------------------------------

# 14. Invalid QR

### Cases

``` text
Malformed QR
Wrong QR type
Missing workerId
Worker doesn't exist
```

### Display

``` text
Invalid QR Code

This QR code is not registered
with the company.

[ Scan Again ]
```

------------------------------------------------------------------------

# 15. Inactive Worker

### Condition

``` text
workers.active == false
```

### Display

``` text
Worker Inactive

Ravi Kumar
WRK001

This worker is currently inactive
and cannot be marked present.

[ Scan Again ]
```

------------------------------------------------------------------------

# 16. Attendance List

## Screen Purpose

Allow supervisors to see today's attendance.

### Header

``` text
Today's Attendance
18 September 2026
```

### Summary fields

``` text
Shift 1
187 / 200

Shift 2
175 / 200
```

### Search field

``` text
Search by name or ID
```

### Search fields

``` text
worker.name
worker.worker_id
```

### Attendance row

  Field        Source
  ------------ ------------
  workerName   workers
  workerId     workers
  department   workers
  markedAt     attendance
  shift        shifts
  status       attendance

------------------------------------------------------------------------

# 17. Attendance Filters

## Fields

  Filter       Type     Required
  ------------ -------- ----------
  date         date     No
  shift        UUID     No
  department   string   No
  status       enum     No

### Status options

``` text
All
Present
Absent
Leave
Half Day
```

V1 may primarily use:

``` text
Present
```

because attendance is currently recorded by scanning.

### Actions

``` text
Reset
Apply
```

------------------------------------------------------------------------

# 18. Worker Attendance Details

The supervisor can open a worker's attendance history.

### Fields

``` text
Worker Name
Worker ID
Department
Selected Month

Date
Shift 1
Shift 2
Status
Marked Time
```

Example:

``` text
Ravi Kumar
WRK001
Wood Cutting

September 2026

01 Sep    Shift 1 ✓    Shift 2 ✓
02 Sep    Shift 1 ✓    Shift 2 -
03 Sep    Shift 1 ✓    Shift 2 ✓
```

------------------------------------------------------------------------

# 19. Monthly Reports

## Screen Purpose

Generate and download monthly attendance reports.

### Fields

  Field        Type      Required
  ------------ --------- ----------
  month        YYYY-MM   Yes
  reportType   string    Yes

Current report type:

``` text
monthly_attendance
```

### Actions

``` text
Generate Report
Download Report
```

------------------------------------------------------------------------

# 20. Generate Monthly Report

## Edge Function

``` text
POST /functions/v1/generate-monthly-report
```

### Request

``` json
{
  "month": "2026-09"
}
```

### Backend flow

``` text
Authenticate user
      ↓
Check role
      ↓
Validate month
      ↓
Fetch workers
      ↓
Fetch attendance
      ↓
Aggregate by worker
      ↓
Aggregate by shift
      ↓
Generate PDF
      ↓
Upload to Supabase Storage
      ↓
Insert reports record
      ↓
Return report
```

------------------------------------------------------------------------

# 21. Report Fields

### Report metadata

``` text
reportId
reportType
reportMonth
fileName
storagePath
generatedBy
generatedAt
```

### Summary

``` text
totalWorkers
shift1Attendance
shift2Attendance
totalAttendance
```

### Worker details

``` text
workerId
workerName
department
shift1Present
shift2Present
totalPresent
```

------------------------------------------------------------------------

# 22. Supabase Storage

Bucket:

``` text
attendance-reports
```

Path:

``` text
attendance-reports/
  2026/
    09/
      Attendance_Report_September_2026.pdf
```

Use signed URLs for downloads.

Do not make report files publicly accessible unless the client
explicitly requires it.

------------------------------------------------------------------------

# 23. Report History

### Fields

``` text
reportId
month
fileName
generatedAt
generatedBy
```

Example:

``` text
September 2026
Attendance Report
Generated 01 Oct 2026

[Download]
```

------------------------------------------------------------------------

# 24. Download Flow

``` text
Tap Download
     ↓
Verify authenticated session
     ↓
Fetch report metadata
     ↓
Request signed URL
     ↓
Open/download PDF
```

------------------------------------------------------------------------

# 25. Profile

### Fields

``` text
fullName
email
role
active
appVersion
```

### Actions

``` text
Logout
```

### Logout flow

``` text
Logout
 ↓
supabase.auth.signOut()
 ↓
Clear local session
 ↓
Login
```

------------------------------------------------------------------------

# 26. Role Restrictions

  Feature                     Supervisor
  ------------------------- ------------
  Login                              Yes
  Dashboard                          Yes
  Scan QR                            Yes
  Mark Attendance                    Yes
  View Today's Attendance            Yes
  Search Attendance                  Yes
  Filter Attendance                  Yes
  View Worker Attendance             Yes
  Generate Monthly Report            Yes
  Download PDF                       Yes
  Add Worker                          No
  Edit Worker                         No
  Deactivate Worker                   No
  Generate/Edit Worker ID             No
  Manage Users                        No
  Change System Settings              No

------------------------------------------------------------------------

# 27. Complete Screen Map

``` text
Splash
  │
  ├── Existing session ──→ Home
  │
  └── No session ─────────→ Login
                              │
                              ▼
                             Home
                              │
          ┌───────────────────┼────────────────────┐
          │                   │                    │
          ▼                   ▼                    ▼
     Attendance            Reports              Profile
          │                   │                    │
          │                   ├── Select Month     └── Logout
          │                   │
          │                   ├── Generate
          │                   │
          │                   ├── Preview
          │                   │
          │                   └── Download
          │
          ├── Search
          ├── Filter
          └── Worker Details

Home
  │
  └── Scan Attendance
          │
          ▼
      Select Shift
          │
          ▼
       QR Scanner
          │
          ▼
   Validate Worker
          │
      ┌───┴───────────┐
      │               │
   Invalid          Valid
      │               │
      ▼               ▼
 Invalid QR      Worker Details
                      │
                ┌─────┴──────────┐
                │                │
             Inactive          Active
                │                │
                ▼                ▼
          Inactive State    Mark Attendance
                                  │
                          ┌───────┴────────┐
                          │                │
                       Duplicate         Success
                          │                │
                          ▼                ▼
                     Duplicate        Scan Next
                                       Worker
                                          │
                                          ▼
                                      Scanner
```

------------------------------------------------------------------------

# 28. High-Speed Scanning Loop

This is the most important operational flow.

``` text
Select Shift
     ↓
Scanner
     ↓
Scan Worker
     ↓
Validate
     ↓
Confirm
     ↓
Mark Attendance
     ↓
Success
     ↓
Scanner
     ↓
Next Worker
```

The supervisor should not need to return to the dashboard between
workers.

------------------------------------------------------------------------

# 29. Error Handling Matrix

  Code               Condition                  UI
  ------------------ -------------------------- -----------------
  AUTH_REQUIRED      Session missing            Login
  UNAUTHORIZED       Wrong role                 Access denied
  ACCOUNT_INACTIVE   Supervisor inactive        Contact admin
  INVALID_QR         Invalid QR payload         Invalid QR
  WORKER_NOT_FOUND   Worker doesn't exist       Invalid QR
  WORKER_INACTIVE    Worker inactive            Worker inactive
  INVALID_SHIFT      Shift invalid              Select shift
  ALREADY_MARKED     Duplicate attendance       Already marked
  NETWORK_ERROR      No connection              Retry
  SERVER_ERROR       Unexpected backend error   Try again

------------------------------------------------------------------------

# 30. Data Ownership

### Profiles

Authentication and role identity.

### Workers

Worker master data.

### Shifts

Shift configuration.

### Attendance

Immutable operational attendance records.

### Reports

Generated report metadata.

### Storage

Generated PDF files.

------------------------------------------------------------------------

# 31. Important Business Rules

1.  Worker IDs must be unique.
2.  Worker IDs should not be edited after creation.
3.  Deactivated workers remain in the database.
4.  Historical attendance must never be deleted just because a worker
    becomes inactive.
5.  A worker can have at most one attendance record per shift per date.
6.  Supervisors cannot modify worker master data.
7.  Attendance should be marked using the authenticated supervisor
    identity.
8.  Server/database time should be authoritative for attendance
    timestamps.
9.  QR codes should contain only the minimum worker identification data.
10. Report files should use authenticated access/signed URLs.
11. Service-role credentials must never be included in the React Native
    app.
12. Attendance creation should be protected by Supabase RLS and/or an
    Edge Function.
13. Duplicate prevention must be enforced at the PostgreSQL database
    level.

------------------------------------------------------------------------

# 32. Recommended V1 Screen List

``` text
01 Splash
02 Login
03 Supervisor Home
04 Select Shift
05 QR Scanner
06 Worker Verification
07 Attendance Success
08 Attendance Already Marked
09 Invalid QR
10 Worker Inactive
11 Today's Attendance
12 Attendance Filters
13 Worker Attendance Details
14 Monthly Reports
15 Report Preview
16 Profile
17 Logout Confirmation
```

This is the complete Supervisor V1 flow and field specification.
