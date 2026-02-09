# Testing Guide

This document provides guidelines for testing the Figma Versioning plugin across different scenarios.

## File Size Testing

### Overview
Test the plugin's performance and functionality with Figma files of varying complexity and size.

### Test File Categories

#### Small Files (< 50 nodes)
- **Purpose**: Validate basic functionality and quick response times
- **Test Scenario**: Simple design with a few frames and components
- **Expected Behavior**:
  - Plugin loads instantly
  - Version creation completes in < 1 second
  - Changelog renders immediately
  - Histogram displays correctly

**Test Checklist:**
- [ ] Create version with semantic versioning
- [ ] Create version with date-based versioning
- [ ] Add comments and verify they're captured
- [ ] Add annotations and verify they're captured
- [ ] Verify metrics are accurate
- [ ] Rebuild changelog
- [ ] Navigate through histogram

#### Medium Files (50-500 nodes)
- **Purpose**: Test typical real-world usage
- **Test Scenario**: Product design file with multiple screens, components, and variants
- **Expected Behavior**:
  - Plugin loads quickly (< 2 seconds)
  - Version creation completes in < 3 seconds
  - Changelog renders smoothly
  - Histogram is responsive

**Test Checklist:**
- [ ] Create multiple versions (5+)
- [ ] Test comment filtering across versions
- [ ] Test annotation filtering across versions
- [ ] Verify metrics scale appropriately
- [ ] Test histogram interactivity
- [ ] Rebuild changelog with multiple entries
- [ ] Verify storage chunk handling

#### Large Files (> 500 nodes)
- **Purpose**: Stress test and identify performance bottlenecks
- **Test Scenario**: Complex design system or large product file
- **Expected Behavior**:
  - Plugin loads acceptably (< 5 seconds)
  - Version creation completes (< 10 seconds)
  - Changelog may take time but doesn't hang
  - Histogram loads progressively

**Test Checklist:**
- [ ] Monitor plugin load time
- [ ] Monitor version creation time
- [ ] Check for memory issues
- [ ] Verify node counting accuracy
- [ ] Test with 20+ versions
- [ ] Verify chunk storage works correctly (> 10 commits)
- [ ] Test changelog rebuild performance
- [ ] Check histogram performance with many commits

### Performance Benchmarks

| File Size | Nodes | Expected Load Time | Expected Version Creation | Expected Changelog Render |
|-----------|-------|-------------------|--------------------------|--------------------------|
| Small     | < 50  | < 1s              | < 1s                     | < 1s                     |
| Medium    | 50-500| < 2s              | < 3s                     | < 5s                     |
| Large     | > 500 | < 5s              | < 10s                    | < 20s                    |

### Testing Procedure

1. **Prepare Test Files**
   - Create or obtain Figma files in each size category
   - Document the node count for each file
   - Add representative comments and annotations

2. **Install Plugin**
   ```bash
   pnpm build
   ```
   - Import the plugin into Figma Desktop
   - Verify plugin appears in plugins menu

3. **Run Test Scenarios**
   - For each file size category, run through the test checklist
   - Record actual performance metrics
   - Note any issues or unexpected behavior

4. **Document Results**
   - Create a test report with findings
   - Include screenshots of any issues
   - Document performance metrics vs. benchmarks

5. **Edge Cases**
   - Test with files that have:
     - No comments
     - No annotations
     - Empty pages
     - Very deep nesting (10+ levels)
     - Large text content in comments
     - Many component variants

### Known Limitations

- Very large files (> 2000 nodes) may experience slower performance
- Plugin requires `enablePrivatePluginApi` for file key access
- Storage is limited by Figma's clientStorage API (no specific limit documented)

### Troubleshooting

**Plugin loads slowly:**
- Check node count (large files will be slower)
- Verify no infinite loops in traversal logic
- Check console for errors

**Version creation fails:**
- Check console for error messages
- Verify PAT is valid (if fetching comments)
- Check storage quota

**Changelog doesn't render:**
- Verify commits are in storage
- Check for rendering errors in console
- Try rebuilding changelog

### Reporting Issues

When reporting performance issues, include:
- File size (node count)
- Number of existing versions
- Actual vs. expected performance
- Console logs and error messages
- Figma Desktop version
- Operating system

## Automated Testing

The project includes automated tests for core functionality:

### Unit Tests
```bash
# Run core package tests
pnpm --filter @figma-versioning/core test

# Run with UI
pnpm --filter @figma-versioning/core test:ui
```

### Integration Tests
```bash
# Run plugin integration tests
pnpm --filter @figma-versioning/figma-plugin test

# Run with UI
pnpm --filter @figma-versioning/figma-plugin test:ui
```

### Coverage
```bash
# Generate coverage report
pnpm test -- --coverage
```

## Continuous Testing

For ongoing development:

```bash
# Watch mode for core tests
pnpm --filter @figma-versioning/core test

# Watch mode for plugin tests
pnpm --filter @figma-versioning/figma-plugin test
```
