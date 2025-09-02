# Variable Height Feature Documentation

## Overview

The Angular Split library has been enhanced with a new **Variable Height Mode** feature that allows split areas to dynamically adjust their height based on content, rather than being constrained to a fixed container height.

## Feature Details

### New Input Property: `variableHeight`

```typescript
readonly variableHeight = input(false, { transform: booleanAttribute })
```

- **Type**: `boolean`
- **Default**: `false`
- **Transform**: Uses `booleanAttribute` for proper boolean conversion

### Usage

```html
<as-split direction="vertical" [variableHeight]="true" unit="pixel">
  <as-split-area [size]="200">
    <!-- Content that can grow/shrink -->
  </as-split-area>

  <as-split-area [size]="300">
    <!-- Content that can grow/shrink -->
  </as-split-area>
</as-split>
```

## Implementation Changes

### 1. Host Binding for Dynamic Height

```typescript
@HostBinding('style.height') protected get hostHeightBinding() {
  // In variable height mode, let the content determine the height
  if (this.variableHeight() && this.direction() === 'vertical') {
    return 'auto'
  }
  return null
}
```

**Effect**: When `variableHeight` is enabled for vertical splits, the container height becomes `auto`, allowing content to determine the overall height.

### 2. Enhanced Drag Behavior

#### New Method: `dragMoveVariableHeight`

```typescript
private dragMoveVariableHeight(offset: number, dragStartContext: DragStartContext) {
  // In variable height mode, we only adjust the area above the gutter
  // and keep all areas below the gutter at their original sizes
  const steppedOffset = Math.round(offset / this.gutterStep()) * this.gutterStep()
  const tempAreasPixelSizes = [...dragStartContext.areasPixelSizes]
  const areaIndexAbove = dragStartContext.areaBeforeGutterIndex
  const areaAbove = this._areas()[areaIndexAbove]

  // Calculate new size for the area above the gutter
  const currentSize = tempAreasPixelSizes[areaIndexAbove]
  const minSize = dragStartContext.areaIndexToBoundaries[areaIndexAbove].min
  const maxSize = dragStartContext.areaIndexToBoundaries[areaIndexAbove].max

  // Apply the offset (positive when dragging down, negative when dragging up)
  let newSize = currentSize + steppedOffset

  // Clamp to min/max boundaries
  newSize = Math.max(minSize, Math.min(maxSize, newSize))

  // Update only the area above the gutter
  tempAreasPixelSizes[areaIndexAbove] = newSize

  // Update the internal size for the area above
  if (this.unit() === 'pixel') {
    areaAbove._internalSize.set(newSize)
  } else {
    // For percent mode in variable height, recalculate based on new total
    const totalPixelSize = tempAreasPixelSizes.reduce((sum, size) => sum + size, 0)
    const percentSize = (newSize / totalPixelSize) * 100
    areaAbove._internalSize.set(parseFloat(percentSize.toFixed(10)))
  }
}
```

**Key Behavior Changes**:

- **Asymmetric Resizing**: Only the area above the dragged gutter changes size
- **Areas below remain fixed**: This prevents cascading size changes
- **Respects min/max constraints**: Maintains area size boundaries
- **Supports both pixel and percent units**: Proper calculations for both modes

### 3. Modified Drag Logic

```typescript
private dragMoveToPoint(endPoint: ClientPoint, dragStartContext: DragStartContext) {
  const startPoint = getPointFromEvent(dragStartContext.startEvent)
  const preDirOffset = this.direction() === 'horizontal' ? endPoint.x - startPoint.x : endPoint.y - startPoint.y
  const offset = this.direction() === 'horizontal' && this.dir() === 'rtl' ? -preDirOffset : preDirOffset

  // Handle variable height mode for vertical splits
  if (this.variableHeight() && this.direction() === 'vertical') {
    this.dragMoveVariableHeight(offset, dragStartContext)
    return
  }

  // ... existing standard drag logic
}
```

**Flow**:

1. Calculate drag offset
2. Check if variable height mode is enabled for vertical splits
3. Use specialized `dragMoveVariableHeight` logic
4. Fall back to standard drag logic for other cases

### 4. CSS Grid Template Updates

```typescript
private createGridTemplateColumnsStyle(): string {
  const columns: string[] = []
  // ... existing column calculation logic

  // In variable height mode with vertical direction, use auto sizing for rows
  if (this.variableHeight() && this.direction() === 'vertical') {
    return `${columns.join(' ')} / 1fr`
  }

  return this.direction() === 'horizontal' ? `1fr / ${columns.join(' ')}` : `${columns.join(' ')} / 1fr`
}
```

**Effect**: Adjusts CSS Grid template to support auto-sizing in variable height mode.

## Use Cases

### 1. Dashboard Layouts

Perfect for dashboard components where rows can contain varying amounts of content:

```html
<as-split direction="vertical" [variableHeight]="true" unit="pixel">
  <as-split-area [size]="200" [minSize]="100">
    <!-- Header with dynamic content -->
  </as-split-area>
  <as-split-area [size]="400" [minSize]="200">
    <!-- Main content area that can expand -->
  </as-split-area>
  <as-split-area [size]="120" [minSize]="80">
    <!-- Footer area -->
  </as-split-area>
</as-split>
```

### 2. Content-Driven Layouts

For layouts where content determines the space needed:

```html
<as-split direction="vertical" [variableHeight]="true" unit="percent">
  <as-split-area size="auto">
    <!-- Content that determines its own height -->
  </as-split-area>
  <as-split-area [size]="30" [minSize]="20">
    <!-- Fixed proportion area -->
  </as-split-area>
</as-split>
```

## Compatibility

- **Angular Version**: Compatible with Angular 19+
- **Direction Support**: Currently optimized for `direction="vertical"`
- **Unit Support**: Works with both `pixel` and `percent` units
- **Backward Compatible**: Default `variableHeight="false"` maintains existing behavior

## Migration Guide

### Existing Projects

No changes required for existing implementations. The feature is opt-in via the `variableHeight` input.

### New Projects

To enable variable height mode:

1. Set `variableHeight="true"` on the split component
2. Use `direction="vertical"` for optimal results
3. Consider using `unit="pixel"` for more predictable behavior
4. Set appropriate `minSize` and `maxSize` on split areas

## Performance Considerations

- **Optimized Dragging**: Only one area resizes during drag operations
- **Efficient Calculations**: Minimal DOM updates during resize
- **CSS Grid Native**: Leverages browser-optimized CSS Grid layout

## Browser Support

Same as the core Angular Split library - supports all modern browsers with CSS Grid support.

## Breaking Changes

None. This is a backward-compatible addition to the existing API.
