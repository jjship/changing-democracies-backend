import { KeyboardLayoutObject } from 'react-simple-keyboard';
import keyboardLayouts, { LayoutType } from './keyboardLayouts';
import { useState, useEffect, SetStateAction, useCallback, Dispatch } from 'react';
import { useBoothContext } from './BoothContext';
import { languageAbbreviations } from './boothConstants';

export type LayoutKey = '{shift}' | '{lock}' | '{alt}';

const SHIFT = 'shift';
const ALT = 'alt';
const DEFAULT = 'default';

const isShiftType = (type: LayoutType) => type.startsWith(SHIFT);
const isAltType = (type: LayoutType) => type.endsWith(ALT);
const isShiftKey = (key: LayoutKey) => key === '{lock}' || key === '{shift}';
const isAltKey = (key: LayoutKey) => key === '{alt}';

const getNextType = (key: LayoutKey, prevType: LayoutType): LayoutType => {
  const isPrevShift = isShiftType(prevType);
  const isPrevAlt = isAltType(prevType);

  if (isShiftKey(key)) {
    if (isPrevShift) return prevType.split('-')[1] as LayoutType;
    return isPrevAlt ? `${SHIFT}-${ALT}` : `${SHIFT}-${DEFAULT}`;
  }

  if (isAltKey(key)) {
    if (isPrevAlt) return isPrevShift ? `${SHIFT}-${DEFAULT}` : DEFAULT;
    return isPrevShift ? `${SHIFT}-${ALT}` : ALT;
  }

  return prevType;
};

export const useLayout = (setType: Dispatch<SetStateAction<LayoutType>>) => {
  const { currentLang } = useBoothContext();
  const [layout, setLayout] = useState<KeyboardLayoutObject>(keyboardLayouts['EN']);

  useEffect(() => {
    if (currentLang) {
      const newLayout = keyboardLayouts[languageAbbreviations[currentLang]];
      if (newLayout) setLayout(newLayout);
    }
  }, [currentLang]);

  const handleLayoutTypeChange = useCallback(
    (key: LayoutKey) => {
      setType((prevType) => getNextType(key, prevType));
    },
    [setType],
  );

  const isLayoutKey = useCallback((key: string): key is LayoutKey => {
    return (['{shift}', '{lock}', '{alt}'] as string[]).includes(key);
  }, []);

  return { layout, handleLayoutTypeChange, isLayoutKey };
};
