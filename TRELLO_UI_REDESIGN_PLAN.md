# Trello UI Redesign Plan

## Overview
Transform the current task management system to match Trello's visual design and user experience while maintaining existing functionality.

## Key Trello Design Elements to Implement

### 1. **Color Scheme & Visual Identity**
- **Background**: Light blue gradient (#0079BF → #026AA7) for board backgrounds
- **Cards**: Pure white (#FFFFFF) with subtle shadows
- **Lists**: Light grey (#EBECF0) with rounded corners
- **Hover states**: Subtle elevation and shadow changes
- **Accent colors**: Trello blue (#0079BF) for primary actions

### 2. **Board Layout**
- **Full-screen board view** with horizontal scrolling
- **Sticky header** with board name, star, members, and menu
- **Background options**: Solid colors, gradients, or images
- **List width**: Fixed 272px width per list
- **Spacing**: 8px gap between lists, 8px padding inside lists

### 3. **List Design**
- **Header**: List name + card count + menu (...)
- **Add card button**: Always visible at bottom of list
- **Drag handle**: Entire list header is draggable
- **Scrollable**: Individual list scrolling when cards overflow
- **Actions**: Rename, copy, move, archive list

### 4. **Card Design**
- **Compact view**: Title + badges (labels, due date, checklist progress, attachments, comments)
- **Cover images**: Optional colored banner or image at top
- **Labels**: Colored horizontal bars at top (can show name or just color)
- **Badges**: Small icons with counts (checklist: 2/5, comments: 3, attachments: 1)
- **Members**: Small circular avatars on right side
- **Hover effect**: Slight elevation with edit pencil icon

### 5. **Card Modal (Quick Edit)**
- **Slide-in from right** (not center modal)
- **Two-column layout**: Main content (left) + Actions sidebar (right)
- **Cover image** at top
- **Inline editing**: Click to edit title, description
- **Activity feed**: Comments + system activities mixed
- **Sidebar actions**: Add members, labels, checklist, due date, attachment, cover
- **Quick actions**: Move, copy, archive, delete

### 6. **Interactive Elements**

#### Labels
- **Color-coded tags** at top of card
- **Quick label picker** with keyboard shortcuts
- **Create new labels** inline
- **Show/hide label names** toggle

#### Checklists
- **Progress bar** showing completion
- **Inline add items** with Enter key
- **Drag to reorder** items
- **Convert to card** option

#### Due Dates
- **Calendar picker** with time option
- **Visual indicators**: Green (complete), yellow (due soon), red (overdue)
- **Reminders**: 1 day before, 1 hour before

#### Comments
- **@mentions** for team members
- **Markdown support** for formatting
- **Edit/delete** own comments
- **Activity log** mixed with comments

### 7. **Interactions & Animations**

#### Drag & Drop
- **Smooth animations** during drag
- **Ghost card** showing drop position
- **Auto-scroll** when dragging near edges
- **Drag cards between lists**
- **Drag lists to reorder**

#### Keyboard Shortcuts
- `N` - New card
- `Q` - Quick card editor
- `F` - Filter cards
- `B` - Open boards menu
- `Esc` - Close modals
- `Arrow keys` - Navigate cards

#### Hover States
- **Cards**: Slight shadow + edit icon
- **Lists**: Highlight header
- **Buttons**: Color change + slight scale

### 8. **Header & Navigation**

#### Board Header
```
[Board Name] [★] [Personal/Team] | [Members...] [Invite] [•••] [Show Menu]
```

#### Board Menu (Right Sidebar)
- About this board
- Change background
- Filter cards
- Power-ups
- Automation
- Activity
- Settings
- Close board

### 9. **Responsive Design**
- **Desktop**: Full horizontal scrolling board
- **Tablet**: Stacked lists with swipe navigation
- **Mobile**: Single list view with bottom navigation

## Implementation Priority

### Phase 1: Core Visual Redesign (High Priority)
1. ✅ Update color scheme to Trello blue theme
2. ✅ Redesign card component with badges and labels
3. ✅ Redesign list component with proper styling
4. ✅ Implement board background options
5. ✅ Add card cover colors/images
6. ✅ Update typography and spacing

### Phase 2: Enhanced Interactions (Medium Priority)
7. ✅ Improve drag-and-drop visual feedback
8. ✅ Add card quick edit (pencil icon on hover)
9. ✅ Implement label color picker and management
10. ✅ Add checklist progress badges on cards
11. ✅ Show comment and attachment counts
12. ✅ Add member avatars on cards

### Phase 3: Advanced Features (Lower Priority)
13. ⏳ Implement board menu sidebar
14. ⏳ Add keyboard shortcuts
15. ⏳ Implement card filtering
16. ⏳ Add board backgrounds (colors/images)
17. ⏳ Implement @mentions in comments
18. ⏳ Add activity feed
19. ⏳ Implement card templates

## Design Specifications

### Colors
```css
/* Primary */
--trello-blue: #0079BF;
--trello-blue-dark: #026AA7;
--trello-blue-light: #5BA4CF;

/* Backgrounds */
--board-bg: linear-gradient(135deg, #0079BF 0%, #026AA7 100%);
--list-bg: #EBECF0;
--card-bg: #FFFFFF;

/* Text */
--text-primary: #172B4D;
--text-secondary: #5E6C84;
--text-tertiary: #8993A4;

/* Borders */
--border-light: #DFE1E6;
--border-medium: #C1C7D0;

/* Status Colors */
--green: #61BD4F;
--yellow: #F2D600;
--orange: #FF9F1A;
--red: #EB5A46;
--purple: #C377E0;
--blue: #0079BF;
--sky: #00C2E0;
--lime: #51E898;
--pink: #FF78CB;
--black: #344563;
```

### Typography
```css
/* Trello uses -apple-system font stack */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Noto Sans", "Ubuntu", "Droid Sans", "Helvetica Neue", sans-serif;

/* Sizes */
--text-xs: 11px;
--text-sm: 12px;
--text-base: 14px;
--text-lg: 16px;
--text-xl: 18px;
--text-2xl: 20px;
```

### Spacing
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
```

### Shadows
```css
--shadow-card: 0 1px 0 rgba(9, 30, 66, 0.13);
--shadow-card-hover: 0 4px 8px rgba(9, 30, 66, 0.25);
--shadow-list: 0 1px 2px rgba(9, 30, 66, 0.13);
--shadow-modal: 0 8px 16px rgba(9, 30, 66, 0.25);
```

### Border Radius
```css
--radius-sm: 3px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-full: 9999px;
```

## Component Breakdown

### 1. TrelloBoard Component
- Full-screen container with background
- Horizontal scroll for lists
- Sticky header with board info
- Add list button at end

### 2. TrelloList Component
- Fixed 272px width
- Light grey background (#EBECF0)
- Rounded corners (8px)
- Header with name, count, menu
- Scrollable card area
- Add card button at bottom

### 3. TrelloCard Component
- White background with subtle shadow
- Optional cover color/image
- Labels as colored bars
- Title (bold, 14px)
- Badges row (due date, checklist, comments, attachments)
- Member avatars (bottom right)
- Hover: shadow + edit icon

### 4. TrelloCardModal Component
- Slide from right (not center)
- Two-column layout
- Cover image section
- Inline editable fields
- Activity feed
- Action sidebar

### 5. TrelloLabel Component
- Colored horizontal bar
- Optional text label
- Hover: show full name
- Click: open label picker

### 6. TrelloBadge Component
- Small icon + text/count
- Grey background
- Hover: darker grey
- Types: due date, checklist, comments, attachments, description

## Files to Create/Modify

### New Components
- `src/components/trello/TrelloBoard.tsx`
- `src/components/trello/TrelloList.tsx`
- `src/components/trello/TrelloCard.tsx`
- `src/components/trello/TrelloCardModal.tsx`
- `src/components/trello/TrelloLabel.tsx`
- `src/components/trello/TrelloBadge.tsx`
- `src/components/trello/TrelloBoardHeader.tsx`
- `src/components/trello/TrelloBoardMenu.tsx`
- `src/components/trello/TrelloQuickEdit.tsx`
- `src/components/trello/TrelloLabelPicker.tsx`
- `src/components/trello/TrelloMemberPicker.tsx`

### Modified Components
- `src/app/(admin)/projects/[id]/page.tsx` - Use new Trello components
- `src/app/globals.css` - Add Trello color variables
- `tailwind.config.ts` - Add Trello theme colors

### New Utilities
- `src/lib/trello-colors.ts` - Label and background colors
- `src/hooks/useTrelloKeyboard.ts` - Keyboard shortcuts
- `src/hooks/useTrelloBackground.ts` - Board background management

## Next Steps

1. **Review and approve** this design plan
2. **Create Trello theme** in Tailwind config
3. **Build core components** (Board, List, Card)
4. **Implement drag-and-drop** with visual feedback
5. **Add card modal** with full functionality
6. **Test and refine** interactions
7. **Add keyboard shortcuts**
8. **Implement board customization**

## References
- Trello Design System: https://trello.com
- Atlassian Design System: https://atlassian.design
- Drag & Drop: @hello-pangea/dnd (already installed)
