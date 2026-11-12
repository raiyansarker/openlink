-- Bootstrap token for creating the first organization locally.
-- Token (plaintext): local-bootstrap-invite-token
-- SHA-256 hash below matches apps/web/src/server/org/invites.ts (createBootstrapInviteHash).

INSERT OR REPLACE INTO organization_invite (
  id,
  organization_id,
  email,
  role,
  token_hash,
  kind,
  expires_at,
  accepted_at,
  created_by_user_id,
  created_at
) VALUES (
  'bootstrap-invite-1',
  NULL,
  '*',
  'admin',
  '39dc42c71247e7fe701ae9da9fbde0820485a1e73bcc00ddccb898b07a7b2e02',
  'bootstrap',
  4102444800000,
  NULL,
  NULL,
  0
);
