import { Data } from 'effect'

export class FolderNotFound extends Data.TaggedError('FolderNotFound')<{}> {}
/** A structural rule was broken: bad name, depth cap, or a cycle. */
export class FolderRuleViolation extends Data.TaggedError('FolderRuleViolation')<{
  message: string
}> {}
export class FolderNameTaken extends Data.TaggedError('FolderNameTaken')<{}> {}
