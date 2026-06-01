import { pinyin as getPinyin } from "pinyin-pro";

export type CharStatus = "pending" | "correct" | "incorrect" | "skipped";

export interface TypedChar {
  char: string;
  status: CharStatus;
}

export interface PinyinTarget {
  display: string;      // Original character
  pinyin: string;       // Pinyin with tone marks (for display)
  matchPinyin: string;  // Pinyin without tones (for matching)
  status: CharStatus;
  typedCount: number;   // How many letters of matchPinyin have been typed
}

export class PinyinEngine {
  private readonly _targets: PinyinTarget[];
  private _targetIndex = 0;
  private _letterCursor = 0;

  constructor(text: string) {
    this._targets = [...text].map((char) => this._buildTarget(char));
    // Auto-skip punctuation
    for (const t of this._targets) {
      if (t.matchPinyin === "" && t.status !== "correct") {
        t.status = "correct";
      }
    }
  }

  private _buildTarget(char: string): PinyinTarget {
    // Chinese character
    if (/[\u4e00-\u9fff]/.test(char)) {
      const pinyinWithTone = getPinyin(char, { toneType: "symbol" });
      const pinyinNoTone = getPinyin(char, { toneType: "none" });
      return {
        display: char,
        pinyin: pinyinWithTone,
        matchPinyin: pinyinNoTone.toLowerCase(),
        status: "pending",
        typedCount: 0,
      };
    }
    // Punctuation (CJK or common)
    if (/[^\w]/.test(char) || /[\u3000-\u303f\uff00-\uffef\u2000-\u206f]/.test(char)) {
      return {
        display: char,
        pinyin: "",
        matchPinyin: "",
        status: "correct",
        typedCount: 0,
      };
    }
    // English letter or number — type directly
    return {
      display: char,
      pinyin: "",
      matchPinyin: char.toLowerCase(),
      status: "pending",
      typedCount: 0,
    };
  }

  get chars(): readonly TypedChar[] {
    return this._targets.map((t) => ({ char: t.display, status: t.status }));
  }

  get targets(): readonly PinyinTarget[] {
    return this._targets;
  }

  get cursor(): number {
    return this._targetIndex;
  }

  get isComplete(): boolean {
    return this._targets.every((t) => t.status === "correct" || t.status === "skipped");
  }

  hint(): string {
    const target = this._currentTarget();
    if (!target) return "";
    return target.matchPinyin[target.typedCount] ?? "";
  }

  input(char: string): void {
    const target = this._currentTarget();
    if (!target) return;

    const expected = target.matchPinyin[target.typedCount];
    if (char.toLowerCase() === expected) {
      target.typedCount++;
      if (target.typedCount >= target.matchPinyin.length) {
        target.status = "correct";
        this._advanceToNext();
      }
    } else {
      target.status = "incorrect";
      target.typedCount++;
      if (target.typedCount >= target.matchPinyin.length) {
        this._advanceToNext();
      }
    }
  }

  backspace(): void {
    const target = this._currentTarget();

    // If current target has typed letters, erase one
    if (target && target.typedCount > 0) {
      target.typedCount--;
      target.status = "pending";
      return;
    }

    // Otherwise, go back to previous completed/skipped character and reset it
    for (let i = this._targetIndex - 1; i >= 0; i--) {
      const prev = this._targets[i];
      if (prev.matchPinyin === "") continue; // skip punctuation
      if (prev.status === "correct" || prev.status === "incorrect") {
        prev.typedCount = 0;
        prev.status = "pending";
        this._targetIndex = i;
        return;
      }
    }
  }

  skip(): void {
    for (const t of this._targets) {
      if (t.status !== "correct") {
        t.status = "skipped";
      }
    }
  }

  private _currentTarget(): PinyinTarget | undefined {
    // Find the next target that requires user input
    for (let i = this._targetIndex; i < this._targets.length; i++) {
      const t = this._targets[i];
      if (t.matchPinyin !== "" && t.status !== "skipped") return t;
    }
    return undefined;
  }

  private _advanceToNext(): void {
    for (let i = this._targetIndex + 1; i < this._targets.length; i++) {
      if (this._targets[i].matchPinyin !== "" && this._targets[i].status !== "skipped") {
        this._targetIndex = i;
        return;
      }
    }
    // No more targets
    this._targetIndex = this._targets.length;
  }
}
