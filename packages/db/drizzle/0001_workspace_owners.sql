-- Existing workspaces did not record a distinct owner. Promote the earliest
-- administrator deterministically, without changing workspaces that have one.
UPDATE organization_member
SET role = 'owner'
WHERE role = 'admin'
  AND NOT EXISTS (
    SELECT 1
    FROM organization_member AS owner
    WHERE owner.organization_id = organization_member.organization_id
      AND owner.role = 'owner'
  )
  AND id = (
    SELECT candidate.id
    FROM organization_member AS candidate
    WHERE candidate.organization_id = organization_member.organization_id
      AND candidate.role = 'admin'
    ORDER BY candidate.joined_at, candidate.id
    LIMIT 1
  );
