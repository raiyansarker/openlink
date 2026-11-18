import { memo, useCallback, type ComponentProps } from 'react'
import {
  DateTimeInput,
  type ISODateTimeString,
} from '@astryxdesign/core/DateTimeInput'
import { TextArea } from '@astryxdesign/core/TextArea'
import { TextInput } from '@astryxdesign/core/TextInput'
import Favicon from '#/components/create-link/Favicon'
import {
  useDraftValue,
  useFieldStatus,
  useLinkForm,
} from '#/components/create-link/form/LinkFormContext'
import { toLocalInputValue, validDestination } from '#/components/create-link/form/derive'

export type TextField =
  | 'destination'
  | 'title'
  | 'description'
  | 'slug'
  | 'expiredDestination'
  | 'fallbackDestination'
  | 'previewTitle'
  | 'previewDescription'
  | 'iosUrl'
  | 'androidUrl'

type ControlledProps = 'value' | 'onChange' | 'status'

/** A TextInput bound to one draft field; only it re-renders while you type in it. */
export const DraftTextInput = memo(function DraftTextInput({
  field,
  showFavicon,
  ...props
}: {
  field: TextField
  /** Shows the site icon for the typed address at the start of the input. */
  showFavicon?: boolean
} & Omit<ComponentProps<typeof TextInput>, ControlledProps>) {
  const { set } = useLinkForm()
  const value = useDraftValue(field)
  const status = useFieldStatus(field)
  const onChange = useCallback((next: string) => set(field, next), [set, field])
  return (
    <TextInput
      {...props}
      startIcon={
        showFavicon ? <Favicon url={validDestination({ destination: value })} /> : props.startIcon
      }
      value={value}
      onChange={onChange}
      status={status}
    />
  )
})

/** A TextArea bound to one draft field. */
export const DraftTextArea = memo(function DraftTextArea({
  field,
  ...props
}: {
  field: TextField
} & Omit<ComponentProps<typeof TextArea>, ControlledProps>) {
  const { set } = useLinkForm()
  const value = useDraftValue(field)
  const status = useFieldStatus(field)
  const onChange = useCallback((next: string) => set(field, next), [set, field])
  return <TextArea {...props} value={value} onChange={onChange} status={status} />
})

export type DateField = 'activateAt' | 'expiresAt' | 'holdReleaseAt'

/** A DateTimeInput bound to one draft field. */
export const DraftDateTimeInput = memo(function DraftDateTimeInput({
  field,
  min,
  ...props
}: {
  field: DateField
  /** Earliest pickable time; defaults to now. */
  min?: ISODateTimeString
} & Omit<ComponentProps<typeof DateTimeInput>, ControlledProps | 'min'>) {
  const { set } = useLinkForm()
  const value = useDraftValue(field)
  const status = useFieldStatus(field)
  const onChange = useCallback(
    (next: ISODateTimeString | undefined) => set(field, next),
    [set, field],
  )
  return (
    <DateTimeInput
      {...props}
      value={value as ISODateTimeString | undefined}
      onChange={onChange}
      min={min ?? toLocalInputValue(new Date())}
      status={status}
    />
  )
})
