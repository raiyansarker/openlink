import { Data } from 'effect'

export class ApiKeyNotFound extends Data.TaggedError('ApiKeyNotFound')<{}> {}
