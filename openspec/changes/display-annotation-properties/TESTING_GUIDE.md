# Task 4: Testing and Validation - Manual Testing Guide

## Testing Setup

Before you start, ensure you have:
1. Figma open (web or desktop)
2. The figma-versioning plugin running (`pnpm dev` in the project)
3. A Figma file with design changes/annotations ready

---

## **4.1: Test Annotations with Various Property Types**

Create or find annotations with these property types and verify they display correctly:

### Layout Properties
- [ ] **Width** - Verify displays as "Width: XXXpx"
- [ ] **Height** - Verify displays as "Height: XXXpx"
- [ ] **Min Width / Max Width** - Check min/max constraints display
- [ ] **Min Height / Max Height** - Check min/max constraints display

### Visual Properties
- [ ] **Fills/Colors** - Verify color displays as hex (e.g., "#FF0000")
- [ ] **Strokes** - Check stroke color and width both display
- [ ] **Stroke Weight** - Verify displays as "Stroke Weight: XXpx"
- [ ] **Corner Radius** - Verify displays as "Corner Radius: XXpx"
- [ ] **Opacity** - Check displays as percentage (e.g., "Opacity: 50%")
- [ ] **Effects** - If present, verify display format

### Typography Properties
- [ ] **Font Size** - Verify displays as "Font Size: XXpx"
- [ ] **Font Family** - Check font name displays correctly
- [ ] **Font Weight** - Verify weight displays (e.g., "Bold", "Regular")
- [ ] **Font Style** - Check italics/normal display
- [ ] **Line Height** - Verify displays with units
- [ ] **Letter Spacing** - Check spacing displays correctly
- [ ] **Text Alignment** - Verify displays correctly

### Spacing Properties
- [ ] **Item Spacing** - Verify layout spacing displays
- [ ] **Padding** - Check all padding sides display
- [ ] **Layout Mode** - Verify displays as "VERTICAL" or "HORIZONTAL"

### Grid Properties
- [ ] **Grid Row/Column Gap** - Verify grid spacing displays
- [ ] **Grid Row/Column Count** - Check grid dimensions display
- [ ] **Grid Anchors** - Verify grid anchor position displays
- [ ] **Grid Span** - Check span values display

### Edge Cases
- [ ] **Null/Missing Values** - Verify properties with no value don't crash
- [ ] **Empty Arrays** - Check arrays with no items display as "None"
- [ ] **Multiple Values** - Verify annotations with 5+ properties display all

---

## **4.2: Verify Rendering in Light, Dark, and FigJam Themes**

### Light Theme
1. Open a Figma file in Light Mode
2. Run the plugin and generate changelog
3. Check annotation properties display:
   - [ ] Text is readable (not too dark)
   - [ ] Secondary text color is clearly different from primary labels
   - [ ] Properties are visually distinct from the node ID
   - [ ] No color contrast issues
   - [ ] Properties render vertically below node ID

### Dark Theme
1. Switch Figma to Dark Mode (Settings → Appearance → Dark)
2. Run the plugin again
3. Check annotation properties display:
   - [ ] Text is readable (not too light)
   - [ ] Secondary text color is visible but distinct
   - [ ] Properties maintain good contrast
   - [ ] Layout and spacing remain consistent
   - [ ] No color bleeding or background issues

### FigJam Theme
1. Open a FigJam file (or Figma file set to FigJam appearance)
2. Run the plugin
3. Check annotation properties display:
   - [ ] Theme detection recognizes FigJam mode
   - [ ] Colors match FigJam design system
   - [ ] Properties are clearly visible
   - [ ] Layout remains intact
   - [ ] No visual glitches

---

## **4.3: Check Layout in Horizontal Changelog Container**

1. Generate a changelog with multiple entries
2. Check the container properties:
   - [ ] Container uses HORIZONTAL layout mode
   - [ ] Container width is fixed (600px per code)
   - [ ] Container has appropriate padding
   - [ ] Entries are spaced evenly (32px spacing per code)

### Annotation Properties Within Horizontal Container
3. For each entry, verify:
   - [ ] Annotation properties render vertically within entry
   - [ ] Properties don't overflow container width
   - [ ] Properties align properly with node ID
   - [ ] Multi-line properties wrap correctly
   - [ ] Vertical spacing (4px) between properties is consistent

### Stress Test
4. Create entries with many annotations:
   - [ ] 5+ annotations per entry render without overlapping
   - [ ] Properties remain aligned and readable
   - [ ] No horizontal scrolling issues
   - [ ] Vertical scrolling works smoothly with many entries

---

## **4.4: Validate Memory Usage Doesn't Increase Significantly**

### Before Testing
1. Open Figma DevTools (Right-click → Inspect in browser, or use Figma's built-in plugin console)
2. Note the current memory usage

### Run the Plugin
3. Generate changelog with:
   - [ ] Small file (1-2 changes) - note memory
   - [ ] Medium file (5-10 changes) - note memory
   - [ ] Large file (20+ changes with annotations) - note memory

### Check Results
4. Memory growth validation:
   - [ ] Each additional entry adds ~reasonable amount (< 1MB per entry ideally)
   - [ ] Memory doesn't spike unexpectedly
   - [ ] No obvious memory leaks (memory doesn't keep growing on re-runs)
   - [ ] Plugin remains responsive with large changelogs

### Optional: Profiling
5. If available, take heap snapshots:
   - [ ] Take snapshot before generating changelog
   - [ ] Generate changelog with 50+ entries
   - [ ] Take another snapshot
   - [ ] Compare - look for unexpected retained objects

---

## Testing Checklist Summary

| Sub-Task | Completed | Notes |
|----------|-----------|-------|
| 4.1.1 Layout properties | ☐ | Width, height, min/max |
| 4.1.2 Visual properties | ☐ | Fills, strokes, opacity, effects |
| 4.1.3 Typography properties | ☐ | Font size, family, weight, etc. |
| 4.1.4 Spacing/Grid properties | ☐ | Padding, item spacing, grid |
| 4.1.5 Edge cases | ☐ | Null values, empty arrays |
| 4.2.1 Light theme | ☐ | Readable, good contrast |
| 4.2.2 Dark theme | ☐ | Visible, good contrast |
| 4.2.3 FigJam theme | ☐ | Design system colors |
| 4.3.1 Horizontal container | ☐ | Layout, spacing, width |
| 4.3.2 Annotations in container | ☐ | Vertical alignment, wrapping |
| 4.3.3 Stress test | ☐ | Multiple annotations |
| 4.4.1 Memory - small file | ☐ | < expected baseline |
| 4.4.2 Memory - medium file | ☐ | Linear growth |
| 4.4.3 Memory - large file | ☐ | No unexpected spikes |
| 4.4.4 No memory leaks | ☐ | Stable on re-runs |

---

## How to Execute

1. **Start here**: Test 4.1 first (property types) - this validates the core feature
2. **Then**: Test 4.2 (themes) to ensure visual consistency across modes
3. **Then**: Test 4.3 (layout) to verify integration with changelog
4. **Finally**: Test 4.4 (memory) to ensure no performance issues
