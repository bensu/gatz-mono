import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Platform, Text } from 'react-native';
import { HoverReactionButton } from './HoverReactionButton';
import { useThemeColors } from '../gifted/hooks/useThemeColors';

jest.mock('../gifted/hooks/useThemeColors');

const mockUseThemeColors = useThemeColors as jest.MockedFunction<typeof useThemeColors>;

describe('HoverReactionButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'web'; // Reset to web for each test
    mockUseThemeColors.mockReturnValue({
      strongGrey: '#666',
      appBackground: '#fff',
      rowBackground: '#f0f0f0',
      reactionsBg: '#e0e0e0',
      primaryText: '#000',
      midGrey: '#999',
    });
  });

  it('should render when visible is true and platform is web', () => {
    Platform.OS = 'web';
    const { getByTestId } = render(
      <HoverReactionButton onPress={mockOnPress} visible={true} />
    );
    
    // Check for the MaterialIcons component
    expect(getByTestId('add-reaction-icon')).toBeTruthy();
  });

  it('should render with opacity 0 when visible is false', () => {
    Platform.OS = 'web';
    const { getByTestId } = render(
      <HoverReactionButton onPress={mockOnPress} visible={false} />
    );
    
    const container = getByTestId('hover-reaction-container');
    const styles = container.props.style;
    
    // The style should be an array [baseStyles, {opacity: 0}]
    expect(Array.isArray(styles)).toBe(true);
    expect(styles[1]).toEqual({ opacity: 0 });
  });
  
  it('should render with opacity 1 when visible is true', () => {
    Platform.OS = 'web';
    const { getByTestId } = render(
      <HoverReactionButton onPress={mockOnPress} visible={true} />
    );
    
    const container = getByTestId('hover-reaction-container');
    const styles = container.props.style;
    
    // The style should be an array [baseStyles, {opacity: 1}]
    expect(Array.isArray(styles)).toBe(true);
    expect(styles[1]).toEqual({ opacity: 1 });
  });

  it('should not render on mobile platforms', () => {
    Platform.OS = 'ios';
    const { queryByTestId } = render(
      <HoverReactionButton onPress={mockOnPress} visible={true} />
    );
    
    expect(queryByTestId('add-reaction-icon')).toBeNull();

    Platform.OS = 'android';
    const { queryByTestId: queryByTestIdAndroid } = render(
      <HoverReactionButton onPress={mockOnPress} visible={true} />
    );
    
    expect(queryByTestIdAndroid('add-reaction-icon')).toBeNull();
  });

  it('should call onPress when button is pressed', () => {
    Platform.OS = 'web';
    const { getByTestId } = render(
      <HoverReactionButton onPress={mockOnPress} visible={true} />
    );
    
    const icon = getByTestId('add-reaction-icon');
    const button = icon.parent;
    fireEvent.press(button);
    
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should have correct icon props', () => {
    Platform.OS = 'web';
    const { getByTestId } = render(
      <HoverReactionButton onPress={mockOnPress} visible={true} />
    );
    
    const icon = getByTestId('add-reaction-icon');
    
    expect(icon.props.name).toBe('add-reaction');
    expect(icon.props.size).toBe(16);
  });

});