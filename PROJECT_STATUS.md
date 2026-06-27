# Project Status: Completed vs. Pending Tasks

This document provides a summary of recent updates, implemented UI changes, and pending tasks/minor changes needed for the **Attendance & Project Management** system.

---

## 🌟 Completed Features & UI Updates

### 1. Task Board & Card Customizations (`src/components/board/Card.tsx`, `BoardView.tsx`)
- **Card Context Menu**: Implemented a comprehensive context dropdown menu for tasks/cards, enabling quick actions:
  - **Leave**: Disassociate from task
  - **Move / Copy**: Options to relocate task cards
  - **Mirror / Template creation**: Interactive options (with premium alerts)
  - **Watch**: Watch task for updates
  - **Archive / Delete**: Delete/Archive cards
  - **Mark as done**: Instantly update the task status to done (hidden if task is already completed)
- **Bulk Action Enhancements**: Added an **"Assign Selected"** dropdown for selection mode. Admins/Managers can select multiple tasks and bulk-assign them to a specific project/board member.

### 2. Task Member Management (`src/components/board/TaskDetailModal.tsx`, `tasks-api.ts`)
- **Assign & Remove Members**:
  - Added a visual member list with `Avatar` components.
  - Allowed authorized users (`canManageBoard`) to remove members via a red deletion button (`✕`) on individual avatars.
  - Added a dashed "+" button next to the members to assign or manage members dynamically via a menu.
- **Backend API Integration**: Added helper methods `addTaskMember(taskId, userId)` and `removeTaskMember(taskId, userId)` in `src/lib/tasks-api.ts`.

### 3. API Reliability Improvements (`src/app/api/salary/calculate/route.ts`)
- **Safe JSON Parsing**: Replaced `req.json()` with `req.text()` check inside the salary calculation route, resolving potential crash issues when the client issues a POST request with an empty body.

---

## ⏳ Pending Tasks & Left Items

### 1. Static/Placeholder Actions
- The "Mirror board" and "Make template" buttons in `Card.tsx` currently trigger standard browser alerts (`alert('...')`). These should eventually be integrated with actual backend functions or modern UI toasts (e.g., custom toast components or sweetalert).

### 2. Minor UI & Layout Refinements
- **Dropdown Bounds**: The dropdown popup position coordinates (`menuCoords.top`/`menuCoords.bottom`) should be fully verified for responsiveness across smaller mobile layouts.
- **Z-Index Stack**: The task context menu is set to `zIndex: 9999`. Ensure there are no overlaps with global modals or sidebar menus on the dashboard.
- **Null Safety on Primary Assignee**: The member assignment flow updates the primary assignee (`assigned_to`) if it is not already set. Further checks could make sure the assignee syncs automatically if the primary assignee is deleted from the members list.

### 3. Verification & Testing
- Manual test flows on local server (`npm run dev`) to verify member adding/removal updates in the DB correctly without page refreshes.
