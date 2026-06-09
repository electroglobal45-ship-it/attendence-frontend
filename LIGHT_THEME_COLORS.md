# Light Theme Color Reference

## Color Palette

### Backgrounds
- `#F8F9FA` - Main page background (light grey)
- `#FFFFFF` - Cards, header, panels (white)
- `#F3F4F6` - Subtle background (lighter grey)

### Text
- `#111827` - Primary text (dark)
- `#374151` - Secondary text (medium dark)
- `#6B7280` - Muted text (grey)
- `#9CA3AF` - Disabled/placeholder text (light grey)

### Borders
- `#E5E7EB` - Primary borders
- `#D1D5DB` - Darker borders (hover states)

### Primary Blue (Interactive)
- `#3B82F6` - Primary blue
- `#2563EB` - Darker blue (hover)
- `#EFF6FF` - Light blue background
- `#DBEAFE` - Lighter blue background

### Status Colors (Keep vibrant for visibility)
- Success/Done: `#10B981` (green)
- Warning/Medium: `#F59E0B` (amber)
- Error/Urgent: `#EF4444` (red)
- Info/Todo: `#3B82F6` (blue)

### Shadows
- Card: `0 1px 3px rgba(0,0,0,0.1)`
- Card Hover: `0 4px 12px rgba(0,0,0,0.08)`
- Dropdown: `0 10px 25px rgba(0,0,0,0.1)`
- Header: `0 1px 3px rgba(0,0,0,0.04)`

## Components to Update

### Admin Tasks Page (`src/app/(admin)/tasks/page.tsx`)
- [x] Main background: `#F8F9FA`
- [x] Header: `#FFFFFF` with shadow
- [x] Cards: `#FFFFFF` with `#E5E7EB` border
- [x] Filter button: `#FFFFFF` background, `#E5E7EB` border
- [x] Filter dropdown: `#FFFFFF` background
- [ ] Open Board button: Blue gradient → `#3B82F6` solid
- [ ] Status tabs: Update colors
- [ ] TaskCard component: Update all inline styles
- [ ] Loading spinner: Update colors
- [ ] Empty state: Update colors

### Employee Tasks Page (`src/app/(employee)/my-tasks/page.tsx`)
- [ ] Apply same changes as admin page

### BoardView Component (`src/components/board/BoardView.tsx`)
- [ ] Update background colors
- [ ] Update card colors
- [ ] Update list colors
- [ ] Update header
- [ ] Update dropdowns/modals

### TaskDetailModal Component
- [ ] Modal background overlay
- [ ] Modal content background
- [ ] Text colors
- [ ] Button colors
- [ ] Input fields

### Card Component (`src/components/board/Card.tsx`)
- [ ] Card background
- [ ] Text colors
- [ ] Border colors
- [ ] Hover states

## Migration Strategy

1. ✅ Start with admin tasks page (in progress)
2. Apply to employee tasks page
3. Update BoardView component
4. Update shared components (Card, TaskDetailModal)
5. Test all pages
6. Fine-tune colors for readability

## Notes
- Keep label colors vibrant (they're user-defined)
- Keep priority badges visible
- Ensure sufficient contrast for accessibility
- Shadows should be subtle
- Borders should be light but visible
