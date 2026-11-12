# Vision before object storage

The approved behavior is to analyze uploaded images directly before attempting S3 storage. S3 is optional for image understanding.

- Preserve conversation authorization and byte validation before external calls.
- Send validated image bytes to the existing vision client with its 20-second deadline.
- Persist successful or failed analysis on attachment creation; existing chat context consumes that cache without fetching S3 or repeating analysis.
- Mark images ready for binding before starting best-effort background storage. Storage failure or a pending write must not block the upload response or agent context.
- Vision failures remain explicit failed analysis, never invented image content. Still attempt storage.
- Keep document uploads and old attachment analysis behavior unchanged. No API shape or UI changes.
- MongoDB persistence remains required. Original-image download requires successful storage. Background storage is best effort and can be lost on process shutdown; durable retries and storage-status UI are out of scope.

Acceptance: tests cover direct bytes and call ordering, unavailable and pending storage with successful chat context, vision failure, authorization, invalid files, and persistence failure preventing storage.
