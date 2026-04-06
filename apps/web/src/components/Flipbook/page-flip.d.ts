declare module 'page-flip' {
  export class PageFlip {
    constructor(element: HTMLElement, options: Record<string, unknown>);
    loadFromHTML(elements: NodeListOf<Element>): void;
    on(event: string, callback: (e: { data: number }) => void): void;
    flip(pageIndex: number): void;
    flipNext(): void;
    flipPrev(): void;
    destroy(): void;
  }
}
