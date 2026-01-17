# Changelog Rendering Specification

## ADDED Requirements

### Requirement: Annotation Property Display

The changelog annotation section SHALL display all pinned properties from each annotation's `properties` array with human-readable labels and formatted values.

#### Scenario: Single property displayed

- **WHEN** an annotation has one pinned property (e.g., `{type: 'fills'}`)
- **THEN** the property is displayed with label "Fills" and its value

#### Scenario: Multiple properties displayed

- **WHEN** an annotation has multiple pinned properties (e.g., width, height, fills)
- **THEN** each property is displayed on a separate line with label and value

#### Scenario: No properties

- **WHEN** an annotation has no pinned properties (empty or undefined `properties` array)
- **THEN** no property list is displayed, only the annotation label and node ID

### Requirement: Property Name Conversion

The system SHALL convert technical API property names to human-readable labels using a predefined mapping.

#### Scenario: Layout properties

- **WHEN** rendering layout properties (width, height, maxWidth, minWidth, maxHeight, minHeight)
- **THEN** display as "Width", "Height", "Max Width", "Min Width", "Max Height", "Min Height"

#### Scenario: Visual styling properties

- **WHEN** rendering visual properties (fills, strokes, effects, strokeWeight, cornerRadius, opacity)
- **THEN** display as "Fills", "Strokes", "Effects", "Stroke Weight", "Corner Radius", "Opacity"

#### Scenario: Typography properties

- **WHEN** rendering typography properties (textStyleId, fontFamily, fontStyle, fontSize, fontWeight, lineHeight, letterSpacing, textAlignHorizontal)
- **THEN** display as "Text Style", "Font Family", "Font Style", "Font Size", "Font Weight", "Line Height", "Letter Spacing", "Text Alignment"

#### Scenario: Spacing properties

- **WHEN** rendering spacing properties (itemSpacing, padding, layoutMode, alignItems)
- **THEN** display as "Item Spacing", "Padding", "Layout Mode", "Align Items"

#### Scenario: Grid properties

- **WHEN** rendering grid properties (gridRowGap, gridColumnGap, gridRowCount, gridColumnCount, gridRowAnchorIndex, gridColumnAnchorIndex, gridRowSpan, gridColumnSpan)
- **THEN** display as "Grid Row Gap", "Grid Column Gap", "Grid Row Count", "Grid Column Count", "Grid Row Anchor", "Grid Column Anchor", "Grid Row Span", "Grid Column Span"

#### Scenario: Component properties

- **WHEN** rendering component property (mainComponent)
- **THEN** display as "Main Component"

### Requirement: Property Value Formatting

The system SHALL format property values in a simple "Property: value" format appropriate for text display.

#### Scenario: Numeric values

- **WHEN** a property value is a number
- **THEN** display the number with appropriate units if applicable (e.g., "100px", "16", "0.5")

#### Scenario: Color values

- **WHEN** a property value represents a color (fills, strokes)
- **THEN** format as hex code or readable color format (e.g., "#FF0000", "RGB(255, 0, 0)")

#### Scenario: String values

- **WHEN** a property value is a string
- **THEN** display the string as-is

#### Scenario: Object values

- **WHEN** a property value is an object or complex type
- **THEN** display a simplified representation or type name

### Requirement: Vertical Property Layout

Annotation properties SHALL be displayed vertically within each annotation item, with each property on its own line.

#### Scenario: Property list layout

- **WHEN** an annotation has multiple properties
- **THEN** properties are stacked vertically with consistent spacing between items

#### Scenario: Property text styling

- **WHEN** displaying properties
- **THEN** use appropriate font size (10-12px) and secondary text color for visual hierarchy
