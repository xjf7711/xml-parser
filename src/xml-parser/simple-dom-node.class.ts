import { IAttribute, IComponent } from './interface';
import { encodeToXmlString } from './functions';

export class SimpleDOMNode {
  nodeName: string; // tagName
  nodeValue: string | undefined;
  childNodes: SimpleDOMNode[] = [];
  parentNode: SimpleDOMNode | null;
  attributes: IAttribute[] = [];
  constructor(nodeName: string, nodeValue?: string) {
    this.nodeName = nodeName;
    this.nodeValue = nodeValue;
    this.parentNode = null;
    // Object.defineProperty(this, 'parentNode', { value: null, writable: true });
  }

  get firstChild(): SimpleDOMNode | undefined {
    return this.childNodes && this.childNodes[0];
  }

  get nextSibling(): SimpleDOMNode | undefined {
    const childNodes = this.parentNode?.childNodes;
    if (!childNodes) {
      return undefined;
    }
    const index = childNodes.indexOf(this);
    if (index === -1) {
      return undefined;
    }
    return childNodes[index + 1];
  }

  get textContent(): string {
    if (!this.childNodes) {
      return this.nodeValue || '';
    }
    return this.childNodes
      .map(function (child) {
        return child.textContent;
      })
      .join('');
  }

  get children(): SimpleDOMNode[] {
    return this.childNodes || [];
  }

  hasChildNodes(): boolean {
    return this.childNodes && this.childNodes.length > 0;
  }

  /**
   * Search a node in the tree with the given path
   * foo.bar[nnn], i.e. find the nnn-th node named
   * bar under a node named foo.
   *
   * @param {Array} paths - an array of objects as
   * returned by {parseXFAPath}.
   * @param {number} pos - the current position in
   * the paths array.
   * @returns {SimpleDOMNode} The node corresponding
   * to the path or null if not found.
   */
  searchNode(paths: IComponent[], pos: number): SimpleDOMNode | null {
    if (pos >= paths.length) {
      return this;
    }

    const component = paths[pos];
    const stack: [SimpleDOMNode, number][] = [];
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let node: SimpleDOMNode = this;

    while (true) {
      if (component.name === node.nodeName) {
        if (component.pos === 0) {
          const res = node.searchNode(paths, pos + 1);
          if (res !== null) {
            return res;
          }
        } else if (stack.length === 0) {
          return null;
        } else {
          const [parent] = stack.pop()!;
          let siblingPos = 0;
          for (const child of parent.childNodes) {
            if (component.name === child.nodeName) {
              if (siblingPos === component.pos) {
                return child.searchNode(paths, pos + 1);
              }
              siblingPos++;
            }
          }
          // We didn't find the correct sibling
          // so just return the first found node
          return node.searchNode(paths, pos + 1);
        }
      }

      if (node.childNodes && node.childNodes.length !== 0) {
        stack.push([node, 0]);
        node = node.childNodes[0];
      } else if (stack.length === 0) {
        return null;
      } else {
        while (stack.length !== 0) {
          const [parent, currentPos] = stack.pop()!;
          const newPos = currentPos + 1;
          if (newPos < parent.childNodes.length) {
            stack.push([parent, newPos]);
            node = parent.childNodes[newPos];
            break;
          }
        }
        if (stack.length === 0) {
          return null;
        }
      }
    }
  }

  dump(buffer: string[]): void {
    if (this.nodeName === '#text') {
      buffer.push(encodeToXmlString(this.nodeValue!));
      return;
    }

    buffer.push(`<${this.nodeName}`);
    if (this.attributes) {
      for (const attribute of this.attributes) {
        buffer.push(
          ` ${attribute.name}="${encodeToXmlString(attribute.value)}"`
        );
      }
    }
    if (this.hasChildNodes()) {
      buffer.push('>');
      for (const child of this.childNodes) {
        child.dump(buffer);
      }
      buffer.push(`</${this.nodeName}>`);
    } else if (this.nodeValue) {
      buffer.push(`>${encodeToXmlString(this.nodeValue)}</${this.nodeName}>`);
    } else {
      buffer.push('/>');
    }
  }
}
