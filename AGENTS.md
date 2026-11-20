# Architecture

- Keep desktop journal student cells opaque even when highlighted; validate the ruler column against fixed student/final-column bounds on every scroll and clear it independently of an open grade popover.

- Store admin-managed initial periods and teacher classes in dedicated display-default tables, read through useSchoolData and resolve with tested displayDefaults helpers; manual navigation and existing access rules remain independent.

- Bundle Cyrillic/Latin UI fonts with the application instead of loading Google Fonts so rendering does not depend on a third-party font host.
- Keep school login and role loading in `useSchoolData`; distinguish failed role requests from empty results so network failures do not sign authenticated users out.
- Use tested `trimesterAutoGrades` rules and a shared `AutoTrimesterButton` for both teacher layouts; save all calculated final marks in one upsert through `useSchoolData` so weights, deadlines and persistence agree.
- Keep the auto-trimester action mounted while teacher selections load; resolve initial/manual quarters with `displayQuarter` and refresh local dates in both layouts so loading and calendar transitions do not remove the action or leave it on a stale period.
- Resolve the current teacher through `useCurrentTeacher` in the query data layer, not a one-shot effect, so transient auth/profile network failures retry and class/subject loading can recover.

- Keep diary homework queries in `useSchoolData.ts`, scoped to the authenticated class; reuse the homework rows as the notification feed so both homework creation paths and deletion stay consistent.
- Use one shared diary notification control across phone and desktop headers; keep homework read IDs per class account and personal event read IDs per student/account/browser, never use browser storage to authorize data access.
- Mark the entire loaded diary event feed read while open, independently of its active filter; merge IDs by event scope to preserve student isolation.
- Load grade deletion history with diary events to suppress obsolete grade links; deduplicate only identical events for the same grade and exact server timestamp, preserving distinct grades and later edits.
- Guard grade-cell submission synchronously for each opening so selecting a category/weight and closing cannot insert the same pending grade twice.
- Capture new and edited grade/cell comments in grade_history with database triggers; read personal events filtered by class and selected student, preserving actor and server event timestamp independently of lesson date.
- Preserve only validated diary homework-detail paths across login and student selection so notification links return to the intended assignment without an open redirect.
- Phone push delivery requires a linked messaging connector and a browser permission grant; do not simulate remote pushes with local browser notifications.
- Keep diary grade trends and subject rankings in pure tested `diaryGradeStats` functions; use created_at for latest received grade and compare exact weighted means before display rounding, returning no trend without a prior mean or actual change; ranking uses displayed two-decimal means and excludes final trimester marks.
- Load current absence rows alongside personal diary history, scoped to class and student; include absence type in read IDs so changed reasons are unread, and format absence dates without time in both feed and detail.
- Load all diary grades through `useDiaryGrades` scoped to the authenticated class; use shared `diaryProvisionalGrades` rules to display pending grades while excluding them from averages, trends and rankings through the inclusive correction deadline, matching the teacher journal.
- Use `useDiaryToday` on date-dependent diary screens to refresh at local midnight and tab resume; include its date in memo dependencies and retain raw peer grades so expiry recalculates statistics without requiring changed server rows.- Diary trimester visibility, current-trimester date list/feed and oldest-first grade order live in tested `diaryQuarters` helpers so all diary screens agree on the current trimester.
- Build the teacher class list from teacher_classes, class_subjects and classes.teacher_id, because admins assign classes through any of them.
