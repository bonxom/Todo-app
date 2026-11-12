# Vision before storage implementation plan

Goal: remove the S3 dependency from image understanding.
Spec: ../specs/2026-11-12-vision-before-storage.md

1. Add regression tests in backend/services/test/attachmentService.test.ts using mocked external vision/storage/persistence boundaries and the real attachment context service. Assert vision input/order, cached context despite rejected/pending storage, and failed vision behavior. Run tests and confirm missing behavior failures.
2. Update backend/services/attachmentService.ts to analyze validated image buffers before persistence, store analysis in the record, mark ready, and start caught background storage. Preserve the existing non-image branch. Extend backend/repositories/attachmentRepository.ts create input with optional analysis; existing schema already supports this.
3. Run focused attachment tests, backend tests/lint/build, frontend lint/build, and Prettier for changed files. Report any skipped integration checks and existing warnings.
