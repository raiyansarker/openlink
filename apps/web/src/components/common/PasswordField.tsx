import { useState, type SVGProps } from 'react'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'
import { InputGroup } from '@astryxdesign/core/InputGroup'
import { TextInput } from '@astryxdesign/core/TextInput'

function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

type PasswordFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  description?: string
  placeholder?: string
  status?: { type: 'error' | 'warning' | 'success'; message?: string }
  autoComplete?: string
  htmlName?: string
  isRequired?: boolean
}

/**
 * A password input with a show/hide button attached to its end. The button is
 * part of the field's box, so it lines up with the text at any size.
 */
export default function PasswordField({
  label,
  value,
  onChange,
  description,
  placeholder,
  status,
  autoComplete,
  htmlName,
  isRequired,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false)
  const toggleLabel = isVisible ? 'Hide password' : 'Show password'

  return (
    <InputGroup label={label} description={description} status={status} isRequired={isRequired}>
      <TextInput
        label={label}
        isLabelHidden
        type={isVisible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        htmlName={htmlName}
        isRequired={isRequired}
        controlStyle={{ flex: 1, minWidth: 0 }}
      />
      <IconButton
        label={toggleLabel}
        tooltip={toggleLabel}
        variant="secondary"
        type="button"
        icon={<Icon icon={isVisible ? 'eyeSlash' : EyeIcon} size="sm" />}
        aria-pressed={isVisible}
        onClick={() => setIsVisible((visible) => !visible)}
      />
    </InputGroup>
  )
}
