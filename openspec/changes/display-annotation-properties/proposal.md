# Change: Display Annotation Properties in Changelog

## Why

Currently, the changelog only displays annotation labels and node IDs, but not the pinned properties (fills, width, fontSize, etc.) that designers attach to annotations. This makes annotations less useful in the changelog because users cannot see what specific design properties were highlighted at commit time.

Users need to see the complete annotation context in the changelog to understand what aspects of the design were being called out or measured.

## What Changes

- Display pinned annotation properties in the changelog's Annotations section
- Show each property with a human-readable label and its value
- Format properties vertically (one property per line) for clarity
- Convert technical API names (e.g., `textAlignHorizontal`) to readable labels (e.g., "Text Alignment")

## Impact

- Affected specs: `changelog-rendering`
- Affected code:
  - `packages/figma-plugin/src/changelog/frame-builder.ts` (annotation rendering)
  - May require new utility for property formatting and label conversion
