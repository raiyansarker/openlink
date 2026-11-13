import { Button } from '@astryxdesign/core/Button'
import { InputGroup } from '@astryxdesign/core/InputGroup'
import { TextInput } from '@astryxdesign/core/TextInput'
import { useClipboard } from '@astryxdesign/core/hooks'

type ApiKeySecretFieldProps = {
  label?: string
  value: string
  description?: string
}

export default function ApiKeySecretField({
  label = 'API key',
  value,
  description,
}: ApiKeySecretFieldProps) {
  const { copy, isCopied } = useClipboard()

  return (
    <InputGroup label={label} description={description} size="sm">
      <TextInput
        label={label}
        isLabelHidden
        size="sm"
        value={value}
        isReadOnly
        width="100%"
        onChange={() => {}}
        controlStyle={{ flex: '1 1 0', minWidth: 0 }}
      />
      <Button
        variant="secondary"
        size="sm"
        label={isCopied ? 'Copied' : 'Copy'}
        onClick={() => void copy(value)}
      />
    </InputGroup>
  )
}
