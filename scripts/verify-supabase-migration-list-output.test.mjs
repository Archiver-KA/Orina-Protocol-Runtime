import { describe, expect, it } from "vitest";
import { parseRows } from "./supabase-migration-list-parser.mjs";

describe("Supabase migration-list parser", () => {
  it("accepts legacy plain and current markdown-formatted versions", () => {
    const output = [
      " Local    | Remote   | Time (UTC)",
      "----------|----------|------------",
      " 000084   | 000084   | 000084",
      " `000085` | `000085` | `000085`",
    ].join("\n");

    expect(parseRows(output)).toEqual([
      { local: "000084", remote: "000084" },
      { local: "000085", remote: "000085" },
    ]);
  });

  it("preserves missing and mismatched sides for fail-closed validation", () => {
    const output = [
      " `000084` |          | `000084`",
      " `000085` | `000086` | `000085`",
    ].join("\n");

    expect(parseRows(output)).toEqual([
      { local: "000084", remote: "" },
      { local: "000085", remote: "000086" },
    ]);
  });
});
