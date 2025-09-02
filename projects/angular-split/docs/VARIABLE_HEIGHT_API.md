# Variable Height API Documentation

## API Reference

### SplitComponent Input

#### `variableHeight`

Enables dynamic height adjustment for split containers.

```typescript
@Input() variableHeight: boolean = false
```

**Properties:**

- **Type**: `boolean`
- **Default**: `false`
- **Transform**: `booleanAttribute`
- **Applicable Direction**: `vertical` (optimized)

## Usage Examples

### Basic Variable Height

```html
<as-split direction="vertical" [variableHeight]="true">
  <as-split-area [size]="200">Content 1</as-split-area>
  <as-split-area [size]="300">Content 2</as-split-area>
</as-split>
```

### With Size Constraints

```html
<as-split direction="vertical" [variableHeight]="true" unit="pixel">
  <as-split-area [size]="200" [minSize]="100" [maxSize]="400"> Dynamic Content Area </as-split-area>

  <as-split-area [size]="150" [minSize]="100" [maxSize]="300"> Another Dynamic Area </as-split-area>
</as-split>
```

### Dashboard Layout Example

```html
<as-split direction="vertical" [variableHeight]="true" unit="pixel">
  <!-- Header -->
  <as-split-area [size]="80" [minSize]="60" [maxSize]="120">
    <app-header></app-header>
  </as-split-area>

  <!-- Main Content -->
  <as-split-area [size]="400" [minSize]="200" [maxSize]="800">
    <app-dashboard-content></app-dashboard-content>
  </as-split-area>

  <!-- Footer -->
  <as-split-area [size]="60" [minSize]="40" [maxSize]="100">
    <app-footer></app-footer>
  </as-split-area>
</as-split>
```

## Behavioral Changes

### Standard Mode vs Variable Height Mode

| Aspect                 | Standard Mode          | Variable Height Mode                |
| ---------------------- | ---------------------- | ----------------------------------- |
| **Container Height**   | Fixed (100% of parent) | Auto (based on content)             |
| **Drag Behavior**      | Bidirectional resizing | Asymmetric (only area above gutter) |
| **Areas Below Gutter** | Resize to compensate   | Maintain original size              |
| **CSS Grid Template**  | Fixed template         | Auto-sizing template                |
| **Use Case**           | Fixed layouts          | Content-driven layouts              |

### Drag Resize Logic

**Standard Mode:**

```
Before: [Area1: 200px] [Area2: 300px] [Area3: 200px]
Drag down 50px on gutter between Area1 and Area2:
After:  [Area1: 250px] [Area2: 250px] [Area3: 200px]
```

**Variable Height Mode:**

```
Before: [Area1: 200px] [Area2: 300px] [Area3: 200px]
Drag down 50px on gutter between Area1 and Area2:
After:  [Area1: 250px] [Area2: 300px] [Area3: 200px]
```

## CSS Integration

### Generated Grid Template

**Standard Mode:**

```css
grid-template: '200px 8px 300px 8px 200px / 1fr';
```

**Variable Height Mode:**

```css
grid-template: '200px 8px 300px 8px 200px / 1fr';
/* Container height: auto instead of fixed */
```

### Host Style Binding

The component automatically applies `height: auto` when variable height mode is enabled:

```typescript
@HostBinding('style.height') protected get hostHeightBinding() {
  if (this.variableHeight() && this.direction() === 'vertical') {
    return 'auto'
  }
  return null
}
```

## Performance Characteristics

### Optimizations

1. **Single Area Updates**: Only one area changes during drag operations
2. **Efficient Calculations**: Minimal mathematical operations
3. **Native CSS Grid**: Leverages browser optimizations
4. **Reduced DOM Updates**: Fewer style recalculations

### Memory Usage

- **Lower Memory**: Fewer size calculations stored
- **Reduced Complexity**: Simplified resize algorithms
- **Browser Native**: Relies on CSS Grid's built-in optimizations

## Compatibility Matrix

| Feature                  | Standard Mode       | Variable Height Mode |
| ------------------------ | ------------------- | -------------------- |
| **Direction**            | horizontal/vertical | vertical (optimized) |
| **Unit**                 | pixel/percent       | pixel/percent        |
| **Min/Max Size**         | ✅                  | ✅                   |
| **Gutter Customization** | ✅                  | ✅                   |
| **Transitions**          | ✅                  | ✅                   |
| **RTL Support**          | ✅                  | ✅                   |
| **Accessibility**        | ✅                  | ✅                   |
| **Touch Support**        | ✅                  | ✅                   |

## Migration Guide

### From Standard to Variable Height

1. **Add the property:**

   ```html
   <as-split [variableHeight]="true"></as-split>
   ```

2. **Adjust expectations:**
   - Only area above gutter resizes during drag
   - Container height becomes dynamic

3. **Consider constraints:**
   - Set appropriate `minSize`/`maxSize` values
   - Test with actual content

### Reverting Changes

Simply remove or set to `false`:

```html
<as-split [variableHeight]="false">
  <!-- or -->
  <as-split></as-split
></as-split>
```

## Troubleshooting

### Common Issues

**Issue**: Container doesn't expand
**Solution**: Ensure `direction="vertical"` and parent container allows height expansion

**Issue**: Unexpected resize behavior  
**Solution**: Remember only the area above the gutter resizes in variable height mode

**Issue**: Performance concerns
**Solution**: Variable height mode is actually more performant for vertical layouts

### Debug Tips

1. Use browser DevTools to inspect CSS Grid template
2. Check if parent containers have height constraints
3. Verify `direction` is set to `"vertical"`
4. Ensure content actually needs dynamic height

## Best Practices

1. **Use with vertical splits** for optimal results
2. **Set min/max constraints** to prevent unwanted sizing
3. **Test with real content** to validate behavior
4. **Consider parent containers** that might constrain height
5. **Use pixel units** for more predictable results
