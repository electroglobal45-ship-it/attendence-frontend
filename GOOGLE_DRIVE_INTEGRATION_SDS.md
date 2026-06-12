# Google Drive Integration - Software Design Specification (SDS)

## Document Information
- **Version:** 1.0
- **Date:** June 10, 2026
- **Project:** Attendance & Project Management System
- **Feature:** Google Drive Integration

---

## 1. Executive Summary

### 1.1 Purpose
Enable users to connect their Google Drive accounts to the attendance/project management system, allowing seamless file sharing, storage, and collaboration directly from task cards and project boards.

### 1.2 Scope
- Google OAuth 2.0 authentication
- Drive file picker integration
- File attachment from Google Drive
- Direct file sharing and permissions management
- Real-time collaboration links
- Drive folder synchronization

### 1.3 Benefits
- **Storage Efficiency:** Reduce Supabase storage costs by using Google Drive
- **Collaboration:** Leverage Google's real-time collaboration features
- **User Convenience:** Single sign-on with existing Google accounts
- **File Management:** Centralized file organization per project/board

---

## 2. System Architecture

### 2.1 High-Level Architecture
```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Frontend      │         │   Backend API    │         │  Google Drive   │
│   (Next.js)     │◄───────►│   (Express.js)   │◄───────►│      API        │
└─────────────────┘         └──────────────────┘         └─────────────────┘
        │                            │                            │
        │                            │                            │
        ▼                            ▼                            ▼
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  React Context  │         │   PostgreSQL     │         │   OAuth 2.0     │
│  (Auth State)   │         │   (Supabase)     │         │   Token Store   │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

### 2.2 Technology Stack
- **Frontend:** Next.js 14, React 18, Google Picker API
- **Backend:** Node.js, Express.js, googleapis npm package
- **Database:** PostgreSQL (Supabase)
- **Authentication:** Google OAuth 2.0
- **Storage:** Google Drive API v3


---

## 3. Database Schema

### 3.1 New Tables

#### Table: `google_drive_connections`
```sql
CREATE TABLE google_drive_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMP NOT NULL,
  drive_email VARCHAR(255) NOT NULL,
  drive_name VARCHAR(255),
  scopes TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_synced TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id),
  INDEX idx_user_drive (user_id),
  INDEX idx_active (is_active)
);
```

#### Table: `task_drive_files`
```sql
CREATE TABLE task_drive_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  drive_file_id VARCHAR(255) NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  file_type VARCHAR(100),
  file_size BIGINT,
  mime_type VARCHAR(100),
  web_view_link TEXT,
  web_content_link TEXT,
  icon_link TEXT,
  thumbnail_link TEXT,
  can_edit BOOLEAN DEFAULT false,
  can_comment BOOLEAN DEFAULT false,
  shared_with_team BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_task_files (task_id),
  INDEX idx_user_files (user_id),
  INDEX idx_drive_file (drive_file_id)
);
```


#### Table: `board_drive_folders`
```sql
CREATE TABLE board_drive_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  drive_folder_id VARCHAR(255) NOT NULL,
  folder_name VARCHAR(500) NOT NULL,
  web_view_link TEXT,
  created_by UUID REFERENCES users(id),
  is_synced BOOLEAN DEFAULT true,
  last_synced TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(board_id),
  INDEX idx_board_folder (board_id)
);
```

### 3.2 Modified Tables

#### Add to `users` table:
```sql
ALTER TABLE users ADD COLUMN google_drive_connected BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN google_drive_email VARCHAR(255);
```

#### Add to `task_attachments` table:
```sql
ALTER TABLE task_attachments ADD COLUMN source VARCHAR(50) DEFAULT 'supabase';
ALTER TABLE task_attachments ADD COLUMN drive_file_id VARCHAR(255);
ALTER TABLE task_attachments ADD COLUMN drive_link TEXT;
```

---

## 4. API Endpoints

### 4.1 Authentication & Connection

#### POST `/api/v1/google-drive/connect`
**Description:** Initiate Google OAuth flow
**Auth:** Required (Bearer token)
**Request:**
```json
{
  "scopes": ["drive.file", "drive.readonly"]
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
  }
}
```


#### POST `/api/v1/google-drive/callback`
**Description:** Handle OAuth callback and store tokens
**Request:**
```json
{
  "code": "4/0AeaYSHAbc123...",
  "state": "user_session_state"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "email": "user@gmail.com",
    "name": "John Doe"
  }
}
```

#### DELETE `/api/v1/google-drive/disconnect`
**Description:** Revoke access and remove tokens
**Auth:** Required
**Response:**
```json
{
  "success": true,
  "message": "Google Drive disconnected successfully"
}
```

#### GET `/api/v1/google-drive/status`
**Description:** Check connection status
**Auth:** Required
**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "email": "user@gmail.com",
    "scopes": ["drive.file", "drive.readonly"],
    "lastSynced": "2026-06-10T10:30:00Z"
  }
}
```

### 4.2 File Operations

#### GET `/api/v1/google-drive/picker-token`
**Description:** Get temporary token for Google Picker
**Auth:** Required
**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "ya29.a0AfH6SMB...",
    "expiresIn": 3600
  }
}
```


#### POST `/api/v1/tasks/:taskId/drive-files`
**Description:** Attach Google Drive file to task
**Auth:** Required
**Request:**
```json
{
  "fileId": "1abc123xyz...",
  "fileName": "Project Proposal.pdf",
  "mimeType": "application/pdf",
  "webViewLink": "https://drive.google.com/file/d/...",
  "shareWithTeam": true
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "attachment": {
      "id": "uuid",
      "fileName": "Project Proposal.pdf",
      "source": "google_drive",
      "webViewLink": "https://drive.google.com/file/d/...",
      "sharedWithTeam": true,
      "createdAt": "2026-06-10T10:30:00Z"
    }
  }
}
```

#### GET `/api/v1/tasks/:taskId/drive-files`
**Description:** List all Google Drive files attached to task
**Auth:** Required
**Response:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": "uuid",
        "driveFileId": "1abc123xyz",
        "fileName": "Project Proposal.pdf",
        "mimeType": "application/pdf",
        "fileSize": 1024000,
        "webViewLink": "https://drive.google.com/file/d/...",
        "thumbnailLink": "https://lh3.googleusercontent.com/...",
        "canEdit": true,
        "sharedWithTeam": true,
        "owner": {
          "name": "John Doe",
          "email": "john@example.com"
        },
        "createdAt": "2026-06-10T10:30:00Z"
      }
    ]
  }
}
```


#### DELETE `/api/v1/tasks/:taskId/drive-files/:fileId`
**Description:** Remove Drive file attachment (doesn't delete from Drive)
**Auth:** Required
**Response:**
```json
{
  "success": true,
  "message": "File attachment removed"
}
```

#### POST `/api/v1/tasks/:taskId/drive-files/:fileId/share`
**Description:** Share Drive file with task members
**Auth:** Required (Admin only)
**Request:**
```json
{
  "role": "writer",
  "members": ["user1@example.com", "user2@example.com"]
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "shared": 2,
    "failed": 0,
    "permissions": [
      {
        "email": "user1@example.com",
        "role": "writer"
      }
    ]
  }
}
```

### 4.3 Board Folder Operations

#### POST `/api/v1/boards/:boardId/drive-folder`
**Description:** Create or link Drive folder to board
**Auth:** Required (Admin only)
**Request:**
```json
{
  "folderName": "Project Alpha - Documents",
  "createNew": true
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "folderId": "1xyz789abc",
    "folderName": "Project Alpha - Documents",
    "webViewLink": "https://drive.google.com/drive/folders/...",
    "createdAt": "2026-06-10T10:30:00Z"
  }
}
```


#### GET `/api/v1/boards/:boardId/drive-folder`
**Description:** Get board's Drive folder info
**Auth:** Required
**Response:**
```json
{
  "success": true,
  "data": {
    "folderId": "1xyz789abc",
    "folderName": "Project Alpha - Documents",
    "webViewLink": "https://drive.google.com/drive/folders/...",
    "fileCount": 15,
    "lastSynced": "2026-06-10T10:00:00Z"
  }
}
```

---

## 5. Frontend Components

### 5.1 Connection Component

#### Component: `GoogleDriveConnect.tsx`
**Location:** `src/components/integrations/GoogleDriveConnect.tsx`

**Features:**
- Connection status indicator
- "Connect Google Drive" button
- OAuth flow handling
- Disconnect functionality
- Permission scope display

**UI Elements:**
```tsx
┌─────────────────────────────────────────────┐
│  Google Drive Integration                   │
│                                             │
│  ● Not Connected                            │
│                                             │
│  Connect your Google Drive to:             │
│  • Share files directly from Drive         │
│  • Collaborate in real-time                │
│  • Save storage space                      │
│                                             │
│  [🔗 Connect Google Drive]                 │
│                                             │
└─────────────────────────────────────────────┘
```

**Connected State:**
```tsx
┌─────────────────────────────────────────────┐
│  Google Drive Integration                   │
│                                             │
│  ✓ Connected as: user@gmail.com            │
│                                             │
│  Last synced: 2 minutes ago                │
│                                             │
│  [⚙️ Settings] [🔓 Disconnect]             │
│                                             │
└─────────────────────────────────────────────┘
```


### 5.2 File Picker Component

#### Component: `DriveFilePicker.tsx`
**Location:** `src/components/integrations/DriveFilePicker.tsx`

**Features:**
- Google Picker API integration
- Multi-file selection
- File preview
- Permission management
- Folder browsing

**UI Elements:**
```tsx
┌─────────────────────────────────────────────┐
│  Add from Google Drive                      │
│  ─────────────────────────────────────      │
│                                             │
│  📁 Recent Files                            │
│  📁 My Drive                                │
│  📁 Shared with me                          │
│  📁 Starred                                 │
│                                             │
│  [🔍 Search Drive...]                       │
│                                             │
│  Selected: 2 files                          │
│  ☑ Share with task members                 │
│                                             │
│  [Cancel] [Add Files]                       │
└─────────────────────────────────────────────┘
```

### 5.3 Task Attachment Enhancement

#### Modified Component: `TaskDetailModal.tsx`

**Add Drive Tab:**
```tsx
// Attachment tabs
[Uploaded Files] [Google Drive] [All]

// Drive files section
┌─────────────────────────────────────────────┐
│  Google Drive Files (3)                     │
│  ─────────────────────────────────────      │
│                                             │
│  📄 Project Proposal.pdf                    │
│     Shared with team • 2.5 MB              │
│     [👁 View] [✏️ Edit] [↗️ Open in Drive]  │
│                                             │
│  📊 Budget Spreadsheet.xlsx                 │
│     Private • 1.2 MB                        │
│     [👁 View] [🔗 Share]                    │
│                                             │
│  [+ Add from Google Drive]                  │
└─────────────────────────────────────────────┘
```


### 5.4 Board Settings Enhancement

#### Add to Board Settings:

```tsx
┌─────────────────────────────────────────────┐
│  Board Settings                              │
│  ─────────────────────────────────────      │
│                                             │
│  📁 Google Drive Integration                │
│                                             │
│  Board Folder:                              │
│  [Project Alpha - Documents      ] [Browse] │
│                                             │
│  ☑ Auto-organize files by list              │
│  ☑ Share new files with members             │
│  ☐ Sync existing Drive folder               │
│                                             │
│  [↗️ Open Folder in Drive]                  │
│                                             │
│  [Save Settings]                            │
└─────────────────────────────────────────────┘
```

---

## 6. User Flows

### 6.1 Initial Connection Flow

```
1. User clicks "Connect Google Drive" button
   ↓
2. System generates OAuth URL with required scopes
   ↓
3. User redirected to Google login/consent page
   ↓
4. User authorizes required permissions
   ↓
5. Google redirects back with authorization code
   ↓
6. Backend exchanges code for access/refresh tokens
   ↓
7. Tokens stored encrypted in database
   ↓
8. Frontend shows "Connected" status
   ↓
9. User can now attach Drive files
```

### 6.2 File Attachment Flow

```
1. User opens task detail modal
   ↓
2. User clicks "Add from Google Drive"
   ↓
3. Google Picker modal opens
   ↓
4. User browses and selects file(s)
   ↓
5. User chooses sharing options:
   - Share with task members
   - Permission level (view/edit)
   ↓
6. Frontend sends file metadata to backend
   ↓
7. Backend:
   - Verifies Drive access
   - Stores file reference in database
   - Updates file permissions if sharing
   ↓
8. File appears in task attachments
   ↓
9. Activity log updated
```


### 6.3 Auto-Share with Team Flow

```
1. Admin enables "Share with team members"
   ↓
2. User attaches Drive file to task
   ↓
3. Backend retrieves task members
   ↓
4. For each member with Google Drive connected:
   - Backend calls Drive API to share file
   - Grants appropriate permission (viewer/editor)
   ↓
5. For members without Drive:
   - Generate shareable link
   - Store in database
   ↓
6. All team members can access file
   ↓
7. Notification sent to team members
```

---

## 7. Security Considerations

### 7.1 Token Management

**Encryption:**
- All access/refresh tokens encrypted at rest using AES-256
- Encryption keys stored in environment variables
- Never exposed in API responses or logs

**Token Refresh:**
```javascript
// Automatic token refresh logic
async function ensureValidToken(userId) {
  const connection = await getConnection(userId);
  
  if (connection.tokenExpiry < Date.now() + 300000) {
    // Token expires in less than 5 minutes
    const newTokens = await refreshAccessToken(connection.refreshToken);
    await updateTokens(userId, newTokens);
  }
  
  return connection.accessToken;
}
```

### 7.2 Permission Scopes

**Minimum Required Scopes:**
- `https://www.googleapis.com/auth/drive.file` - Access files created by app
- `https://www.googleapis.com/auth/drive.readonly` - Read user's files

**Optional Scopes:**
- `https://www.googleapis.com/auth/drive` - Full Drive access (for folder sync)
- `https://www.googleapis.com/auth/drive.metadata.readonly` - File metadata


### 7.3 Access Control

**Role-Based Permissions:**
- **Admin:** Full Drive integration control, can share with team
- **Employee:** Can connect own Drive, attach files to assigned tasks
- **Viewer:** Can only view shared Drive files

**File Sharing Rules:**
- Only file owner can modify sharing settings
- Admin can force-share files with team
- Disconnecting Drive doesn't delete shared files
- File permissions sync with task member changes

### 7.4 Data Privacy

**Compliance:**
- GDPR compliant: User can disconnect and delete all data
- No file content stored on our servers
- Only metadata and links stored
- User consent required for all scopes

**Data Retention:**
- Connection data deleted on user request
- File references removed when task is deleted
- Activity logs retained for 90 days
- Audit trail for admin actions

---

## 8. Implementation Plan

### 8.1 Phase 1: Core Integration (Week 1-2)

**Backend:**
- [ ] Set up Google Cloud Project
- [ ] Enable Drive API
- [ ] Create OAuth 2.0 credentials
- [ ] Implement OAuth flow endpoints
- [ ] Create database tables
- [ ] Implement token management
- [ ] Add encryption for tokens

**Frontend:**
- [ ] Create GoogleDriveConnect component
- [ ] Implement OAuth redirect handling
- [ ] Add connection status indicator
- [ ] Create settings page section

**Testing:**
- [ ] OAuth flow end-to-end
- [ ] Token refresh mechanism
- [ ] Connection/disconnection


### 8.2 Phase 2: File Picker & Attachments (Week 3-4)

**Backend:**
- [ ] Implement file attachment endpoints
- [ ] Add Drive file metadata retrieval
- [ ] Create file permission management
- [ ] Add webhook for Drive changes (optional)

**Frontend:**
- [ ] Integrate Google Picker API
- [ ] Modify TaskDetailModal for Drive files
- [ ] Add file preview functionality
- [ ] Implement share controls
- [ ] Add file type icons and thumbnails

**Testing:**
- [ ] File selection and attachment
- [ ] Multiple file handling
- [ ] Permission updates
- [ ] File removal

### 8.3 Phase 3: Team Sharing (Week 5)

**Backend:**
- [ ] Implement auto-share logic
- [ ] Add batch permission updates
- [ ] Create sharing notification system
- [ ] Add permission sync on member changes

**Frontend:**
- [ ] Add "Share with team" toggle
- [ ] Show sharing status indicators
- [ ] Display permission levels
- [ ] Add sharing activity to logs

**Testing:**
- [ ] Team member sharing
- [ ] Permission level verification
- [ ] Notification delivery
- [ ] Edge cases (member leaves/joins)

### 8.4 Phase 4: Board Folders (Week 6)

**Backend:**
- [ ] Implement folder creation API
- [ ] Add folder linking logic
- [ ] Create folder sync mechanism
- [ ] Add auto-organization by list

**Frontend:**
- [ ] Add folder settings to board
- [ ] Create folder browser
- [ ] Show folder file counts
- [ ] Add "Open in Drive" links

**Testing:**
- [ ] Folder creation and linking
- [ ] File organization
- [ ] Sync accuracy
- [ ] Performance with large folders


---

## 9. Technical Requirements

### 9.1 Google Cloud Setup

**Required Steps:**
1. Create Google Cloud Project
2. Enable Google Drive API
3. Configure OAuth consent screen
4. Create OAuth 2.0 Client ID (Web application)
5. Add authorized redirect URIs
6. Generate API key for Picker API

**OAuth Consent Screen:**
- Application name: "Attendance & Project Management"
- User support email
- Developer contact email
- Scopes: drive.file, drive.readonly
- Test users (during development)

### 9.2 Environment Variables

**Backend (.env):**
```bash
# Google Drive API
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://your-backend.com/api/v1/google-drive/callback

# Token Encryption
DRIVE_TOKEN_ENCRYPTION_KEY=32_byte_hex_string

# Google API Key (for Picker)
GOOGLE_API_KEY=your_api_key

# OAuth Scopes
GOOGLE_DRIVE_SCOPES=https://www.googleapis.com/auth/drive.file,https://www.googleapis.com/auth/drive.readonly
```

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_API_KEY=your_api_key
NEXT_PUBLIC_GOOGLE_APP_ID=your_app_id
```

### 9.3 NPM Packages

**Backend:**
```json
{
  "dependencies": {
    "googleapis": "^140.0.0",
    "google-auth-library": "^9.0.0"
  }
}
```

**Frontend:**
```json
{
  "dependencies": {
    "@react-oauth/google": "^0.12.1"
  }
}
```


---

## 10. Error Handling

### 10.1 Common Errors

**Authentication Errors:**
```javascript
{
  "DRIVE_NOT_CONNECTED": {
    "code": 401,
    "message": "Google Drive not connected",
    "action": "CONNECT_DRIVE"
  },
  "TOKEN_EXPIRED": {
    "code": 401,
    "message": "Access token expired",
    "action": "REFRESH_TOKEN"
  },
  "INVALID_CREDENTIALS": {
    "code": 401,
    "message": "Invalid OAuth credentials",
    "action": "RECONNECT"
  }
}
```

**Permission Errors:**
```javascript
{
  "INSUFFICIENT_PERMISSIONS": {
    "code": 403,
    "message": "Additional permissions required",
    "requiredScopes": ["drive.readonly"]
  },
  "FILE_NOT_ACCESSIBLE": {
    "code": 403,
    "message": "Cannot access file",
    "reason": "File not shared or deleted"
  }
}
```

**Rate Limiting:**
```javascript
{
  "RATE_LIMIT_EXCEEDED": {
    "code": 429,
    "message": "Too many Drive API requests",
    "retryAfter": 60
  }
}
```

### 10.2 Error Recovery

**Automatic Recovery:**
- Token refresh on 401 errors
- Retry failed requests up to 3 times
- Exponential backoff for rate limits
- Fallback to Supabase storage if Drive fails

**User Actions:**
- Clear error messages with suggested actions
- "Reconnect Drive" button on auth errors
- "Request Access" for permission errors
- Activity log for failed operations


---

## 11. Performance Optimization

### 11.1 Caching Strategy

**Token Caching:**
```javascript
// Cache valid tokens in memory for 5 minutes
const tokenCache = new Map();

function getCachedToken(userId) {
  const cached = tokenCache.get(userId);
  if (cached && cached.expiry > Date.now()) {
    return cached.token;
  }
  return null;
}
```

**File Metadata Caching:**
- Cache Drive file metadata for 15 minutes
- Invalidate on file updates
- Use Redis for distributed caching in production

### 11.2 Batch Operations

**Batch Permission Updates:**
```javascript
async function shareWithMultipleUsers(fileId, userIds) {
  // Batch API calls instead of sequential
  const promises = userIds.map(userId => 
    drive.permissions.create({
      fileId: fileId,
      requestBody: { role: 'reader', type: 'user', emailAddress: userId }
    })
  );
  
  return await Promise.allSettled(promises);
}
```

### 11.3 Lazy Loading

**Frontend Optimization:**
- Load Google Picker library on-demand
- Lazy load Drive file previews
- Paginate file lists (50 items per page)
- Use virtual scrolling for large file lists

### 11.4 Database Optimization

**Indexes:**
```sql
-- Optimize queries
CREATE INDEX idx_drive_conn_user_active ON google_drive_connections(user_id, is_active);
CREATE INDEX idx_task_drive_files_lookup ON task_drive_files(task_id, user_id);
CREATE INDEX idx_board_folder_board ON board_drive_folders(board_id);
```


---

## 12. Testing Strategy

### 12.1 Unit Tests

**Backend Tests:**
```javascript
describe('Google Drive Service', () => {
  test('should exchange OAuth code for tokens', async () => {
    const result = await driveService.exchangeCodeForTokens(mockCode);
    expect(result).toHaveProperty('access_token');
    expect(result).toHaveProperty('refresh_token');
  });
  
  test('should refresh expired token', async () => {
    const newToken = await driveService.refreshToken(mockRefreshToken);
    expect(newToken.expiry).toBeGreaterThan(Date.now());
  });
  
  test('should encrypt tokens before storage', () => {
    const encrypted = driveService.encryptToken(mockToken);
    expect(encrypted).not.toEqual(mockToken);
  });
});
```

**Frontend Tests:**
```javascript
describe('GoogleDriveConnect Component', () => {
  test('renders connection button when not connected', () => {
    render(<GoogleDriveConnect connected={false} />);
    expect(screen.getByText('Connect Google Drive')).toBeInTheDocument();
  });
  
  test('shows connected status with email', () => {
    render(<GoogleDriveConnect connected={true} email="user@gmail.com" />);
    expect(screen.getByText('user@gmail.com')).toBeInTheDocument();
  });
});
```

### 12.2 Integration Tests

**OAuth Flow:**
- Test complete OAuth flow end-to-end
- Verify token storage and retrieval
- Test token refresh mechanism

**File Operations:**
- Test file attachment flow
- Verify permission updates
- Test file removal (doesn't delete from Drive)

### 12.3 E2E Tests

**User Workflows:**
```javascript
test('User can connect Drive and attach file to task', async () => {
  // 1. Navigate to settings
  await page.goto('/settings');
  
  // 2. Click connect Drive
  await page.click('[data-testid="connect-drive"]');
  
  // 3. Complete OAuth (mock)
  await mockGoogleOAuth();
  
  // 4. Open task detail
  await page.goto('/board/test-board');
  await page.click('.task-card');
  
  // 5. Attach Drive file
  await page.click('[data-testid="add-drive-file"]');
  await selectDriveFile('test-document.pdf');
  
  // 6. Verify attachment appears
  expect(await page.textContent('.drive-attachment')).toContain('test-document.pdf');
});
```

### 12.4 Load Testing

**Performance Benchmarks:**
- OAuth flow: < 2 seconds
- File picker load: < 1 second
- File attachment: < 3 seconds
- Batch sharing (10 users): < 5 seconds

**Stress Testing:**
- 100 concurrent OAuth requests
- 1000 file attachments per hour
- 50 simultaneous file picker sessions


---

## 13. Monitoring & Analytics

### 13.1 Metrics to Track

**Usage Metrics:**
- Number of connected users
- Daily Drive file attachments
- Files shared with teams
- OAuth success/failure rate
- Token refresh frequency

**Performance Metrics:**
- API response times
- File picker load time
- OAuth flow completion time
- Error rates by endpoint

**Business Metrics:**
- Storage saved vs Supabase
- User adoption rate
- Files per task average
- Most shared file types

### 13.2 Logging

**Backend Logging:**
```javascript
logger.info('Drive connection established', {
  userId: user.id,
  email: driveEmail,
  scopes: grantedScopes
});

logger.error('File sharing failed', {
  userId: user.id,
  fileId: fileId,
  error: error.message,
  recipients: failedRecipients
});
```

**Activity Tracking:**
- OAuth connections/disconnections
- File attachments/removals
- Permission changes
- Error occurrences

### 13.3 Alerts

**Critical Alerts:**
- OAuth failure rate > 10%
- Token refresh failures
- API quota exceeded
- Storage permission errors

**Warning Alerts:**
- High API latency (> 5 seconds)
- Unusual activity patterns
- Low disk space on Drive
- Approaching quota limits


---

## 14. Migration & Rollout Plan

### 14.1 Beta Testing Phase (Week 1-2)

**Beta User Selection:**
- 10-20 internal users
- Mix of admin and employee roles
- Active task board users

**Feedback Collection:**
- Daily usage surveys
- Bug reporting channel
- Feature request tracking
- Performance monitoring

**Success Criteria:**
- < 5% error rate
- > 80% user satisfaction
- No critical bugs
- All workflows functional

### 14.2 Staged Rollout (Week 3-4)

**Phase 1: Opt-in (25% users)**
- Feature flag enabled for interested users
- Monitor performance and errors
- Collect feedback

**Phase 2: Default-on (50% users)**
- Enable for half of user base
- Compare adoption rates
- Optimize based on usage patterns

**Phase 3: Full Rollout (100% users)**
- Enable for all users
- Provide training materials
- Monitor adoption metrics

### 14.3 Rollback Plan

**Trigger Conditions:**
- Error rate > 15%
- Critical security issue
- API quota exhaustion
- Data corruption

**Rollback Steps:**
1. Disable feature flag
2. Stop new OAuth connections
3. Maintain existing connections
4. Notify users of temporary unavailability
5. Fix issues in staging
6. Re-enable with fixes


---

## 15. Cost Analysis

### 15.1 Google Cloud Costs

**API Usage (Free Tier):**
- Drive API: 1 billion queries/day (free)
- Picker API: Unlimited (free)
- OAuth 2.0: Free

**Storage:**
- Files stored in user's Drive (no cost to us)
- Only metadata stored in our database

**Estimated Monthly Cost:**
- Google Cloud Project: $0 (within free tier)
- Additional API calls: $0 (unless > 1B queries/day)

### 15.2 Infrastructure Costs

**Database Storage:**
- ~50 bytes per file reference
- 10,000 files = 500KB
- Negligible cost increase

**Backend Processing:**
- Token management overhead: ~5ms per request
- Minimal CPU increase

**Total Additional Cost:**
- **Estimated: $0-5/month** (within existing infrastructure)

### 15.3 Cost Savings

**Supabase Storage Reduction:**
- Average file size: 2MB
- 1000 files/month to Drive: 2GB saved
- Supabase cost: $0.021/GB = **$42 saved/month**

**ROI:**
- Investment: 6 weeks development (~$12,000)
- Savings: $42/month + improved UX
- Payback: 23 years (but UX value is immediate)

**Note:** Primary value is user convenience and real-time collaboration, not cost savings.


---

## 16. User Documentation

### 16.1 User Guide Sections

#### For Employees:
1. **Connecting Google Drive**
   - Step-by-step OAuth flow
   - Permission explanations
   - Troubleshooting connection issues

2. **Attaching Drive Files**
   - Using the file picker
   - Selecting multiple files
   - Understanding file permissions

3. **Viewing Shared Files**
   - Opening files in Drive
   - Editing permissions
   - Downloading files

#### For Admins:
1. **Managing Team Access**
   - Sharing files with team
   - Setting permission levels
   - Removing access

2. **Board Folders**
   - Creating board folders
   - Organizing files
   - Syncing existing folders

3. **Monitoring Usage**
   - Viewing connection status
   - Usage statistics
   - Common issues

### 16.2 Video Tutorials

**Tutorial Topics:**
- "How to Connect Google Drive" (2 min)
- "Attaching Drive Files to Tasks" (3 min)
- "Sharing Files with Your Team" (4 min)
- "Managing Board Folders" (5 min)

### 16.3 FAQ

**Q: Do I need a Google account?**
A: Yes, you need a Google/Gmail account to use Drive integration.

**Q: What permissions does the app need?**
A: We only request access to files you explicitly share with the app.

**Q: Can I disconnect my Drive anytime?**
A: Yes, disconnect anytime from settings. Shared files remain accessible via links.

**Q: Will disconnecting delete my files?**
A: No, your Drive files are never deleted. Only the connection is removed.

**Q: How secure is my data?**
A: All tokens are encrypted. We never access file contents, only metadata.


---

## 17. Future Enhancements

### 17.1 Phase 2 Features (Q3 2026)

**Advanced Collaboration:**
- Real-time document editing within app (iframe embed)
- Comment sync between Drive and task comments
- Activity feed integration
- Notification when file is edited

**Smart Organization:**
- Auto-create folders by project/board
- File naming conventions enforcement
- Automatic file categorization by type
- Duplicate file detection

**Advanced Sharing:**
- Bulk permission updates
- Role-based default permissions
- Expiring share links
- Access audit logs

### 17.2 Phase 3 Features (Q4 2026)

**AI-Powered Features:**
- Smart file recommendations
- Auto-tagging based on content
- Duplicate detection
- Related file suggestions

**Cross-Platform:**
- Mobile app Drive integration
- Offline file access
- File version control
- Conflict resolution

**Integrations:**
- Google Docs template creation
- Google Sheets data import
- Google Slides presentation mode
- Google Forms integration

### 17.3 Enterprise Features (2027)

**Advanced Security:**
- DLP (Data Loss Prevention) integration
- Custom retention policies
- Advanced encryption options
- Compliance reporting

**Analytics:**
- File usage dashboards
- Collaboration metrics
- Storage optimization insights
- User activity reports

**Administration:**
- Centralized Drive management
- Bulk user provisioning
- Policy enforcement
- Custom branding


---

## 18. Risks & Mitigation

### 18.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Google API quota exceeded | High | Low | Implement caching, rate limiting, monitor usage |
| Token security breach | Critical | Very Low | Encrypt tokens, use secure storage, audit access |
| OAuth flow complexity | Medium | Medium | Thorough testing, clear error messages, fallback options |
| Drive API changes | Medium | Low | Monitor Google updates, maintain backward compatibility |
| Performance degradation | Medium | Low | Optimize queries, implement caching, load testing |

### 18.2 User Experience Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Confusing permissions | Medium | Medium | Clear UI labels, tooltips, help documentation |
| Lost files perception | High | Medium | Clear communication that files stay in Drive |
| Slow file picker | Medium | Medium | Lazy loading, pagination, performance optimization |
| Connection failures | Medium | Medium | Retry logic, clear error messages, support channel |

### 18.3 Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Low adoption rate | Medium | Medium | Training, documentation, showcase benefits |
| Support overhead | Medium | Medium | Comprehensive FAQ, video tutorials, self-service |
| Google policy changes | High | Low | Monitor terms of service, have contingency plan |
| Data privacy concerns | High | Very Low | Clear privacy policy, minimal data collection |

---

## 19. Success Metrics

### 19.1 Adoption Metrics

**Target (6 months post-launch):**
- 60% of active users connect Drive
- 40% of tasks have Drive attachments
- 5+ Drive files per active user/month

### 19.2 Performance Metrics

**Targets:**
- OAuth completion rate: > 95%
- File attachment success rate: > 98%
- Average file picker load time: < 1.5s
- API error rate: < 2%

### 19.3 User Satisfaction

**Targets:**
- User satisfaction score: > 4/5
- Feature usefulness rating: > 4/5
- Would recommend to colleague: > 80%

### 19.4 Business Impact

**Targets:**
- Support tickets related to files: -30%
- Time to share files: -50%
- Collaboration efficiency: +25%
- Storage costs: -20%


---

## 20. Conclusion

### 20.1 Summary

This Google Drive Integration feature will:

✅ **Enhance Collaboration**
- Real-time document collaboration
- Seamless file sharing within teams
- Centralized file management per board

✅ **Improve User Experience**
- Single sign-on with Google accounts
- Familiar Drive interface
- Reduced friction in file workflows

✅ **Optimize Costs**
- Reduce Supabase storage usage
- Leverage free Google Drive storage
- Minimal infrastructure overhead

✅ **Maintain Security**
- Encrypted token storage
- Minimal permission scopes
- GDPR compliant data handling

### 20.2 Key Deliverables

**Phase 1 (Week 1-2): Core Integration**
- OAuth 2.0 authentication flow
- Database schema and migrations
- Basic connection management UI
- Token encryption and refresh

**Phase 2 (Week 3-4): File Operations**
- Google Picker integration
- File attachment to tasks
- Permission management
- File preview and opening

**Phase 3 (Week 5): Team Features**
- Auto-share with team members
- Batch permission updates
- Activity logging
- Sharing notifications

**Phase 4 (Week 6): Board Folders**
- Board folder creation/linking
- File organization
- Folder synchronization
- Admin controls

### 20.3 Next Steps

1. **Approval & Resource Allocation**
   - Review and approve SDS
   - Assign development team
   - Set up Google Cloud project

2. **Development Environment Setup**
   - Create OAuth credentials
   - Configure test accounts
   - Set up staging environment

3. **Sprint Planning**
   - Break down tasks into user stories
   - Estimate story points
   - Plan 2-week sprints

4. **Begin Implementation**
   - Start with Phase 1: Core Integration
   - Daily standups and progress tracking
   - Weekly demos to stakeholders

---


