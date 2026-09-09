"use client"

import * as React from "react"

import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/components/ui/combobox"

export interface SearchableSelectOption {
  value: string
  label: string
}

export interface SearchableSelectGroup {
  label: string
  options: SearchableSelectOption[]
}

interface BaseProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  emptyMessage?: string
  footer?: React.ReactNode
  className?: string
}

const isEqual = (item: SearchableSelectOption, value: SearchableSelectOption) =>
  item.value === value.value
const toLabel = (item: SearchableSelectOption) => item.label

/**
 * A Select with a search box built in — the same input both shows the
 * current selection and filters the list while typing. `footer` renders a
 * persistent action row below the list (e.g. "+ Novo cliente") that stays
 * available regardless of the search query. Pass `groups` instead of
 * `options` to show section headings (e.g. category → its subcategories).
 */
export function SearchableSelect(
  props: BaseProps & ({ options: SearchableSelectOption[]; groups?: undefined } | { groups: SearchableSelectGroup[]; options?: undefined }),
) {
  const { value, onValueChange, placeholder, emptyMessage = "Nenhum resultado.", footer, className } = props

  if (props.groups) {
    const { groups } = props
    const allOptions = groups.flatMap((group) => group.options)
    const selected = allOptions.find((option) => option.value === value) ?? null

    return (
      <Combobox
        items={groups.map((group) => ({ label: group.label, items: group.options }))}
        value={selected}
        onValueChange={(item) => onValueChange(item?.value ?? "")}
        itemToStringLabel={toLabel}
        isItemEqualToValue={isEqual}
      >
        <ComboboxInput placeholder={placeholder} className={className} />
        <ComboboxContent>
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
          <ComboboxList>
            {(group: { label: string; items: SearchableSelectOption[] }) => (
              <ComboboxGroup key={group.label} items={group.items}>
                <ComboboxLabel>{group.label}</ComboboxLabel>
                <ComboboxCollection>
                  {(item: SearchableSelectOption) => (
                    <ComboboxItem key={item.value} value={item}>
                      {item.label}
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
          {footer && <div className="border-t p-1">{footer}</div>}
        </ComboboxContent>
      </Combobox>
    )
  }

  const options = props.options
  const selected = options.find((option) => option.value === value) ?? null

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(item) => onValueChange(item?.value ?? "")}
      itemToStringLabel={toLabel}
      // `options` (and the `selected` object found in it) are rebuilt on
      // every render, so identity-based matching would never find a
      // highlighted item — compare by id instead.
      isItemEqualToValue={isEqual}
    >
      <ComboboxInput placeholder={placeholder} className={className} />
      <ComboboxContent>
        <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        <ComboboxList>
          {(item: SearchableSelectOption) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
        {footer && <div className="border-t p-1">{footer}</div>}
      </ComboboxContent>
    </Combobox>
  )
}
