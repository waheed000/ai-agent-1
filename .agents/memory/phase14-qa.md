---
name: Phase 14 QA Bug Findings
description: 8 bugs found and fixed during Phase 14 QA; patterns to watch in future phases.
---

## Critical pattern: Mongoose aggregation does NOT auto-cast strings to ObjectId
**Rule:** Any `Model.aggregate([{ $match: { user: userId } }])` where `userId` is a string will match zero records. Mongoose only casts in `.find()`/`.findOne()` etc., not in raw aggregation `$match`.
**Fix:** Always cast: `new Model.base.Types.ObjectId(String(userId))` before using in `$match`.
**How to apply:** Grep for `.aggregate(` any time you write a new repository method that takes a userId/workspaceId argument.

## Aggregate on AuditLog also needs this cast
AuditRepository.findByWorkspace uses `.find()` (safe), but any future aggregate on AuditLog needs explicit ObjectId cast.

## User model enforces 8-char password minimum
Direct `User.create({ password: 'hash' })` in tests fails with ValidationError. Use the register HTTP endpoint, or bcrypt-hash a real password. Tests that only need an ObjectId for invite/reference purposes should use `new mongoose.Types.ObjectId()` directly without creating a User.

## Pre-save bcrypt hook: never pass already-hashed password to User.create
If you pass a bcrypt hash as the `password` field to `User.create`, the pre-save hook may double-hash it. Then login with the original plaintext password fails. Always register via HTTP (`POST /api/v1/auth/register`) when you need a loginnable user in tests.

## MongoDB collection.indexes() vs collection.getIndexes()
`collection.getIndexes()` (Mongoose 8 / driver 6) may return an object with nested format. Use `collection.indexes()` which returns a plain array of index spec objects with a `key` property. Then `indexes.flatMap(i => Object.keys(i.key))` to get all indexed field names.

## keyHash must be excluded from API responses
`ApiKeyRepository.findAllByUser` must use `.select('-keyHash')` — the raw SHA-256 hash must never be sent to clients. Only the `prefix` (8-char display hint) is safe to expose.

## Role validation errors should be ValidationError (400), not ConflictError (409)
An invalid role string on invite/updateMember is a client input error (400), not a conflict. Throwing ConflictError here confuses HTTP semantics.

## Feature flag toggle route needs authorize('admin', 'superadmin')
Any platform-wide toggle must gate on platform role, not workspace role. Workspace RBAC (owner/admin/editor/viewer) is separate from platform RBAC (user/admin/superadmin).

## WorkspaceService.update — emit WORKSPACE_UPDATED, not SETTINGS_UPDATED
Confirmed copy-paste error in Phase 14. Future phases: double-check that update methods emit the correct event type for their own domain.
