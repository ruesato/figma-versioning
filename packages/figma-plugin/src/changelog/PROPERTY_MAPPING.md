# Annotation Property Mapping Documentation

This document describes how Figma annotation properties are mapped to human-readable labels and formatted for display in the changelog.

## Overview

When annotations are captured at commit time, they may include pinned properties that highlight specific design attributes (fills, dimensions, typography, etc.). These properties are displayed in the changelog with human-readable labels and appropriately formatted values.

## Property Label Mapping

Property names from the Figma API are converted to human-readable labels using a predefined mapping. If a property is not in the mapping, it falls back to a camelCase-to-Title-Case conversion.

### Layout Properties

| API Name | Display Label |
|----------|---------------|
| `width` | Width |
| `height` | Height |
| `maxWidth` | Max Width |
| `minWidth` | Min Width |
| `maxHeight` | Max Height |
| `minHeight` | Min Height |

### Visual Styling Properties

| API Name | Display Label |
|----------|---------------|
| `fills` | Fills |
| `strokes` | Strokes |
| `effects` | Effects |
| `strokeWeight` | Stroke Weight |
| `cornerRadius` | Corner Radius |
| `opacity` | Opacity |

### Typography Properties

| API Name | Display Label |
|----------|---------------|
| `textStyleId` | Text Style |
| `fontFamily` | Font Family |
| `fontStyle` | Font Style |
| `fontSize` | Font Size |
| `fontWeight` | Font Weight |
| `lineHeight` | Line Height |
| `letterSpacing` | Letter Spacing |
| `textAlignHorizontal` | Text Alignment |

### Spacing Properties

| API Name | Display Label |
|----------|---------------|
| `itemSpacing` | Item Spacing |
| `padding` | Padding |
| `layoutMode` | Layout Mode |
| `alignItems` | Align Items |

### Grid Properties

| API Name | Display Label |
|----------|---------------|
| `gridRowGap` | Grid Row Gap |
| `gridColumnGap` | Grid Column Gap |
| `gridRowCount` | Grid Row Count |
| `gridColumnCount` | Grid Column Count |
| `gridRowAnchorIndex` | Grid Row Anchor |
| `gridColumnAnchorIndex` | Grid Column Anchor |
| `gridRowSpan` | Grid Row Span |
| `gridColumnSpan` | Grid Column Span |

### Component Properties

| API Name | Display Label |
|----------|---------------|
| `mainComponent` | Main Component |

## Value Formatting

Property values are formatted based on their type and property name:

### Numeric Values

- **Pixel values**: Layout properties (width, height, fontSize, etc.) are formatted with `px` suffix
  - Example: `100` → `"100px"`
- **Percentages**: Opacity is formatted as percentage
  - Example: `0.5` → `"50%"`
- **Plain numbers**: Grid counts and indices display without units
  - Example: `3` → `"3"`

### Color Values

- **Solid colors**: Displayed as hex codes
  - Example: `{r: 1, g: 0, b: 0}` → `"#FF0000"`
- **Colors with opacity**: Hex code with percentage
  - Example: `{r: 1, g: 0, b: 0, opacity: 0.5}` → `"#FF0000 (50%)"`
- **Gradients**: Descriptive type labels
  - Example: `"Linear gradient"`, `"Radial gradient"`
- **Images**: `"Image fill"`

### Array Values

- **Fills/Strokes**: Formatted as color representations, comma-separated if multiple
  - Example: `[{type: 'SOLID', color: {...}}]` → `"#FF0000"`
  - Example: Multiple fills → `"#FF0000, #00FF00"`
- **Empty arrays**: `"None"`
- **Other arrays**: `"[N items]"` where N is the count

### String Values

Displayed as-is without modification.

### Object Values

- **Padding objects**: Formatted as comma-separated sides
  - Example: `{top: 8, right: 16, bottom: 8, left: 16}` → `"top: 8px, right: 16px, bottom: 8px, left: 16px"`
- **Objects with type**: Display the type property
  - Example: `{type: 'FRAME'}` → `"FRAME"`
- **Generic objects**: Display property count
  - Example: `{...}` → `"{3 properties}"`

### Null/Undefined Values

Displayed as `"None"` or skipped from rendering.

## Display Format

Properties are displayed in the annotation item frame with the following format:

```
Annotation Label
Node: node-id (Pinned)
Property Label: formatted value
Property Label: formatted value
...
```

### Styling

- **Label text**: 12px, Regular weight, primary text color
- **Node ID**: 10px, Regular weight, secondary text color
- **Properties**: 10px, Regular weight, secondary text color
- **Spacing**: 4px between elements, vertical layout

## Adding New Properties

To add support for a new property type:

1. **Add label mapping** in `property-labels.ts`:
   ```typescript
   const PROPERTY_LABEL_MAP: Record<string, string> = {
     // ...existing mappings
     newProperty: 'New Property',
   };
   ```

2. **Add formatting logic** in `property-formatter.ts` if needed:
   - Add to `PIXEL_PROPERTIES` set if it uses pixels
   - Add custom formatting logic in `formatPropertyValue()` if special handling is required

3. **No changes needed** in `frame-builder.ts` - it automatically renders all properties

## Testing

When testing property display:

1. Create an annotation with pinned properties in Figma
2. Create a commit to capture the annotation
3. Render the changelog
4. Verify:
   - Properties appear in the annotation item
   - Labels are human-readable
   - Values are formatted correctly with appropriate units
   - Multiple properties are displayed vertically
   - Edge cases (empty, null, complex objects) render appropriately

## Examples

### Layout Property
```
Width: 375px
```

### Color Property
```
Fills: #FF5733
```

### Typography Properties
```
Font Size: 16px
Text Alignment: CENTER
Line Height: 24px
```

### Multiple Properties
```
Product Card
Node: 123:456 (Pinned)
Width: 320px
Height: 240px
Corner Radius: 8px
Fills: #FFFFFF
```
