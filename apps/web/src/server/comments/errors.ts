import { Data } from 'effect'

export class CommentNotFound extends Data.TaggedError('CommentNotFound')<{}> {}
export class CommentInvalid extends Data.TaggedError('CommentInvalid')<{ message: string }> {}
export class CommentForbidden extends Data.TaggedError('CommentForbidden')<{ message: string }> {}
