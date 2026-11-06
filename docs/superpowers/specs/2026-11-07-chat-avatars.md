# Chat avatars

Show circular 28px avatars beside chat messages in the shared ChatField (workspace and bubble): agent left, user right. User avatar comes from authenticated profile avatarUrl; agent has no configurable profile and uses the supplied default. Default URL: https://i.pinimg.com/236x/16/d0/98/16d098f6a7b93394765e45962c0fb2d0.jpg. Broken custom image falls back to that URL; if default fails, show a local role icon without retry loops. Include agent avatar during typing. Maintain mobile width and rich-message layout. No API/auth changes.

Acceptance: both sender avatars render; profile avatar takes precedence; missing/broken avatar uses default; failed default uses icon; mobile no overflow; account changes update avatar.
