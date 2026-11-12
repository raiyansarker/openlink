import { type } from 'arktype'

/** HTTP(S) URL — ArkType `string.url` cannot be exported to OpenAPI JSON Schema. */
export const HttpUrl = type(/^https?:\/\/\S+$/)

export const Email = type('string.email')

export const EmptyResponse = type({})
