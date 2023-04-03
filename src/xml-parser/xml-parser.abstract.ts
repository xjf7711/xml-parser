import { XMLParserErrorCode } from './constants';
import { IAttribute, IContent, IInstruction } from './interface';
import { isWhitespace } from './functions';

// ToDo 作为基类的意义是什么？？
export abstract class XMLParserBase {
  _resolveEntities(s: string): string {
    return s.replace(/&([^;]+);/g, (all, entity) => {
      if (entity.substring(0, 2) === '#x') {
        return String.fromCodePoint(parseInt(entity.substring(2), 16));
      } else if (entity.substring(0, 1) === '#') {
        return String.fromCodePoint(parseInt(entity.substring(1), 10));
      }
      switch (entity) {
        case 'lt':
          return '<';
        case 'gt':
          return '>';
        case 'amp':
          return '&';
        case 'quot':
          return '"';
        case 'apos':
          return "'";
      }
      return this.onResolveEntity(entity);
    });
  }

  /**
   * 解析字符串，----> XmlNode
   * @param s
   * @param start
   */
  _parseContent(s: string, start: number): IContent | null {
    const attributes: IAttribute[] = [];
    let pos = start;

    function skipWs() {
      while (pos < s.length && isWhitespace(s, pos)) {
        ++pos;
      }
    }

    while (
      pos < s.length &&
      !isWhitespace(s, pos) &&
      s[pos] !== '>' &&
      s[pos] !== '/'
    ) {
      ++pos;
    }
    const name = s.substring(start, pos);
    skipWs();
    while (
      pos < s.length &&
      s[pos] !== '>' &&
      s[pos] !== '/' &&
      s[pos] !== '?'
    ) {
      skipWs();
      let attrName = '';
      let attrValue = '';
      while (pos < s.length && !isWhitespace(s, pos) && s[pos] !== '=') {
        attrName += s[pos];
        ++pos;
      }
      skipWs();
      if (s[pos] !== '=') {
        return null;
      }
      ++pos;
      skipWs();
      const attrEndChar = s[pos];
      if (attrEndChar !== '"' && attrEndChar !== "'") {
        return null;
      }
      const attrEndIndex = s.indexOf(attrEndChar, ++pos);
      if (attrEndIndex < 0) {
        return null;
      }
      attrValue = s.substring(pos, attrEndIndex);
      // todo 不同值的处理
      let value = this._resolveEntities(attrValue);
      // attributes[attrName] = this._resolveEntities(attrValue);
      attributes.push({
        name: attrName,
        value: this._resolveEntities(attrValue),
      });
      pos = attrEndIndex + 1;
      skipWs();
    }
    return {
      name,
      attributes,
      parsed: pos - start,
    };
  }

  _parseProcessingInstruction(s: string, start: number): IInstruction {
    let pos = start;

    function skipWs() {
      while (pos < s.length && isWhitespace(s, pos)) {
        ++pos;
      }
    }

    while (
      pos < s.length &&
      !isWhitespace(s, pos) &&
      s[pos] !== '>' &&
      s[pos] !== '?' &&
      s[pos] !== '/'
    ) {
      ++pos;
    }
    const name = s.substring(start, pos);
    skipWs();
    const attrStart = pos;
    while (pos < s.length && (s[pos] !== '?' || s[pos + 1] !== '>')) {
      ++pos;
    }
    const value = s.substring(attrStart, pos);
    return {
      name,
      value,
      parsed: pos - start,
    };
  }

  /**
   * 解析xml字符串
   * @param s
   */
  parseXml(s: string): void {
    // console.log('parseXml . ');
    // console.log('s is ', s);
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      let j = i;
      if (ch === '<') {
        ++j;
        const ch2 = s[j];
        let q;
        let pi;
        let content;
        let isClosed;
        switch (ch2) {
          case '/':
            ++j;
            q = s.indexOf('>', j);
            if (q < 0) {
              this.onError(XMLParserErrorCode.UnterminatedElement);
              return;
            }
            this.onEndElement(s.substring(j, q));
            j = q + 1;
            break;
          case '?':
            ++j;
            pi = this._parseProcessingInstruction(s, j);
            if (s.substring(j + pi.parsed, j + pi.parsed + 2) !== '?>') {
              this.onError(XMLParserErrorCode.UnterminatedXmlDeclaration);
              return;
            }
            this.onPi(pi.name, pi.value);
            j += pi.parsed + 2;
            break;
          case '!':
            if (s.substring(j + 1, j + 3) === '--') {
              q = s.indexOf('-->', j + 3);
              if (q < 0) {
                this.onError(XMLParserErrorCode.UnterminatedComment);
                return;
              }
              this.onComment(s.substring(j + 3, q));
              j = q + 3;
            } else if (s.substring(j + 1, j + 8) === '[CDATA[') {
              q = s.indexOf(']]>', j + 8);
              if (q < 0) {
                this.onError(XMLParserErrorCode.UnterminatedCdat);
                return;
              }
              this.onCdata(s.substring(j + 8, q));
              j = q + 3;
            } else if (s.substring(j + 1, j + 8) === 'DOCTYPE') {
              const q2 = s.indexOf('[', j + 8);
              let complexDoctype = false;
              q = s.indexOf('>', j + 8);
              if (q < 0) {
                this.onError(XMLParserErrorCode.UnterminatedDoctypeDeclaration);
                return;
              }
              if (q2 > 0 && q > q2) {
                q = s.indexOf(']>', j + 8);
                if (q < 0) {
                  this.onError(
                    XMLParserErrorCode.UnterminatedDoctypeDeclaration
                  );
                  return;
                }
                complexDoctype = true;
              }
              const doctypeContent = s.substring(
                j + 8,
                q + (complexDoctype ? 1 : 0)
              );
              this.onDoctype(doctypeContent);
              j = q + (complexDoctype ? 2 : 1);
            } else {
              this.onError(XMLParserErrorCode.MalformedElement);
              return;
            }
            break;
          default:
            content = this._parseContent(s, j);
            if (content === null) {
              this.onError(XMLParserErrorCode.MalformedElement);
              return;
            }
            isClosed = false;
            if (
              s.substring(j + content.parsed, j + content.parsed + 2) === '/>'
            ) {
              isClosed = true;
            } else if (
              s.substring(j + content.parsed, j + content.parsed + 1) !== '>'
            ) {
              this.onError(XMLParserErrorCode.UnterminatedElement);
              return;
            }
            this.onBeginElement(content.name, content.attributes, isClosed);
            j += content.parsed + (isClosed ? 2 : 1);
            break;
        }
      } else {
        while (j < s.length && s[j] !== '<') {
          j++;
        }
        const text = s.substring(i, j);
        this.onText(this._resolveEntities(text));
      }
      i = j;
    }
  }

  onResolveEntity(name: string): string {
    return `&${name};`;
  }

  onPi(name: string, value: string): void {
    //
  }

  onComment(text: string): void {
    //
  }

  abstract onCdata(text: string): void;

  onDoctype(doctypeContent: string): void {
    //
  }

  abstract onText(text: string): void;

  abstract onBeginElement(name: string, attributes: IAttribute[], isEmpty: boolean): void;

  abstract onEndElement(name: string): void;

  abstract onError(code: number): void;
}
