import { errorResponse, readUpload } from "../_lib/upload";

/**
 * POST /api/ipfs  (multipart, field `file`)
 *
 * Pins a legality document to IPFS via Pinata and returns its CID. The CID is the
 * only thing that goes on-chain (PlotRegistry.docCID); the file itself stays off-chain.
 *
 * Response 200:
 *   { cid: string, url: string | null, sha256: string, pinned: boolean }
 *
 * Without PINATA_JWT (local dev) the file is NOT uploaded anywhere: `cid` is
 * "sha256-<hex>", `url` is null and `pinned` is false, so the UI can say so
 * honestly instead of showing a fake IPFS link.
 */

export const maxDuration = 30;

const PINATA_PIN_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const DEFAULT_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

export async function POST(request: Request): Promise<Response> {
  try {
    const upload = await readUpload(request);
    const jwt = process.env.PINATA_JWT;

    if (!jwt) {
      return Response.json({
        cid: `sha256-${upload.sha256}`,
        url: null,
        sha256: upload.sha256,
        pinned: false,
      });
    }

    const body = new FormData();
    body.append("file", new Blob([new Uint8Array(upload.bytes)], { type: upload.mediaType }), upload.file.name);
    // Name only by hash: original filenames can contain the farmer's name.
    body.append("pinataMetadata", JSON.stringify({ name: `eudrpass-legal-${upload.sha256.slice(0, 16)}` }));
    body.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

    const res = await fetch(PINATA_PIN_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body,
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`Pinata ${res.status}: ${detail.slice(0, 300)}`);
      return Response.json({ error: `IPFS pinning failed (${res.status})` }, { status: 502 });
    }

    const { IpfsHash } = (await res.json()) as { IpfsHash?: string };
    if (!IpfsHash) {
      return Response.json({ error: "IPFS pinning returned no CID" }, { status: 502 });
    }

    const gateway = process.env.PINATA_GATEWAY || DEFAULT_GATEWAY;
    return Response.json({
      cid: IpfsHash,
      url: `${gateway.replace(/\/?$/, "/")}${IpfsHash}`,
      sha256: upload.sha256,
      pinned: true,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return Response.json({ error: "IPFS pinning timed out" }, { status: 504 });
    }
    return errorResponse(error);
  }
}
