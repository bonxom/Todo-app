# Cached vision descriptions

User-approved architecture: image -> dedicated vision invocation -> durable text description -> existing chatbot. Never put image bytes/base64 into chatbot messages, checkpoints or history.

The missing link is confirmed: attachment storage exists, but no vision invocation/description cache exists and runConversationTurn passes only userInput.

## Behavior and acceptance

- On a turn with raster images, authorize each attachment by user/conversation and attached state, atomically claim analysis, fetch private bytes, call vision once, persist a bounded description on Attachment.
- Separate vision model/client settings: VISION_MODEL_NAME, VISION_BASE_URL, VISION_API_KEY; default to current AI configuration (current deepseek-flash supports vision). No real env modification.
- Cache status processing/succeeded/failed. Atomic claim prevents duplicate calls across processes. No automatic retry after a claimed attempt: uncertain crashes or failed persistence must not resend base64. A failed/unfinished analysis is reported explicitly; user may upload again for a new attempt.
- Concurrent images (maximum four) share a 20-second ceiling per image, preserving existing turn budget for chat. Bounded storage stream and output; no public storage URL.
- Successful text descriptions, filename and IDs are labeled untrusted attachment data in current user message. Main chatbot uses description, never claims it directly saw the image, does not obey instructions in image text. Non-image files clearly marked not analyzed.
- Description is checkpointed as text for subsequent chat/history. Existing pre-feature turns remain unchanged; no retrospective background analysis.
- Image failures produce explicit text status to the chatbot; no raw provider errors, credentials or image data exposed.
- No UI/API shape change, no dependency changes. Existing attachment ownership and metadata view preserved.

## Tests

Fresh analysis + repeat -> one vision call; concurrent calls -> one winner; wrong owner/missing -> no storage/provider call; failed vision -> cached failure and no retry; non-image -> no vision; main chat receives only description, checkpoint/history contains no data URL; provider payload only vision includes image; bounded stream/output.
