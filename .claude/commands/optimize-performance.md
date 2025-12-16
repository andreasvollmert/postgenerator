---
description: Identify and implement performance optimizations
---

Optimize application performance:

1. Analyze the codebase for performance issues:
   - Unnecessary re-renders
   - Missing memoization (useMemo, useCallback, React.memo)
   - Large bundle sizes
   - Inefficient algorithms or data structures
   - Missing code splitting or lazy loading

2. Check for:
   - Images that could be optimized
   - Dependencies that could be lighter alternatives
   - Unused code that could be removed

3. Implement optimizations:
   - Add React.memo where appropriate
   - Use useMemo/useCallback for expensive computations
   - Implement code splitting with React.lazy
   - Optimize images and assets

4. Measure and report improvements
