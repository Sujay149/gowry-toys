# WoodPlay Supervisor Attendance App --- Design System

## 1. Product Context

WoodPlay is a toy manufacturing company with approximately 200 workers.
The Supervisor mobile app is primarily used on the factory floor to
record worker attendance through QR scanning.

### Supervisor responsibilities

-   Sign in securely.
-   Select the current shift.
-   Scan worker QR codes.
-   Verify worker details.
-   Mark attendance.
-   See today's attendance.
-   Filter/search attendance.
-   Generate and download monthly attendance reports.
-   View profile and sign out.

### Primary UX principle

**Scan attendance must be the fastest and most prominent action in the
app.**

The interface should feel calm, modern, smooth, and highly readable in a
busy manufacturing environment.

------------------------------------------------------------------------

# 2. Visual Direction

The visual language is inspired by the provided reference:

-   Minimal iOS-style interface.
-   Soft off-white/light-gray canvas.
-   White elevated cards.
-   Deep green as the primary action color.
-   Generous whitespace.
-   Large readable headings.
-   Thin borders instead of heavy shadows.
-   Rounded surfaces.
-   Small, purposeful icons.
-   Smooth transitions.
-   Clear success/error states.
-   Bottom navigation for the main sections.

Avoid a traditional corporate HR-dashboard appearance. The app should
feel like a modern mobile productivity product.

------------------------------------------------------------------------

# 3. Color System

## Primary

``` text
Primary Green:        #087F5B
Primary Green Dark:   #066A4C
Primary Green Light:  #E6F5EF
```

Use the primary green for: - Primary buttons. - Selected navigation
items. - Success indicators. - Selected shift state. - Scanner action
controls. - Important interactive elements.

## Neutral

``` text
Background:           #F6F6F4
Surface:              #FFFFFF
Surface Secondary:    #F2F3F1
Border:               #E5E7E4
Text Primary:         #151716
Text Secondary:       #6B716D
Text Muted:           #9AA09C
```

## Semantic

``` text
Success:              #12A36F
Success Background:   #E8F8F1

Warning:              #F59E0B
Warning Background:   #FFF5DD

Error:                #E5484D
Error Background:     #FDEBEC

Info:                 #3B82F6
Info Background:      #EAF2FF
```

### Color rules

Do not use many colors at once.

A typical screen should visually contain:

1.  Neutral background.
2.  White surfaces.
3.  Dark text.
4.  Green primary actions.
5.  One semantic color only when required.

------------------------------------------------------------------------

# 4. Typography

Use **Inter** where available. On iOS, use a clean system fallback.

## Type scale

  Purpose             Size Weight
  ----------------- ------ --------
  Display             32px 600
  Screen title        24px 600
  Section title       17px 600
  Body                15px 400
  Body emphasized     15px 600
  Caption             12px 400
  Button              14px 600
  Metric              24px 600

### Typography principles

-   Avoid all-caps headings except very small labels.
-   Keep line height generous.
-   Use weight to create hierarchy rather than excessive color.
-   Worker names should be visually stronger than metadata.
-   Attendance counts should be immediately scannable.

------------------------------------------------------------------------

# 5. Spacing System

Use an 8-point base grid.

``` text
4px   — micro spacing
8px   — icon/text spacing
12px  — compact spacing
16px  — standard spacing
20px  — card padding
24px  — section spacing
32px  — major section spacing
40px  — large separation
```

Default horizontal screen padding:

``` text
20px
```

Card internal padding:

``` text
16px
```

Large hero/card padding:

``` text
20–24px
```

------------------------------------------------------------------------

# 6. Border Radius

Use soft rounded corners consistently.

``` text
Small controls:       10px
Input fields:         12px
Cards:                16px
Large cards:          20px
Primary CTA:          14px
Bottom navigation:    24px
Avatar:               50%
```

Avoid excessive pill-shaped UI. Pills should be reserved for: - Status
labels. - Compact filters. - Small badges.

------------------------------------------------------------------------

# 7. Shadows and Elevation

The reference design uses very subtle elevation.

Prefer:

``` text
border: 1px solid #E5E7E4
```

and only a soft shadow for floating elements.

Example conceptual shadow:

``` text
0 4px 20px rgba(20, 30, 25, 0.06)
```

Do not use large dark shadows.

------------------------------------------------------------------------

# 8. Buttons

## Primary Button

``` text
Background: #087F5B
Text: #FFFFFF
Height: 52px
Radius: 14px
Font: 14px / 600
```

Example:

``` text
┌─────────────────────────────┐
│       Scan Attendance       │
└─────────────────────────────┘
```

Use a small Lucide-style icon when appropriate.

## Secondary Button

``` text
Background: #FFFFFF
Text: #087F5B
Border: #D8E3DE
Height: 52px
Radius: 14px
```

## Destructive Button

Use only for actions such as logout when confirmation is needed or
genuinely destructive actions.

------------------------------------------------------------------------

# 9. Inputs

Inputs should feel lightweight.

``` text
Height: 50–52px
Background: #FFFFFF
Border: #E2E5E2
Radius: 12px
Horizontal padding: 14px
```

Focused state:

``` text
Border: #087F5B
Subtle green focus ring
```

Placeholder:

``` text
#9AA09C
```

------------------------------------------------------------------------

# 10. Cards

Cards should provide grouping rather than decoration.

### Standard card

``` text
Background: #FFFFFF
Radius: 16px
Border: 1px solid #E5E7E4
Padding: 16px
```

### Metric card

Use: - Small label. - Large number. - Supporting text. - Optional
progress indicator.

Example:

``` text
SHIFT 1

187 / 200
Present

━━━━━━━━━━━━ 94%
```

------------------------------------------------------------------------

# 11. Navigation

Use a four-item bottom navigation:

``` text
Home
Attendance
Reports
Profile
```

Example:

``` text
┌──────────────────────────────────┐
│  Home    Attendance   Reports Profile │
│   ●         ○          ○       ○  │
└──────────────────────────────────┘
```

### Active state

-   Green icon.
-   Green label.
-   Optional small background highlight.
-   Do not use heavy filled tabs.

The Scan Attendance action remains a prominent CTA on Home rather than
becoming a fifth navigation item.

------------------------------------------------------------------------

# 12. Icons

Use a consistent outline icon family such as Lucide.

Recommended icons:

``` text
Home              House
Attendance        ClipboardCheck
Reports           FileText
Profile           User
Scan              ScanLine
Camera            Camera
Search            Search
Filter            SlidersHorizontal
Calendar          CalendarDays
Back              ArrowLeft
Forward           ArrowRight
Success           CircleCheck
Warning           CircleAlert
Error             CircleX
Flash             Flashlight
Download          Download
Logout            LogOut
Notification      Bell
Chevron           ChevronRight
```

Icons should generally be:

``` text
Stroke: 1.8–2px
Size: 20–22px
```

------------------------------------------------------------------------

# 13. Avatar System

Worker avatars are optional.

If a photo is available:

``` text
Small: 36px
Medium: 48px
Large: 72px
```

If no photo exists, use an initials avatar.

Do not make the avatar more visually dominant than the worker's name.

------------------------------------------------------------------------

# 14. Motion and Interaction

The app should feel smooth without becoming flashy.

## Screen transitions

Use:

``` text
Fade + subtle horizontal slide
Duration: 180–240ms
```

## Card interaction

On press:

``` text
Scale: 0.98
Duration: 100ms
```

## Primary button

On press:

``` text
Scale: 0.98
```

## Success state

Use a short checkmark animation.

``` text
Circle appears
    ↓
Checkmark draws
    ↓
Worker information fades in
```

Keep it under approximately 500ms.

## Loading

Use skeletons or subtle activity indicators instead of blocking
full-screen spinners where possible.

------------------------------------------------------------------------

# 15. Screen Design Specifications

## Splash

Purpose: - Establish WoodPlay branding. - Restore the Supabase session.

Design:

``` text
Centered WoodPlay logo
Company name
Short tagline
Small loading indicator
```

Use a very subtle curved/organic background shape.

------------------------------------------------------------------------

# 16. Login

Layout:

``` text
Logo
Welcome Back
Sign in to your supervisor account

Email
Password

Remember me      Forgot password?

[ Login ]

Powered by WoodPlay
```

Keep the login screen clean with no unnecessary illustrations.

------------------------------------------------------------------------

# 17. Supervisor Dashboard

The dashboard should prioritize today's attendance.

Structure:

``` text
Greeting
Date

Shift 1 metric       Shift 2 metric

[ Scan Attendance ]

Recent Attendance
Recent worker records

Bottom Navigation
```

The Scan Attendance button should be the strongest visual element.

------------------------------------------------------------------------

# 18. Shift Selection

Use two large selectable cards:

``` text
Shift 1
187 / 200
Present

Shift 2
175 / 200
Present
```

Selected state:

``` text
Green border
Soft green background
Green check indicator
```

The Continue button should remain at the bottom.

------------------------------------------------------------------------

# 19. QR Scanner

Scanner should use a dark camera preview for strong contrast.

Overlay:

``` text
Top:
Back
Current shift

Center:
Large rounded scanning frame

Bottom:
Instruction
Flash control
```

The scanning frame should be approximately 70% of screen width.

Avoid excessive UI over the camera.

------------------------------------------------------------------------

# 20. Worker Verification

After scanning:

``` text
Worker avatar

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

[ Mark Attendance ]

[ Scan Another ]
```

The primary action should be green.

------------------------------------------------------------------------

# 21. Success State

Use:

``` text
Large green success icon
Attendance Marked Successfully

Worker
Ravi Kumar

Shift
Shift 1

Time
09:12 AM

Date
18 September 2026

[ Scan Next Worker ]
```

The Scan Next Worker action should immediately return to the scanner.

------------------------------------------------------------------------

# 22. Duplicate State

Use warning styling.

``` text
Orange warning icon

Attendance Already Marked

Ravi Kumar
WRK001

Shift 1
Marked at 09:12 AM

[ Scan Another ]
[ View Details ]
```

Do not use a destructive red treatment for a normal duplicate scan.

------------------------------------------------------------------------

# 23. Invalid QR State

Use a red error icon.

``` text
Invalid QR Code

This QR code is not registered
with the company.

[ Scan Again ]
```

Keep the explanation short.

------------------------------------------------------------------------

# 24. Inactive Worker State

Use warning styling rather than a severe error.

``` text
Worker Inactive

Ravi Kumar
WRK001

This worker is currently inactive
and cannot be marked present.

[ Scan Again ]
```

------------------------------------------------------------------------

# 25. Attendance List

Header:

``` text
Today's Attendance
18 September 2026
```

Then:

``` text
Shift 1        Shift 2
187 / 200      175 / 200
```

Search:

``` text
Search by name or ID
```

Worker row:

``` text
[Avatar] Ravi Kumar
         WRK001 · Wood Cutting

                       09:12 AM
                       Shift 1
```

Use a green check indicator for present records.

------------------------------------------------------------------------

# 26. Filters

Filter sheet should contain:

``` text
Date
Shift
Department
Status
```

Bottom actions:

``` text
[ Reset ] [ Apply ]
```

The filter sheet should open as a smooth bottom sheet rather than
navigating to a full new screen where practical.

------------------------------------------------------------------------

# 27. Monthly Reports

Layout:

``` text
Monthly Reports

Select Month
[ September 2026 ▼ ]

[ Generate Report ]

Previous Reports

September 2026
Attendance Report
Generated 01 Oct 2026
                    [ Download ]

August 2026
Attendance Report
Generated 01 Sep 2026
                    [ Download ]
```

Use file/document icons and compact cards.

------------------------------------------------------------------------

# 28. Report Preview

Show:

``` text
Company logo
Company name
Report title
Month

Total Workers
Shift 1
Shift 2

Worker attendance table

[ Download PDF ]
```

The preview should be optimized for readability, not for editing.

------------------------------------------------------------------------

# 29. Profile

Layout:

``` text
Avatar

Suresh Kumar
Supervisor

Email
supervisor@company.com

Account Status
Active

App Version
1.0.0

[ Logout ]
```

Keep this screen intentionally simple.

------------------------------------------------------------------------

# 30. Empty States

Every list should have a meaningful empty state.

Example:

``` text
       [Icon]

No attendance records

Attendance records for the
selected filters will appear here.
```

Avoid empty blank screens.

------------------------------------------------------------------------

# 31. Loading States

Use skeleton loading for:

-   Dashboard metrics.
-   Attendance list.
-   Reports.
-   Worker information.

For QR validation, use a small centered loading indicator:

``` text
Checking worker...
```

Do not navigate to a separate loading page.

------------------------------------------------------------------------

# 32. Toasts and Feedback

Use lightweight top/bottom toast notifications for non-critical events.

Examples:

``` text
✓ Attendance marked successfully
✓ Report generated
✓ Report downloaded

! Network connection unavailable
```

Critical errors should use an inline state or modal instead of
disappearing toast-only messages.

------------------------------------------------------------------------

# 33. Accessibility

Minimum requirements:

-   Touch targets ≥ 44px.
-   Sufficient text contrast.
-   Do not communicate state using color alone.
-   Buttons must have readable labels.
-   Scanner instructions must remain readable.
-   Support dynamic font scaling where possible.
-   Avoid tiny metadata text below 11--12px.

------------------------------------------------------------------------

# 34. Responsive Behavior

The initial target is mobile portrait.

Design primarily for:

``` text
iPhone / Android
360–430px width
```

Avoid fixed pixel positioning.

Use:

``` text
Flexbox
SafeAreaView
ScrollView
FlatList
Responsive dimensions
```

The layout should adapt gracefully to different Android screen sizes.

------------------------------------------------------------------------

# 35. Component System

Recommended reusable components:

``` text
AppHeader
BottomTabBar
PrimaryButton
SecondaryButton
MetricCard
ShiftCard
WorkerCard
WorkerAvatar
StatusBadge
SearchBar
FilterButton
FilterBottomSheet
AttendanceRow
ReportCard
EmptyState
ErrorState
SuccessState
ScannerOverlay
LoadingSkeleton
Toast
ConfirmModal
```

------------------------------------------------------------------------

# 36. Design Tokens

A centralized token file should define:

``` text
colors
spacing
radius
typography
shadows
icon sizes
button heights
```

Do not hard-code design values repeatedly throughout screens.

------------------------------------------------------------------------

# 37. Overall UI Principle

The application should feel:

``` text
Calm
Clean
Fast
Readable
Professional
Human
```

It should not feel:

``` text
Overly corporate
Color-heavy
Dashboard-heavy
Animation-heavy
Crowded
```

The factory supervisor should be able to understand the current
attendance state within a few seconds and start scanning immediately.
