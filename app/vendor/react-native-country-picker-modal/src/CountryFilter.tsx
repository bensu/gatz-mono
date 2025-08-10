import React from 'react'
import { TextInput, StyleSheet, TextInputProps, Platform } from 'react-native'
import { useTheme } from './CountryTheme'

const styles = StyleSheet.create({
  input: {
    height: 48,
    width: '70%',
    ...Platform.select({
      web: {
        outlineWidth: 0,
        outlineColor: 'transparent',
        outlineOffset: 0,
      },
    }),
  },
})

export type CountryFilterProps = TextInputProps

const defaultProps = {
  autoFocus: false,
  placeholder: 'Enter country name',
} as const;

export const CountryFilter = (props: CountryFilterProps) => {
  const {
    filterPlaceholderTextColor,
    fontFamily,
    fontSize,
    onBackgroundTextColor,
  } = useTheme()
  const mergedProps = { ...defaultProps, ...props };
  return (
    <TextInput
      testID='text-input-country-filter'
      autoCorrect={false}
      placeholderTextColor={filterPlaceholderTextColor}
      style={[
        styles.input,
        { fontFamily, fontSize, color: onBackgroundTextColor },
      ]}
      {...mergedProps}
    />
  )
}
