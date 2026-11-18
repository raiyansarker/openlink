import { Effect } from 'effect'

import { toFolderDto } from '#/server/api/serializers'
import { requireLinkWriterEffect, requireOrgMemberEffect } from '#/server/effect/access'
import { audit } from '#/server/activity/audit'
import { os } from '#/server/orpc/implement'
import type { ErrorFactories, MessageError } from '#/server/orpc/errors'

import type { FolderRuleViolation } from './errors'
import { createFolder, deleteFolder, listFolders, updateFolder } from './service'

const onFolderNotFound = (errors: ErrorFactories) => ({
  FolderNotFound: () => Effect.fail(errors.NOT_FOUND({ message: 'Folder not found' })),
})
const onFolderRule = (errors: { BAD_REQUEST: MessageError }) => ({
  FolderRuleViolation: (error: FolderRuleViolation) => Effect.fail(errors.BAD_REQUEST({ message: error.message })),
})
const onFolderNameTaken = (errors: { CONFLICT: MessageError }) => ({
  FolderNameTaken: () => Effect.fail(errors.CONFLICT({ message: 'A folder with this name already exists here' })),
})

export const foldersController = {
  listFolders: os.folders.listFolders.effect(function* ({ input }) {
    yield* requireOrgMemberEffect(input.params.organizationId)
    const rows = yield* listFolders(input.params.organizationId)
    return { items: rows.map(toFolderDto) }
  }),

  createFolder: os.folders.createFolder.effect(function* ({ input, errors }) {
    const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
    const row = yield* createFolder({ organizationId: input.params.organizationId, ...input.body }).pipe(
      Effect.catchTags({ ...onFolderNotFound(errors), ...onFolderRule(errors), ...onFolderNameTaken(errors) }),
    )
    yield* audit(session, {
      organizationId: input.params.organizationId,
      action: 'folder.created',
      target: { type: 'folder', id: row.id, label: row.name },
    })
    return toFolderDto(row)
  }),

  updateFolder: os.folders.updateFolder.effect(function* ({ input, errors }) {
    const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
    const row = yield* updateFolder({
      organizationId: input.params.organizationId,
      folderId: input.params.folderId,
      ...input.body,
    }).pipe(Effect.catchTags({ ...onFolderNotFound(errors), ...onFolderRule(errors), ...onFolderNameTaken(errors) }))
    yield* audit(session, {
      organizationId: input.params.organizationId,
      action: 'folder.updated',
      target: { type: 'folder', id: row.id, label: row.name },
    })
    return toFolderDto(row)
  }),

  deleteFolder: os.folders.deleteFolder.effect(function* ({ input, errors }) {
    const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
    const deleted = yield* deleteFolder({
      organizationId: input.params.organizationId,
      folderId: input.params.folderId,
      mode: input.query.mode,
    }).pipe(Effect.catchTags(onFolderNotFound(errors)))
    yield* audit(session, {
      organizationId: input.params.organizationId,
      action: 'folder.deleted',
      target: { type: 'folder', id: deleted.id, label: deleted.name },
      ...(input.query.mode === 'cascade' ? { changes: [{ label: 'Contents', from: 'kept', to: 'deleted' }] } : {}),
    })
    return {}
  }),
}
