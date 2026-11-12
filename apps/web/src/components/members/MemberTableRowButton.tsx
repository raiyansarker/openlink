import type { ReactNode } from 'react'
import type { WorkspaceMember } from '#/data/demo/types'

type MemberTableRowButtonProps = {
  member: WorkspaceMember
  onOpen: (member: WorkspaceMember) => void
  children: ReactNode
}

/** Opens the member drawer; styled to read as part of the table row. */
export default function MemberTableRowButton({
  member,
  onOpen,
  children,
}: MemberTableRowButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(member)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        margin: 0,
        border: 'none',
        padding: 0,
        font: 'inherit',
        textAlign: 'inherit',
        cursor: 'pointer',
        color: 'inherit',
        background: 'transparent',
      }}
    >
      {children}
    </button>
  )
}
