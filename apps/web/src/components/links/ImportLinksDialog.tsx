import { useEffect, useMemo, useState } from 'react'
import { Selector } from '@astryxdesign/core/Selector'
import { ShortUrl } from '#/lib/links/short-url'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { FileInput } from '@astryxdesign/core/FileInput'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Link } from '@astryxdesign/core/Link'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { FOLDER_DIALOG_PADDING } from '#/components/links/dialog-spacing'
import type { LinkFolder, ShortLink } from '#/data/demo/types'
import type { CreateLinkDraft } from '#/lib/links/create-link'
import { folderPathLabel } from '#/lib/links/folder-tree'
import {
  IMPORT_TEMPLATE,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS,
  previewImport,
  type ImportPreview,
  type ImportRow,
} from '#/lib/links/import-links'
import { downloadFile } from '#/lib/settings/export-links'

type ImportLinksDialogProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  links: ShortLink[]
  folders: LinkFolder[]
  /** Rows without a (matching) folder go here — the folder being viewed. */
  defaultFolderId: string | null
  /** Domains links can be imported onto (active ones); the app's own host is always offered. */
  domains: { id: string; hostname: string }[]
  /** Creates one link; throws with a user-facing message on failure. */
  onCreate: (draft: CreateLinkDraft) => void | Promise<void>
}

const APP_HOST = '__app__'

type Row = ImportRow & Record<string, unknown>

/** Upload a CSV, review every row, then create the valid ones. */
export default function ImportLinksDialog({
  isOpen,
  onOpenChange,
  links,
  folders,
  defaultFolderId,
  domains,
  onCreate,
}: ImportLinksDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState<string | null>(null)
  const [domainChoice, setDomainChoice] = useState(APP_HOST)
  const [tooLarge, setTooLarge] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setFile(null)
      setText(null)
      setTooLarge(false)
      setDomainChoice(APP_HOST)
      setResult(null)
    }
  }, [isOpen])

  const domainId = domainChoice === APP_HOST ? null : domainChoice
  // Re-checked whenever the file or the domain changes: back-halves must be free on that domain.
  const preview: ImportPreview | null = useMemo(() => {
    if (tooLarge) return { ok: false, error: 'CSV files must be 1 MB or smaller.' }
    return text == null ? null : previewImport(text, { links, folders, defaultFolderId, domainId })
  }, [tooLarge, text, links, folders, defaultFolderId, domainId])

  const choose = (next: File | null) => {
    setFile(next)
    setResult(null)
    setText(null)
    setTooLarge(false)
    if (!next) return
    if (next.size > MAX_IMPORT_BYTES) {
      setTooLarge(true)
      return
    }
    void next.text().then(setText)
  }

  const importValid = async () => {
    if (!preview?.ok) return
    let created = 0
    const failures: string[] = []
    for (const row of preview.rows) {
      if (row.error) continue
      try {
        await onCreate(row.draft)
        created++
      } catch (err) {
        failures.push(`Line ${row.line}: ${err instanceof Error ? err.message : 'failed'}`)
      }
    }
    setFile(null)
    setText(null)
    setResult(
      `Created ${created} ${created === 1 ? 'link' : 'links'}.` +
        (failures.length > 0 ? ` ${failures.length} couldn’t be created.` : ''),
    )
  }

  const validCount = preview?.ok ? preview.validCount : 0
  const problemCount = preview?.ok ? preview.rows.length - preview.validCount : 0

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      purpose="form"
      width={720}
      padding={FOLDER_DIALOG_PADDING}
    >
      <Layout
        header={
          <DialogHeader
            title="Import links"
            subtitle={`Up to ${MAX_IMPORT_ROWS} links from a CSV file`}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent padding={FOLDER_DIALOG_PADDING} isScrollable>
            <VStack gap={5} hAlign="stretch" width="100%">
              {result ? <Banner status="success" title={result} /> : null}
              <FileInput
                label="CSV file"
                mode="dropzone"
                accept=".csv,text/csv"
                maxSize={MAX_IMPORT_BYTES}
                placeholder="Drop a CSV here, or click to browse"
                description="Columns: destination (required), slug, title, tags (separated by |), folder (e.g. Docs / Guides), notes."
                value={file}
                onChange={(files) => choose(Array.isArray(files) ? (files[0] ?? null) : files)}
                width="100%"
              />
              <Selector
                label="Domain"
                description="Every imported link goes on this domain."
                options={[
                  { value: APP_HOST, label: `${ShortUrl.appHost() || 'App domain'} (default)` },
                  ...domains.map((d) => ({ value: d.id, label: d.hostname })),
                ]}
                value={domainChoice}
                onChange={setDomainChoice}
                width="100%"
              />
              <Text type="supporting" color="secondary">
                Not sure about the format?{' '}
                <Link
                  onClick={() =>
                    downloadFile('openlink-import-template.csv', IMPORT_TEMPLATE, 'text/csv;charset=utf-8')
                  }
                >
                  Download a template
                </Link>
                .
              </Text>

              {preview && !preview.ok ? (
                <Banner status="error" title={preview.error} />
              ) : null}

              {preview?.ok ? (
                <VStack gap={3} hAlign="stretch" width="100%">
                  <Text weight="semibold">
                    {validCount} ready
                    {problemCount > 0 ? ` · ${problemCount} with problems (skipped)` : ''}
                  </Text>
                  <Table<Row>
                    data={preview.rows as Row[]}
                    idKey="line"
                    density="compact"
                    dividers="rows"
                    columns={[
                      {
                        key: 'line',
                        header: 'Row',
                        width: pixel(64),
                        renderCell: (row) => (
                          <Text type="supporting" color="secondary">
                            {row.line}
                          </Text>
                        ),
                      },
                      {
                        key: 'destination',
                        header: 'Destination',
                        width: proportional(2, { minWidth: 180 }),
                        renderCell: (row) => (
                          <Text type="supporting" maxLines={1}>
                            {row.draft.destination || '—'}
                          </Text>
                        ),
                      },
                      {
                        key: 'slug',
                        header: 'Back-half',
                        width: proportional(1, { minWidth: 100 }),
                        renderCell: (row) => (
                          <Text type="supporting" color="secondary" maxLines={1}>
                            {row.draft.slug ? `/${row.draft.slug}` : 'Generated'}
                          </Text>
                        ),
                      },
                      {
                        key: 'folder',
                        header: 'Folder',
                        width: proportional(1, { minWidth: 110 }),
                        renderCell: (row) => (
                          <Text type="supporting" color="secondary" maxLines={1}>
                            {folderPathLabel(folders, row.draft.folderId)}
                          </Text>
                        ),
                      },
                      {
                        key: 'status',
                        header: 'Status',
                        width: proportional(2, { minWidth: 160 }),
                        renderCell: (row) => (
                          <Text type="supporting" maxLines={2}>
                            {row.error
                              ? row.error
                              : row.unknownFolder
                                ? `Ready — no folder “${row.unknownFolder}”`
                                : 'Ready'}
                          </Text>
                        ),
                      },
                    ]}
                  />
                </VStack>
              ) : null}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider padding={FOLDER_DIALOG_PADDING}>
            <HStack gap={2} hAlign="end" width="100%">
              <Button
                variant="ghost"
                label={result ? 'Done' : 'Cancel'}
                onClick={() => onOpenChange(false)}
              />
              <Button
                variant="primary"
                label={validCount > 0 ? `Import ${validCount} ${validCount === 1 ? 'link' : 'links'}` : 'Import'}
                isDisabled={validCount === 0}
                onClick={() => void importValid()}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}
