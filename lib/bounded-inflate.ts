import { createInflate } from "node:zlib";

export const MAX_INFLATED_BYTES = 25 * 1024 * 1024;
export class DecompressionLimitError extends Error {
  constructor() { super("PDF decompression exceeds the 25 MB safety limit. Please upload a flattened PDF or review this certificate manually."); }
}

// Budget is shared across all streams in a PDF, not reset for each object.
export async function boundedInflate(input: Buffer, budget: { remaining: number }): Promise<Buffer> {
  const inflater = createInflate();
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    inflater.on("data", (chunk: Buffer) => {
      budget.remaining -= chunk.length;
      if (budget.remaining < 0) { inflater.destroy(new DecompressionLimitError()); return; }
      chunks.push(chunk);
    });
    inflater.once("error", reject);
    inflater.once("end", () => resolve(Buffer.concat(chunks)));
    inflater.end(input);
  });
}
