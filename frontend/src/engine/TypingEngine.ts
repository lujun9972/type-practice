export type CharStatus = "pending" | "correct" | "incorrect" | "skipped";

export interface TypedChar {
  char: string;
  status: CharStatus;
}

export class TypingEngine {
  private readonly _segment: string;
  private readonly _chars: TypedChar[];
  private _cursor = 0;

  constructor(segment: string) {
    this._segment = segment;
    this._chars = [...segment].map((char) => ({ char, status: "pending" as CharStatus }));
  }

  get segment(): string {
    return this._segment;
  }

  get cursor(): number {
    return this._cursor;
  }

  get chars(): readonly TypedChar[] {
    return this._chars;
  }

  get isComplete(): boolean {
    return (
      this._cursor === this._chars.length &&
      this._chars.every((c) => c.status === "correct" || c.status === "skipped")
    );
  }

  hint(): string {
    if (this._cursor >= this._chars.length) return "";
    return this._chars[this._cursor].char;
  }

  input(char: string): void {
    if (this._cursor >= this._chars.length) return;
    const expected = this._chars[this._cursor];
    expected.status = char === expected.char ? "correct" : "incorrect";
    this._cursor++;
  }

  backspace(): void {
    if (this._cursor <= 0) return;
    this._cursor--;
    this._chars[this._cursor].status = "pending";
  }

  skip(): void {
    if (this._cursor >= this._chars.length) return;
    for (let i = 0; i < this._chars.length; i++) {
      if (this._chars[i].status !== "correct") {
        this._chars[i].status = "skipped";
      }
    }
    this._cursor = this._chars.length;
  }
}
