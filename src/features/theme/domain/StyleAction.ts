export type StyleAction =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'increaseSize' }
  | { type: 'decreaseSize' }
  | { type: 'strikethrough' }
  | { type: 'color'; index: number };
