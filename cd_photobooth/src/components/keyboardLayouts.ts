import { KeyboardLayoutObject } from 'react-simple-keyboard';

import { Language, LanguageAbbreviations } from './boothConstants';

export type LayoutType = 'default' | 'shift-default' | 'alt' | 'shift-alt';

type CustomLayoutObject = {
  [K in LayoutType]: KeyboardLayoutObject[K];
};

const keyboardLayouts: Record<LanguageAbbreviations[Language], CustomLayoutObject> = {
  EN: {
    default: [
      '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
      '{tab} q w e r t y u i o p [ ] \\',
      "{lock} a s d f g h j k l ; ' {enter}",
      '{shift} z x c v b n m , . / {shift}',
      '{alt} @ {space} {alt}',
    ],
    'shift-default': [
      '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} Q W E R T Y U I O P { } |',
      '{lock} A S D F G H J K L : " {enter}',
      '{shift} Z X C V B N M < > ? {shift}',
      '{alt} @ {space} {alt}',
    ],
    alt: [
      '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
      '{tab} q w \u00e9 r t y \u00fa i \u00f3 p [ ] \\',
      "{lock} \u00e1 s d f g h j k l ; ' {enter}",
      '{shift} z x \u00e7 v b \u00f1 m , . / {shift}',
      '{alt} @ {space} {alt}',
    ],
    'shift-alt': [
      '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} Q W \u00c9 R T Y \u00da I \u00d3 P { } |',
      '{lock} \u00c1 S D F G H J K L : " {enter}',
      '{shift} Z X \u00c7 V B \u00d1 M < > ? {shift}',
      '{alt} @ {space} {alt}',
    ],
  },
  PL: {
    default: [
      '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
      '{tab} q w e r t y u i o p [ ] \\',
      "{lock} a s d f g h j k l ; ' {enter}",
      '{shift} z x c v b n m , . / {shift}',
      '{alt} @ {space} {alt}',
    ],
    'shift-default': [
      '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} Q W E R T Y U I O P { } |',
      '{lock} A S D F G H J K L : " {enter}',
      '{shift} Z X C V B N M < > ? {shift}',
      '{alt} @ {space} {alt}',
    ],
    alt: [
      '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
      '{tab} q w \u0119 r t y u i \u00f3 p [ ] \\',
      "{lock} \u0105 \u015b d f g h j k \u0142 ; ' {enter}",
      '{shift} \u017c \u017a \u0107 v b \u0144 m , . / {shift}',
      '{alt} @ {space} {alt}',
    ],
    'shift-alt': [
      '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} Q W \u0118 R T Y U I \u00d3 P { } |',
      '{lock} \u0104 \u015a D F G H J K \u0141 : " {enter}',
      '{shift} \u017b \u0179 \u0106 V B \u0143 M < > ? {shift}',
      '{alt} @ {space} {alt}',
    ],
  },
  GR: {
    default: [
      '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
      '{tab} ; \u03c2 \u03b5 \u03c1 \u03c4 \u03c5 \u03b8 \u03b9 \u03bf \u03c0 [ ] \\',
      "{lock} \u03b1 \u03c3 \u03b4 \u03c6 \u03b3 \u03b7 \u03be \u03ba \u03bb \u0384 ' {enter}",
      '{shift} < \u03b6 \u03c7 \u03c8 \u03c9 \u03b2 \u03bd \u03bc , . / {shift}',
      '{alt} @ {space} {alt}',
    ],
    'shift-default': [
      '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} : \u0385 \u0395 \u03a1 \u03a4 \u03a5 \u0398 \u0399 \u039f \u03a0 { } |',
      '{lock} \u0391 \u03a3 \u0394 \u03a6 \u0393 \u0397 \u039e \u039a \u039b \u00a8 " {enter}',
      '{shift} > \u0396 \u03a7 \u03a8 \u03a9 \u0392 \u039d \u039c < > ? {shift}',
      '{alt} @ {space} {alt}',
    ],
    alt: [
      '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
      '{tab} ; \u03c2 \u03ad \u03c1 \u03c4 \u03cd \u03b8 \u03af \u03cc \u03c0 [ ] \\',
      "{lock} \u03ac \u03c3 \u03b4 \u03c6 \u03b3 \u03ae \u03be \u03ba \u03bb \u0384 ' {enter}",
      '{shift} \u03b6 \u03c7 \u03c8 \u03ce \u03b2 \u03bd \u03bc , . / {shift}',
      '{alt} @ {space} {alt}',
    ],
    'shift-alt': [
      '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} : \u0385 \u0388 \u03a1 \u03a4 \u038e \u0398 \u038a \u038c \u03a0 { } |',
      '{lock} \u0386 \u03a3 \u0394 \u03a6 \u0393 \u0389 \u039e \u039a \u039b \u03aa \u03ab " {enter}',
      '{shift} > \u0396 \u03a7 \u03a8 \u038f \u0392 \u039d \u039c < > ? {shift}',
      '{alt} @ {space} {alt}',
    ],
  },
  NL: {
    default: [
      '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
      '{tab} q w e r t y u i o p [ ] \\',
      "{lock} a s d f g h j k l ; ' {enter}",
      '{shift} z x c v b n m , . / {shift}',
      '{alt} @ {space} {alt}',
    ],
    'shift-default': [
      '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} Q W E R T Y U I O P { } |',
      '{lock} A S D F G H J K L : " {enter}',
      '{shift} Z X C V B N M < > ? {shift}',
      '{alt} @ {space} {alt}',
    ],
    alt: [
      '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
      '{tab} q w \u00eb r t y \u00fc i \u00f6 p [ ] \\',
      "{lock} \u00e4 s d f g h j k l ; ' {enter}",
      '{shift} z x c v b n m , . / {shift}',
      '{alt} @ {space} {alt}',
    ],
    'shift-alt': [
      '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} Q W \u00cb R T Y \u00dc I \u00d6 P { } |',
      '{lock} \u00c4 S D F G H J K L : " {enter}',
      '{shift} Z X C V B N M < > ? {shift}',
      '{alt} @ {space} {alt}',
    ],
  },
  FR: {
    default: [
      '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
      '{tab} a z e r t y u i o p [ ] \\',
      "{lock} q s d f g h j k l m ; ' {enter}",
      '{shift} w x c v b n , . / {shift}',
      '{alt} @ {space} {alt}',
    ],
    'shift-default': [
      '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} A Z E R T Y U I O P { } |',
      '{lock} Q S D F G H J K L M : " {enter}',
      '{shift} W X C V B N < > ? {shift}',
      '{alt} @ {space} {alt}',
    ],
    alt: [
      '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
      '{tab} \u00e0 z \u00e9 r t y \u00f9 i \u00f4 p [ ] \\',
      "{lock} q s d f g h j k l m ; ' {enter}",
      '{shift} w x \u00e7 v b n , . / {shift}',
      '{alt} @ {space} {alt}',
    ],
    'shift-alt': [
      '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} \u00c0 Z \u00c9 R T Y \u00d9 I \u00d4 P { } |',
      '{lock} Q S D F G H J K L M : " {enter}',
      '{shift} W X \u00c7 V B N < > ? {shift}',
      '{alt} @ {space} {alt}',
    ],
  },
  CZ: {
    default: [
      '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
      '{tab} q w e r t y u i o p [ ] \\',
      "{lock} a s d f g h j k l ; ' {enter}",
      '{shift} z x c v b n m , . / {shift}',
      '{alt} @ {space} {alt}',
    ],
    'shift-default': [
      '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} Q W E R T Y U I O P { } |',
      '{lock} A S D F G H J K L : " {enter}',
      '{shift} Z X C V B N M < > ? {shift}',
      '{alt} @ {space} {alt}',
    ],
    alt: [
      '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
      '{tab} q w \u011b r t y u i \u00f3 p [ ] \\',
      "{lock} \u00e1 \u0161 \u010f f g h j k l ; ' {enter}",
      '{shift} \u017e \u010d \u010d v b \u0148 m , . / {shift}',
      '{alt} @ {space} {alt}',
    ],
    'shift-alt': [
      '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} Q W \u011a R T Y U I \u00d3 P { } |',
      '{lock} \u00c1 \u0160 \u010e F G H J K L : " {enter}',
      '{shift} \u017d \u010c \u010c V B \u0147 M < > ? {shift}',
      '{alt} @ {space} {alt}',
    ],
  },
  HR: {
    default: [
      '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
      '{tab} q w e r t y u i o p [ ] \\',
      "{lock} a s d f g h j k l ; ' {enter}",
      '{shift} z x c v b n m , . / {shift}',
      '{alt} @ {space} {alt}',
    ],
    'shift-default': [
      '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} Q W E R T Y U I O P { } |',
      '{lock} A S D F G H J K L : " {enter}',
      '{shift} Z X C V B N M < > ? {shift}',
      '{alt} @ {space} {alt}',
    ],
    alt: [
      '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
      '{tab} q w e r t y u i o p [ ] \\',
      "{lock} a \u0161 \u0111 f g h j k l ; ' {enter}",
      '{shift} \u017e \u010d \u010d v b n m , . / {shift}',
      '{alt} @ {space} {alt}',
    ],
    'shift-alt': [
      '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} Q W E R T Y U I O P { } |',
      '{lock} A \u0160 \u0110 F G H J K L : " {enter}',
      '{shift} \u017d \u010c \u010c V B N M < > ? {shift}',
      '{alt} @ {space} {alt}',
    ],
  },
  LT: {
    default: [
      '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
      '{tab} q w e r t y u i o p [ ] \\',
      "{lock} a s d f g h j k l ; ' {enter}",
      '{shift} z x c v b n m , . / {shift}',
      '{alt} @ {space} {alt}',
    ],
    'shift-default': [
      '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} Q W E R T Y U I O P { } |',
      '{lock} A S D F G H J K L : " {enter}',
      '{shift} Z X C V B N M < > ? {shift}',
      '{alt} @ {space} {alt}',
    ],
    alt: [
      '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
      '{tab} q w \u0119 r t y u \u012f o p [ ] \\',
      "{lock} \u0105 \u0161 d f g h j k l ; ' {enter}",
      '{shift} \u017e \u010d \u010d v b n m , . / {shift}',
      '{alt} @ {space} {alt}',
    ],
    'shift-alt': [
      '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} Q W \u0118 R T Y U \u012e O P { } |',
      '{lock} \u0104 \u0160 D F G H J K L : " {enter}',
      '{shift} \u017d \u010c \u010c V B N M < > ? {shift}',
      '{alt} @ {space} {alt}',
    ],
  },
  ES: {
    default: [
      '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
      '{tab} q w e r t y u i o p [ ] \\',
      "{lock} a s d f g h j k l ; ' {enter}",
      '{shift} z x c v b n m , . / {shift}',
      '{alt} @ {space} {alt}',
    ],
    'shift-default': [
      '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} Q W E R T Y U I O P { } |',
      '{lock} A S D F G H J K L : " {enter}',
      '{shift} Z X C V B N M < > ? {shift}',
      '{alt} @ {space} {alt}',
    ],
    alt: [
      '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
      '{tab} q w \u00e9 r t y \u00fa i \u00f3 p [ ] \\',
      "{lock} \u00e1 s d f g h j k l ; ' {enter}",
      '{shift} z x c v b \u00f1 m , . / {shift}',
      '{alt} @ {space} {alt}',
    ],
    'shift-alt': [
      '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} Q W \u00c9 R T Y \u00da I \u00d3 P { } |',
      '{lock} \u00c1 S D F G H J K L : " {enter}',
      '{shift} Z X C V B \u00d1 M < > ? {shift}',
      '{alt} @ {space} {alt}',
    ],
  },
  PT: {
    default: [
      '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
      '{tab} q w e r t y u i o p [ ] \\',
      "{lock} a s d f g h j k l ; ' {enter}",
      '{shift} z x c v b n m , . / {shift}',
      '{alt} @ {space} {alt}',
    ],
    'shift-default': [
      '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} Q W E R T Y U I O P { } |',
      '{lock} A S D F G H J K L : " {enter}',
      '{shift} Z X C V B N M < > ? {shift}',
      '{alt} @ {space} {alt}',
    ],
    alt: [
      '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
      '{tab} q w e r t y \u00fa i \u00f3 p [ ] \\',
      "{lock} \u00e3 s d f g h j k l ; ' {enter}",
      '{shift} z x \u00e7 v b n m , . / {shift}',
      '{alt} @ {space} {alt}',
    ],
    'shift-alt': [
      '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} Q W E R T Y \u00da I \u00d3 P { } |',
      '{lock} \u00c3 S D F G H J K L : " {enter}',
      '{shift} Z X \u00c7 V B N M < > ? {shift}',
      '{alt} @ {space} {alt}',
    ],
  },
  RO: {
    default: [
      '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
      '{tab} q w e r t y u i o p [ ] \\',
      "{lock} a s d f g h j k l ; ' {enter}",
      '{shift} z x c v b n m , . / {shift}',
      '{alt} @ {space} {alt}',
    ],
    'shift-default': [
      '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} Q W E R T Y U I O P { } |',
      '{lock} A S D F G H J K L : " {enter}',
      '{shift} Z X C V B N M < > ? {shift}',
      '{alt} @ {space} {alt}',
    ],
    alt: [
      '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
      '{tab} q w e r t y u i o p [ ] \\',
      "{lock} \u0103 \u0219 d f g h j k l ; ' {enter}",
      '{shift} z x c v b n m , . / {shift}',
      '{alt} @ {space} {alt}',
    ],
    'shift-alt': [
      '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
      '{tab} Q W E R T Y U I O P { } |',
      '{lock} \u00c2 \u0218 D F G H J K L : " {enter}',
      '{shift} Z X C V B N M < > ? {shift}',
      '{alt} @ {space} {alt}',
    ],
  },
};

export default keyboardLayouts;
