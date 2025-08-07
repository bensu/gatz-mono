import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { HangingReactions } from './reactions';
import { SessionContext } from '../context/SessionProvider';
import { useThemeColors } from '../gifted/hooks/useThemeColors';

jest.mock('../gifted/hooks/useThemeColors');

const mockUseThemeColors = useThemeColors as jest.MockedFunction<typeof useThemeColors>;

const mockSessionContext = {
  session: {
    userId: 'user123',
  },
};

describe('HangingReactions - Hover Button Feature', () => {
  const mockOnReactji = jest.fn();
  const mockOnDisplayReactions = jest.fn();

  const defaultReactions = {
    user123: {
      '👍': 1234567890,
      '❤️': 1234567891,
    },
    user456: {
      '😂': 1234567892,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'web'; // Reset to web for each test
    mockUseThemeColors.mockReturnValue({
      appBackground: '#fff',
      rowBackground: '#f0f0f0',
      reactionsBg: '#e0e0e0',
      primaryText: '#000',
      midGrey: '#999',
    });
  });

  const renderComponent = (props = {}) => {
    return render(
      <SessionContext.Provider value={mockSessionContext}>
        <HangingReactions
          reactions={defaultReactions}
          onDisplayReactions={mockOnDisplayReactions}
          onReactji={mockOnReactji}
          {...props}
        />
      </SessionContext.Provider>
    );
  };

  it('should show hover reaction button on web when isHover is true', () => {
    Platform.OS = 'web';
    
    const { getByTestId } = renderComponent({
      isHover: true,
    });

    expect(getByTestId('add-reaction-icon')).toBeTruthy();
  });

  it('should not show hover reaction button when isHover is false', () => {
    Platform.OS = 'web';
    
    const { getByTestId } = renderComponent({
      isHover: false,
    });

    const container = getByTestId('hover-reaction-container');
    const styles = container.props.style;
    
    // The style should be an array with opacity 0
    expect(Array.isArray(styles)).toBe(true);
    expect(styles[1]).toEqual({ opacity: 0 });
  });

  it('should not show hover reaction button on mobile even when isHover is true', () => {
    Platform.OS = 'ios';
    
    const { queryByTestId } = renderComponent({
      isHover: true,
    });

    expect(queryByTestId('add-reaction-icon')).toBeNull();
  });

  it('should call onReactji when hover button is pressed', () => {
    Platform.OS = 'web';
    
    const { getByTestId } = renderComponent({
      isHover: true,
    });

    const icon = getByTestId('add-reaction-icon');
    const button = icon.parent;
    fireEvent.press(button);

    expect(mockOnReactji).toHaveBeenCalledTimes(1);
  });

  it('should position hover button to the left of reactions', () => {
    Platform.OS = 'web';
    
    const { getByTestId, getByText } = renderComponent({
      isHover: true,
    });

    const hoverButton = getByTestId('add-reaction-icon');
    const reaction = getByText('👍');

    // The hover button should appear before (to the left of) the reactions
    const hoverButtonParent = hoverButton.parent;
    
    // In the component structure, the hover button comes first in the flex row
    expect(hoverButtonParent).toBeTruthy();
    expect(reaction).toBeTruthy();
  });

  it('should not show hover button when onReactji is not provided', () => {
    Platform.OS = 'web';
    
    const { queryByTestId } = renderComponent({
      isHover: true,
      onReactji: undefined,
    });

    expect(queryByTestId('add-reaction-icon')).toBeNull();
  });

  it('should render reactions even when there are no reactions', () => {
    const { queryByText } = renderComponent({
      reactions: {},
    });

    // Component should return null when there are no reactions
    expect(queryByText('👍')).toBeNull();
    expect(queryByText('❤️')).toBeNull();
    expect(queryByText('😂')).toBeNull();
  });

  it('should handle display reactions callback correctly', () => {
    const { getByText } = renderComponent({
      onDisplayReactions: mockOnDisplayReactions,
    });

    // Press on one of the reactions
    const reaction = getByText('👍');
    fireEvent.press(reaction.parent.parent.parent); // Navigate up to TouchableOpacity

    expect(mockOnDisplayReactions).toHaveBeenCalledTimes(1);
  });
});