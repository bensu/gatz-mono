declare module 'react-native-phone-number-input' {
  import React from 'react';

  export interface PhoneInputProps {
    // Add minimal props needed for the example
    defaultValue?: string;
    defaultCode?: string;
    layout?: 'default' | 'first';
    onChangeText?: (text: string) => void;
    onChangeFormattedText?: (text: string) => void;
    withDarkTheme?: boolean;
    withShadow?: boolean;
    autoFocus?: boolean;
    countryPickerProps?: any;
    containerStyle?: any;
    textContainerStyle?: any;
    ref?: any;
    disabled?: boolean;
    // Allow any additional props
    [key: string]: any;
  }

  export class PhoneInput extends React.Component<PhoneInputProps> {
    // Add any methods that might be needed
    getNumberAfterPossiblyEliminatingDialCode(): string;
    getNumberAfterPossiblyEliminatingZero(): string;
    isValidNumber(number: string): boolean;
    getCountryCode(): string;
  }

  export default PhoneInput;
}