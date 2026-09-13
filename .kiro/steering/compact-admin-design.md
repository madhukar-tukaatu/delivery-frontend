# Compact Admin Panel Design System

## Overview
Tukaatu Express admin panel uses a compact, space-efficient layout optimized for data density and fast navigation.

## Layout Pattern

### Two-Panel Layout (35% / 65%)
```
┌─────────────────────────────────────────────────────┐
│ Header (Logo, Nav, User)                            │
├─────────────────┬─────────────────────────────────────┤
│   LEFT PANEL    │        RIGHT PANEL                  │
│   (35% width)   │      (65% width)                    │
│                 │                                     │
│ Preview/Map     │ Scrollable Table/List               │
│ Details Card    │ with Pagination                     │
│ Filters         │                                     │
│ Stats (compact) │                                     │
└─────────────────┴─────────────────────────────────────┘
```

## Component Sizing

### Cards & Sections
- **Compact Cards**: 60px height (icon + value + label)
- **Detail Cards**: flex: 1, min-height: 280px
- **Stat Cards**: 60-80px with icon badges
- **Filters**: size="small", padding: 6-8px

### Spacing
- **Padding**: 8-12px (cards), 16px (sections)
- **Gaps**: 8px between cards, 6px between form items
- **Margins**: 12px between major sections

### Typography
- **Labels**: 11-12px, semibold, #64748B
- **Values**: 16-28px, bold, #0F172A
- **Hints**: 11px, regular, #94A3B8

## Color Palette (Tukaatu Branding)
- **Primary**: #0891B2 (Teal)
- **Accent**: #FBBF24 (Yellow)
- **Success**: #10B981 (Green)
- **Warning**: #F59E0B (Amber)
- **Danger**: #EF4444 (Red)
- **Border**: #E2E8F0
- **Text Primary**: #0F172A
- **Text Secondary**: #64748B

## Status Badge Colors
- **Pending**: Yellow bg (#FEF3C7), icon: #FBBF24
- **Assigned**: Teal bg (#E0F2FE), icon: #0891B2
- **Active**: Green bg (#D1FAE5), icon: #10B981
- **In Transit**: Cyan bg (#E0F2FE), icon: #0891B2
- **Delivered**: Green bg (#D1FAE5), icon: #10B981
- **Failed**: Red bg (#FEE2E2), icon: #EF4444
- **Cancelled**: Gray bg (#F1F5F9), icon: #64748B

## Button Guidelines
- **Size**: small (24px height)
- **Icons**: 16px, compact
- **Text**: Show only for primary actions, use icons for secondary
- **Spacing**: 4px gap between buttons (wrap: true)

## Table Design
- **Size**: small
- **Row Height**: 40px (compact)
- **Columns**: Fixed width, hide non-essential columns on mobile
- **Scroll**: x: 1400px, y: calc(100vh - 320px)
- **Pagination**: Bottom bar with "X-Y of Z" format

## Form Design
- **Layout**: vertical (full width inputs)
- **Size**: small
- **Inputs**: 32px height
- **Modal**: width: 780px, max-height: 80vh

## Map/Preview Panel (35% width)
- **Height**: calc(100vh - 200px) - accounts for header
- **Fixed position**: yes, allows main content to scroll
- **Cards inside**: 280px height (map), flex: 1 (details)
- **Border**: left 1px solid #E2E8F0

## Implementation Example

```jsx
<div style={{ display: "flex", height: "100vh" }}>
  {/* Left Panel - 35% */}
  <div style={{ width: "35%", flexShrink: 0, overflow: "auto", borderRight: "1px solid #E2E8F0" }}>
    <Card style={{ borderRadius: 12, height: 280 }}>Map/Preview</Card>
    <Card style={{ borderRadius: 12, flex: 1, overflow: "auto" }}>Details</Card>
  </div>

  {/* Right Panel - 65% */}
  <div style={{ flex: 1, overflow: "auto" }}>
    <Table scroll={{ x: 1400, y: "calc(100vh - 320px)" }} />
    <Pagination style={{ borderTop: "1px solid #E2E8F0", padding: "8px" }} />
  </div>
</div>
```

## Pages to Apply This Layout
1. ✅ Branch Transfer Lanes (done)
2. Branch Transfer Routes (apply same layout)
3. Deliveries (apply to show details)
4. Shipments (apply to show preview)
5. Customers (apply to show customer card)
6. Pickups (apply to show pickup details)
7. Dispatches (apply to show dispatch map)

## Quick Checklist
- [ ] Header: 64px height, white background
- [ ] Sidebar: 240px (collapsed: 64px), dark navy #0F172A
- [ ] Main content: flex: 1, background: #F8FAFC
- [ ] Cards: border 1px solid #E2E8F0, border-radius: 12px
- [ ] Buttons: size="small", icons only where possible
- [ ] Table: scroll={{ x: 1400, y: "calc(100vh - 320px)" }}
- [ ] Pagination: bottom bar with page info
- [ ] Forms: size="small", inline labels
- [ ] Modals: width 780px, scrollable body
