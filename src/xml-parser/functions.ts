import { XMLEntities } from './constants';
export function isWhitespace(s: string, index: number): boolean {
  const ch = s[index];
  return ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t';
}
export function isWhitespaceString(s: string): boolean {
  for (let i = 0, ii = s.length; i < ii; i++) {
    if (!isWhitespace(s, i)) {
      return false;
    }
  }
  return true;
}
export function encodeToXmlString(value: string | number | boolean = ''): string {
  const buffer = [];
  let start = 0;
  let str = String(value);
  for (let i = 0, ii = str.length; i < ii; i++) {
    const char = str.codePointAt(i);
    if (char === undefined) {
      throw Error('char is undefined . ');
    }
    if (0x20 <= char && char <= 0x7e) {
      // ascii
      const entity = XMLEntities[char as keyof typeof XMLEntities];
      if (entity) {
        if (start < i) {
          buffer.push(str.substring(start, i));
        }
        buffer.push(entity);
        start = i + 1;
      }
    } else {
      if (start < i) {
        buffer.push(str.substring(start, i));
      }
      // todo 为什么转码 ？？？？？？
      buffer.push(`&#x${char.toString(16).toUpperCase()};`);
      if (char > 0xd7ff && (char < 0xe000 || char > 0xfffd)) {
        // char is represented by two u16
        i++;
      }
      start = i + 1;
    }
  }

  if (buffer.length === 0) {
    return str;
  }
  if (start < str.length) {
    buffer.push(str.substring(start, str.length));
  }
  return buffer.join('');
}
