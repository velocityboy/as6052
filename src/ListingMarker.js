// @flow

export default class ListingMarker {
  _insertionPoint: number;

  constructor(insertionPoint: number): void {
    this._insertionPoint = insertionPoint;
  }

  increment(): void {
    this._insertionPoint++;
  }

  get insertionPoint(): number {
    return this._insertionPoint;
  }
}
