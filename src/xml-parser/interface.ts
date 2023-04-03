export interface IAttribute {
  name: string,
  value: string,
}

export interface IContent {
  name: string,
  attributes: IAttribute[], // ToDo 为什么用数组方式，而不是键值对？？？？
  parsed: number,
}
export interface IInstruction {
  name: string,
  value: string,
  parsed: number,
}

export interface IComponent {
  pos: number,
  name: string,
}
export interface IParam {
  hasAttributes?: boolean,
  lowerCaseName?: boolean,
}
