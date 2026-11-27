import { Data } from 'effect'

export class InvalidInvite extends Data.TaggedError('InvalidInvite')<{}> {}
export class InviteEmailMismatch extends Data.TaggedError(
  'InviteEmailMismatch',
)<{}> {}
export class OrganizationConflict extends Data.TaggedError(
  'OrganizationConflict',
)<{}> {}

export class MemberNotFound extends Data.TaggedError('MemberNotFound')<{}> {}
export class InviteNotFound extends Data.TaggedError('InviteNotFound')<{}> {}
export class MemberPermissionDenied extends Data.TaggedError('MemberPermissionDenied')<{
  reason: string
}> {}
