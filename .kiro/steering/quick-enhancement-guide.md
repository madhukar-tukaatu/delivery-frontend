# Quick Page Enhancement Guide

## Use the CompactPageLayout Components

Instead of manually building 65/35 layouts, use the pre-built components:

```jsx
import { 
  CompactPageLayout, 
  CompactDataPanel, 
  CompactDetailPanel 
} from "@/components/CompactPageLayout";
import { COLORS, SPACING } from "@/lib/designTokens";
```

## Pattern

```jsx
export default function YourPage() {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 25, total: 0 });

  return (
    <CompactPageLayout
      title="Your Page Title"
      subtitle="Brief description"
      onRefresh={() => loadData()}
      onAdd={() => openCreateModal()}
    >
      {/* 65% LEFT + 35% RIGHT Layout */}
      <div style={{ display: "flex", gap: SPACING.md }}>
        
        {/* LEFT 65% - Table & Filters */}
        <CompactDataPanel
          filters={[
            {
              lg: 8,
              component: (
                <Input.Search
                  size="small"
                  placeholder="Search..."
                  onSearch={(v) => applyFilter({ search: v })}
                />
              ),
            },
          ]}
          stats={[
            { label: "Total", value: 25, icon: <BoxOutlined />, color: COLORS.primary },
            { label: "Active", value: 20, icon: <CheckCircleOutlined />, color: COLORS.success },
          ]}
          table={
            <Table
              rowKey="id"
              columns={columns}
              dataSource={rows}
              scroll={{ x: 1000, y: "calc(100vh - 320px)" }}
              pagination={false}
              size="small"
              onRow={(row) => ({
                onClick: () => setSelected(row),
                style: { cursor: "pointer" },
              })}
            />
          }
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
          }}
          onPaginationChange={(page, size) => loadData(page, size)}
          loading={loading}
        />

        {/* RIGHT 35% - Preview & Details */}
        <CompactDetailPanel
          title="🗺️ Preview"
          preview={selected ? <YourMapComponent /> : <Empty />}
          details={
            selected ? (
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Name">
                  {selected.name}
                </Descriptions.Item>
                {/* More fields */}
              </Descriptions>
            ) : (
              <Empty description="Select item" />
            )
          }
          actions={[
            <Button block onClick={() => editSelected()}>
              Edit
            </Button>,
            <Button block danger onClick={() => deleteSelected()}>
              Delete
            </Button>,
          ]}
          loading={loading}
        />
      </div>
    </CompactPageLayout>
  );
}
```

## Key Points

1. **Always use COLORS constants** - Don't hardcode colors
2. **Use SPACING for spacing** - Consistent gaps and padding
3. **Use BORDER_RADIUS for corners** - Consistent rounded corners
4. **Table scroll**: `x: 1000, y: "calc(100vh - 320px)"`
5. **Right panel**: `width: "35%", flexShrink: 0`
6. **Pagination**: Show both "X-Y of Z" and Pagination component
7. **Row click**: Selects item and shows details on right

## Component Props

### CompactPageLayout
- `title` - Page title
- `subtitle` - Optional subtitle
- `onRefresh` - Callback for refresh button
- `onAdd` - Callback for add button
- `showAddButton` - Show/hide add button (default: true)
- `showRefresh` - Show/hide refresh button (default: true)
- `children` - Page content

### CompactDataPanel
- `filters` - Array of filter components with `lg` property
- `onFilterChange` - Filter change callback
- `stats` - Array of stat objects with `label`, `value`, `icon`, `color`
- `table` - Table component
- `pagination` - Object with `current`, `pageSize`, `total`
- `onPaginationChange` - Pagination callback
- `loading` - Loading state

### CompactDetailPanel
- `title` - Panel title
- `preview` - Preview/map component
- `details` - Details component
- `actions` - Array of action buttons
- `loading` - Loading state

## Colors to Use

```javascript
COLORS.primary       // #0891B2 (teal)
COLORS.success       // #10B981 (green)
COLORS.warning       // #F59E0B (amber)
COLORS.danger        // #EF4444 (red)
COLORS.info          // #0891B2 (cyan)
COLORS.primaryText   // #0F172A (dark)
COLORS.secondaryText // #64748B (gray)
```

## Status Badge Quick Template

```jsx
import StatusBadge from "@/components/StatusBadge";

<StatusBadge status="delivered" icon={<CheckCircleOutlined />} />
```

## Example Pages Using This

- ✅ Transfer Lanes (complete)
- Transfer Routes (ready to enhance)
- Coverage Locations (ready to enhance)
- Deliveries (ready to enhance)

