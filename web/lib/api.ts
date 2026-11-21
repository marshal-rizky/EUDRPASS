/** Client wrappers for Marshal's /api routes. Both are optional: the UI falls back to manual input. */

export type UploadResult = { cid: string; url: string | null; sha256: string; pinned: boolean };

export type Extraction = {
  fields: {
    docType: "SHM" | "SKT" | "STDB" | "OTHER" | "UNREADABLE";
    parcelId: string | null;
    ownerName: string | null;
    areaValue: number | null;
    areaUnit: "m2" | "ha" | "are" | null;
    areaHa: number | null;
    hectaresE2: number | null;
    village: string | null;
    district: string | null;
    regency: string | null;
  };
  confidence: Record<"docType" | "parcelId" | "ownerName" | "area" | "village" | "district" | "regency", number>;
  needsReview: string[];
  issues: string[];
  notes: string;
  model: string;
};

async function postFile<T>(path: string, file: File, timeoutMs: number): Promise<T> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(path, { method: "POST", body, signal: AbortSignal.timeout(timeoutMs) });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      json && typeof json === "object" && "error" in json && typeof json.error === "string"
        ? json.error
        : `Layanan tidak tersedia (${res.status})`;
    throw new Error(msg);
  }
  return json as T;
}

async function localSha256(file: File): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Pins via /api/ipfs; if that fails, uses a local sha256 so registration can continue. */
export async function uploadDocument(file: File): Promise<UploadResult & { fallback: boolean }> {
  try {
    return { ...(await postFile<UploadResult>("/api/ipfs", file, 30_000)), fallback: false };
  } catch {
    const sha = await localSha256(file);
    return { cid: `sha256-${sha}`, url: null, sha256: sha, pinned: false, fallback: true };
  }
}

export function extractDocument(file: File): Promise<Extraction> {
  return postFile<Extraction>("/api/extract", file, 45_000);
}

export function ipfsUrl(cid: string): string | null {
  return cid.startsWith("sha256-") || cid.length < 10 ? null : `https://gateway.pinata.cloud/ipfs/${cid}`;
}
