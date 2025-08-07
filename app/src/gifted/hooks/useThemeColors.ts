import { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeProvider';

export const useThemeColors = () => {
  const { colors } = useContext(ThemeContext);
  return colors;
};