import { createHash } from "node:crypto";

/** Legality documents arrive as phone photos or scanned PDFs. */
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export type AcceptedType = (typeof ACCEPTED_TYPES)[number];

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export interface Upload {
  file: File;
  bytes: Buffer;
  mediaType: AcceptedType;
  sha256: string; // hex digest of the exact bytes received
}

export class UploadError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function isAccepted(type: string): type is AcceptedType {
  return (ACCEPTED_TYPES as readonly string[]).includes(type);
}

/** Reads and validates the multipart field `file`. Throws UploadError on bad input. */
export async function readUpload(request: Request): Promise<Upload> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new UploadError("Request must be multipart/form-data with a `file` field", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) throw new UploadError("Missing `file` field", 400);
  if (file.size === 0) throw new UploadError("File is empty", 400);
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("File exceeds 10 MB", 413);
  if (!isAccepted(file.type)) {
    throw new UploadError(`Unsupported type "${file.type}". Use JPEG, PNG, WebP or PDF`, 415);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return { file, bytes, mediaType: file.type, sha256 };
}

export function errorResponse(error: unknown): Response {
  if (error instanceof UploadError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Internal error" }, { status: 500 });
}
