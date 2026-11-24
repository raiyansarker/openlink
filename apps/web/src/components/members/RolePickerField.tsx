import { RadioList, RadioListItem } from '@astryxdesign/core/RadioList'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import type { AssignableRole } from '#/lib/perms/permissions'
import { WORKSPACE_ROLE_DETAILS } from '#/lib/members/role-help'
import { workspaceMemberRoleLabel } from '#/lib/members/role-label'

type RolePickerFieldProps = {
  value: AssignableRole
  onChange: (role: AssignableRole) => void
  /** Roles the picker may offer (already capped by the actor's rank). */
  options: AssignableRole[]
}

/**
 * Single-select role picker for member and invite flows. Each role spells out
 * what it can do — the capability overview from docs/roles.md — so whoever
 * picks a role chooses it informed instead of by name alone.
 */
export default function RolePickerField({ value, onChange, options }: RolePickerFieldProps) {
  return (
    <RadioList label="Workspace role" value={value} onChange={(v) => onChange(v as AssignableRole)}>
      {options.map((role) => {
        const { summary, details } = WORKSPACE_ROLE_DETAILS[role]
        return (
          <RadioListItem
            key={role}
            value={role}
            label={workspaceMemberRoleLabel(role)}
            description={
              <VStack gap={0.5} hAlign="start" style={{ maxWidth: '46ch' }}>
                <Text weight="medium">{summary}</Text>
                <Text type="supporting" color="secondary">
                  {details}
                </Text>
              </VStack>
            }
          />
        )
      })}
    </RadioList>
  )
}
