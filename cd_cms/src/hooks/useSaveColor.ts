import { useState } from 'react';

type SaveColorType =
  | 'whiteAlpha'
  | 'blackAlpha'
  | 'gray'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'blue'
  | 'cyan'
  | 'purple'
  | 'pink';

export function useSaveColor(initialColor: SaveColorType = 'whiteAlpha') {
  const [saveColor, setSaveColor] = useState<SaveColorType>(initialColor);

  const markUnsaved = () => setSaveColor('orange');
  const markSaved = () => setSaveColor('whiteAlpha');

  return {
    saveColor,
    markUnsaved,
    markSaved,
  };
}
