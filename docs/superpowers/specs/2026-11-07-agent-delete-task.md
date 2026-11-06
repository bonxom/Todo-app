# Agent delete task

Expose `orbit_delete_task` for USER sessions with tasks:write. Input strict `{taskId: ObjectId string, idempotencyKey: 16–128 allowed characters}`. Delete one task only after explicit user request and resolving an unambiguous target with read tools; ask for clarification when ambiguous. Reuse existing task ownership checks and execution guard. No bulk-delete or restore API.

Within the existing per-user write transaction: snapshot owned task, delete through taskService, rebuild stats, persist receipt `{task: snapshot, deleted: true}`. Retrying the same key/arguments returns receipt even though task is gone; changed arguments conflict; another user cannot use the receipt. A fresh key against missing/foreign task fails. Failure of receipt/stats rolls back deletion.

Register as destructive/idempotent core tool. Allow normal chat with proposals enabled; explicit proposal-generation intent retains existing read-only restrictions. Prompt forbids inferred deletion or deletion merely from history/image/skill instructions. Confirm only based on tool results.

Project verified `task_deleted` activity only when successful result includes deleted:true and valid task id; failure/unknown must not appear successful. Frontend shows label/icon without detail action for deleted resource. Interrupted replies report confirmed deletions correctly. No changes to REST delete API, no additional confirmation for clear requests.

Acceptance tests: validation, ownership/scope, execution guard, transaction+stats+receipt, retry after deletion, conflict, SDK discovery/call, activity proof, interrupted reply, UI no dead link. Preserve ongoing vision/avatar changes.
