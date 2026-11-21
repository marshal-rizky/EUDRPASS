# EUDRPass — Tugas Teammate (Frontend `web/`)

Dokumen ini adalah spesifikasi pekerjaan untuk teammate selama babak 24 jam,
plus **kriteria wajib sebelum merge ke `main`**. Baca sampai habis sebelum mulai.

---

## 0. Aturan main

1. **Kerja di branch `web`**, jangan langsung di `main`.
2. **Jangan copy kode dari repo rehearsal.** Semua kode ditulis ulang selama lomba (syarat kepatuhan).
   Yang boleh dipakai hanya *pelajaran* (lihat §6).
3. **Kepemilikan folder** (supaya merge tidak konflik):

   | Pemilik | Folder |
   |---|---|
   | **Teammate** | `web/app/**` (kecuali `web/app/api/**`), `web/components/**`, `web/lib/**` (kecuali `web/lib/abi/**`), `web/public/**` |
   | **Marshal** | `contracts/**`, `web/lib/abi/**` (hasil generate), `web/app/api/**`, `README.md` |

   Perlu ubah file milik orang lain? Bilang dulu di chat.
4. **Jangan commit** `.env.local`, private key, API key, atau `node_modules`.
5. Hanya teammate yang menambah dependency npm (biar `package-lock.json` tidak konflik).
   Dependency yang sudah terpasang: `next@16.3.4`, `react@19`, `wagmi@3`, `viem@2`,
   `@tanstack/react-query@5`, `zod@4`, `qrcode.react@4`, `tailwindcss@4`.

---

## 1. Setup

```bash
git clone https://github.com/marshal-rizky/EUDRPASS.git
cd EUDRPASS
git checkout -b web

# frontend (bisa lama di Windows, mulai duluan)
cd web && npm install

# kontrak (butuh Foundry: https://getfoundry.sh)
cd ../contracts
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 foundry-rs/forge-std --no-git
forge test
```

### Chain lokal untuk development

```bash
# terminal 1
anvil

# terminal 2 (dari folder contracts/)
SEED_DEMO=true forge script script/Deploy.s.sol \
  --rpc-url http://127.0.0.1:8545 --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

Key di atas adalah **akun default Anvil yang publik**, aman hanya untuk chain lokal.
Script mencetak alamat kontrak. Salin ke `web/.env.local` (format di `web/.env.example`):

```
NEXT_PUBLIC_CHAIN=anvil            # anvil | amoy
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_PLOT_REGISTRY=0x...
NEXT_PUBLIC_DELIVERY_LEDGER=0x...
```

MetaMask: tambah network Anvil (RPC `http://127.0.0.1:8545`, chain id `31337`), import key di atas.
Kalau Anvil di-restart: MetaMask → Settings → Advanced → *Clear activity tab data* (nonce mismatch).

Alamat Polygon Amoy akan dikirim Marshal lewat chat setelah deploy.

---

## 2. Interface kontrak (sumber kebenaran: `contracts/src/`)

ABI tersedia sebagai TypeScript `as const` di `web/lib/abi/`:
`plotRegistryAbi`, `deliveryLedgerAbi`. **Jangan edit manual**, Marshal yang regenerate.

### PlotRegistry
| Fungsi | Siapa | Catatan |
|---|---|---|
| `registerPlot(string docCID, bytes12 locationHash, uint32 hectaresE2, uint8 commodity, string declarationId) → plotId` | COOPERATIVE_ROLE | `hectaresE2` = hektare × 100 (1,00 ha = `100`). Range 10..5000 |
| `getPlot(plotId) → Plot` | publik | struct: `docCID, locationHash, hectaresE2, commodity, yieldRateUsed, capKg, registeredAt, revoked, cooperative, declarationId` |
| `capKg(plotId)`, `isRevoked(plotId)`, `plotCount()` | publik | |
| `yieldRate(commodity) → kg/ha` | publik | `1` = arabika (877), `2` = robusta (807) |
| `revokePlot(plotId, reason)` | koperasi penerbit / admin | status, bukan hapus |
| `revocationReason(plotId)` | publik | |

Event: `PlotRegistered(plotId indexed, cooperative indexed, commodity, hectaresE2, capKg, declarationId)`.

### DeliveryLedger
| Fungsi | Siapa | Catatan |
|---|---|---|
| `recordDelivery(uint256 plotId, uint16 season, uint64 kg) → deliveryId` | COLLECTOR_ROLE | season = tahun, mis. `2026` |
| `deliveredKg(plotId, season)` | publik | total kumulatif musim |
| `getDelivery(id) → Delivery` | publik | `plotId, season, kg, timestamp, collector, shipmentId` (0 = belum dikapalkan) |
| `deliveryCount()`, `shipmentCount()` | publik | |
| `unshippedDeliveries(fromId, toId) → uint256[]` | publik | daftar delivery yang masih bisa dibundel |
| `assembleShipment(uint256[] deliveryIds) → shipmentId` | EXPORTER_ROLE | |
| `getShipment(id) → Shipment` | publik | `exporter, createdAt, totalKg, deliveryIds[]` |
| `getShipmentProof(id) → (Shipment, ProofLine[])` | publik | **satu call untuk seluruh halaman verifikasi**. `ProofLine = { deliveryId, delivery, plot, seasonDeliveredKg }` |

Events: `Delivered(deliveryId indexed, plotId indexed, season indexed, kg, seasonTotalKg, collector)`,
`Shipped(shipmentId indexed, exporter indexed, deliveryCount, totalKg)`.

### Custom error → pesan UI (wajib di-decode, jangan tampilkan hex)
| Error | Pesan |
|---|---|
| `MassBalanceExceeded(plotId, attemptedTotal, capKg)` | **"DITOLAK — akan membuat total musim lahan #{plotId} menjadi {attemptedTotal} kg, batasnya {capKg} kg"**. `attemptedTotal` = total kumulatif, BUKAN input kg |
| `PlotRevoked(plotId)` | "DITOLAK — lahan #{plotId} sudah dicabut" |
| `UnknownPlot(plotId)` | "Lahan #{plotId} tidak terdaftar" |
| `ZeroQuantity()` | "Berat harus lebih dari 0 kg" |
| `DeliveryAlreadyShipped(deliveryId, shipmentId)` | "DITOLAK — pengiriman #{deliveryId} sudah dipakai di shipment #{shipmentId}" |
| `UnknownDelivery(id)` / `UnknownShipment(id)` | "Pengiriman/Shipment #{id} tidak ditemukan" |
| `EmptyShipment()` | "Pilih minimal satu pengiriman" |
| `InvalidArea(hectaresE2)` | "Luas harus 0,1–50 ha" |
| `UnknownCommodity(c)` / `EmptyDeclaration()` | "Komoditas tidak dikenal" / "ID deklarasi wajib diisi" |
| `AccessControlUnauthorizedAccount(account, role)` | "Wallet ini tidak punya peran {nama role}" |
| `PlotIsSoulbound()` | "PlotPassport tidak dapat dipindahtangankan" |
| panic tanpa nama | "DITOLAK — nilai di luar rentang" (jangan pernah tampil "undefined") |

### API server (dikerjakan Marshal, pakai kontrak ini)
**Sudah tersedia** (`web/app/api/`). Keduanya menerima multipart field `file`: JPEG / PNG / WebP / PDF, maks 10 MB.

**`POST /api/ipfs`** → 200
```ts
{ cid: string; url: string | null; sha256: string; pinned: boolean }
```
- Dengan `PINATA_JWT`: file di-pin, `cid` = CID IPFS asli, `url` = link gateway, `pinned: true`.
- Tanpa `PINATA_JWT` (dev lokal): **tidak diunggah ke mana pun**; `cid = "sha256-<hex>"`, `url: null`, `pinned: false`.
  UI wajib menampilkan status ini dengan jujur (mis. badge "belum di-pin"), jangan tampilkan link palsu.
- `cid` inilah yang dikirim ke `registerPlot(docCID, ...)`.

**`POST /api/extract`** → 200
```ts
{
  fields: {
    docType: "SHM" | "SKT" | "STDB" | "OTHER" | "UNREADABLE";
    parcelId: string | null; ownerName: string | null;
    areaValue: number | null; areaUnit: "m2" | "ha" | "are" | null;
    areaHa: number | null;            // sudah dikonversi + dibulatkan 2 desimal → hectaresE2 = round(areaHa*100)
    village: string | null; district: string | null; regency: string | null;
  };
  confidence: { docType; parcelId; ownerName; area; village; district; regency: number }; // 0..1
  needsReview: string[];   // nama field yang WAJIB dicek manual (confidence < 0.8, kosong, atau di luar 0,1–50 ha)
  issues: string[];        // pesan validasi siap tampil (Bahasa Indonesia)
  notes: string; model: string;
}
```
- Error: `400/413/415` upload salah, `422` dokumen ditolak model, `429` rate limit, `502` ekstraksi gagal,
  `503` layanan AI tidak tersedia/belum dikonfigurasi. Semua error berbentuk `{ error: string }` (pesan siap tampil).
- Butuh 5–20 detik → tampilkan loading. **Apa pun errornya, form manual tetap bisa dipakai** (F2 sidecar yang bisa dilepas).
- `ownerName` adalah data pribadi: tampilkan untuk dicek petugas, **jangan pernah** dikirim ke chain atau disimpan.

---

## 3. Pekerjaan (urut prioritas)

### W1 — Fondasi (H0–H2)
- `web/lib/env.ts`: baca & **validasi** env (alamat `^0x[0-9a-fA-F]{40}$`), lempar error yang menyebut nama variabelnya.
- `web/lib/chain.ts`: definisi chain `anvil` (31337) dan `polygonAmoy` (80002, dari `viem/chains`), pilih via `NEXT_PUBLIC_CHAIN`.
  Export `wagmiConfig` (connector `injected()`, `ssr: true`) **dan** `publicClient` viem terpisah (untuk halaman tanpa wallet).
- `web/lib/errors.ts`: `decodeContractError(err): string` sesuai tabel §2. Dipakai di semua layar tulis.
- `web/app/providers.tsx` + layout: header dengan nav (Registrasi, Pengiriman, Shipment) + tombol connect wallet + chip peran wallet (cek `hasRole`).
- Landing `/`: pitch 1 kalimat + 3 kartu peran + kolom "Verifikasi shipment #" → `/verify/[id]`.
- Ganti metadata default ("Create Next App") jadi EUDRPass.

### W2 — Layar 1: Registrasi Lahan `/register` (F1)
- Input: unggah dokumen legalitas, **pilihan lokasi** (geohash/koordinat poligon **atau** alamat pos, sesuai Reg 2025/2650; alamat → `keccak256` dipotong ke `bytes12`), luas (ha, desimal → `hectaresE2`), komoditas (arabika/robusta), ID deklarasi EUDR.
- Pratinjau batas **dibaca dari chain**: `yieldRate(commodity)` → tampilkan aritmetika `1,00 ha × 877 kg/ha = 877 kg`.
- (Jika `/api/extract` tersedia) tombol "Ekstrak dari foto" → isi field otomatis, field dengan `needsReview` di-highlight dan **wajib dicentang petugas** sebelum tombol mint aktif. Model tidak pernah menulis ke chain.
- Submit → tunggu **receipt** → decode event `PlotRegistered` → tampilkan `plotId` + **QR yang bisa dicetak** ke `/plot/{id}`.

### W3 — Layar 2: Pencatatan Pengiriman `/deliver` (F3) — INTI DEMO
- Input: plot ID (atau scan QR, opsional), musim (default tahun berjalan), kg.
- Panel lahan: komoditas, luas, **batas**, **terkirim musim ini**, **sisa**, progress bar.
- **Simulasi dulu** (`simulateContract` / `useSimulateContract`) → kalau revert, tampilkan pesan DITOLAK besar & merah **tanpa membuka MetaMask**.
- Sukses hanya ditampilkan **setelah receipt**, dengan hash + link block explorer (Amoy: `https://amoy.polygonscan.com/tx/{hash}`).
- Setelah sukses, angka terkirim/sisa ter-refresh otomatis.

### W4 — Layar 3: Penyusunan Shipment `/ship` (F4)
- Daftar delivery belum dikapalkan via `unshippedDeliveries(1, deliveryCount)` + detail tiap baris (plot, musim, kg) dengan checkbox.
- Total kg terpilih tampil live.
- Submit → receipt → decode `Shipped` → shipment ID **yang sebenarnya** + QR + link `/verify/{id}`.
- Double-spend (pilih delivery yang sudah dipakai, mis. via input manual ID) → pesan `DeliveryAlreadyShipped` terbaca.

### W5 — Halaman Verifikasi Publik `/verify/[id]` (F5) — KLAIM DIFERENSIASI
- **Tanpa wallet sama sekali**: pakai `publicClient.readContract(getShipmentProof)`, **jangan** pakai hook wagmi di halaman ini.
- Next 16: `params` adalah Promise → `await params` (server component) atau `use(params)` (client).
- Tampilkan per baris: delivery ID, kg, musim, waktu blok, pengepul; lahan asal (ID, komoditas, luas, lokasi hash), **ID deklarasi EUDR**, link dokumen IPFS (`https://gateway.pinata.cloud/ipfs/{cid}`), status dicabut (badge merah + alasan).
- **Bukti mass-balance per lahan**: `terkirim musim {seasonDeliveredKg} kg ≤ batas {capKg} kg` dengan asal-usul batas `{hectaresE2/100} ha × {yieldRateUsed} kg/ha` tercetak di sebelahnya.
- Header: total konsinyasi, eksportir, waktu dibuat, QR halaman ini.
- Shipment tidak ada → pesan ramah, bukan crash.
- Layout mobile-first (juri akan scan QR dari HP).

### W6 — Paspor Lahan `/plot/[id]` (nice to have)
- Publik, tanpa wallet: data `getPlot`, terkirim per musim, QR besar untuk dicetak/ditempel petani.

### W7 — Polish (H18–H21)
- Tema konsisten (hijau/kopi), loading state & skeleton, empty state, responsif 375px.
- Tidak ada teks bawaan template Next.js tersisa.

---

## 4. Kriteria WAJIB sebelum merge ke `main` (Definition of Done)

Merge hanya jika **semua** tercentang. Tulis hasilnya di deskripsi PR.

### Build & kualitas
- [ ] `npm run build` sukses tanpa error.
- [ ] `npm run lint` tanpa error.
- [ ] `npx tsc --noEmit` tanpa error.
- [ ] Tidak ada `any` / `as unknown as` untuk data kontrak (pakai inferensi ABI `as const`).
- [ ] Tidak ada alamat kontrak, RPC key, atau private key yang di-hardcode; semua dari env yang divalidasi.
- [ ] `.env.local` tidak ikut ter-commit (`git status` bersih dari file env).
- [ ] Hanya file di folder milik teammate yang berubah (`git diff --stat main...web`).
- [ ] Branch sudah di-rebase/merge dengan `main` terbaru dan masih build.

### Uji manual di Anvil (dari deploy bersih dengan `SEED_DEMO=true`)
- [ ] Connect MetaMask di `/register` tanpa hydration error di console.
- [ ] Registrasi lahan 1,00 ha arabika → pratinjau menampilkan `877 kg`, mint sukses, plot ID + QR muncul.
- [ ] `/deliver` plot 1: kirim **600 kg** → DITERIMA setelah receipt, terkirim jadi 600, sisa 277.
- [ ] Kirim **300 kg** → tampil persis: *"DITOLAK — akan membuat total musim lahan #1 menjadi 900 kg, batasnya 877 kg"*, **MetaMask tidak terbuka**, terkirim tetap 600.
- [ ] `/ship`: pilih delivery 1 → shipment dibuat, link mengarah ke ID shipment yang benar.
- [ ] Coba kapalkan delivery 1 lagi → pesan `DeliveryAlreadyShipped` terbaca (bukan hex).
- [ ] `/verify/1` terbuka di **jendela incognito tanpa ekstensi MetaMask** dan merender penuh (tidak loading selamanya). Hard refresh tetap jalan.
- [ ] `/verify/999` → pesan "tidak ditemukan", bukan crash.
- [ ] Tidak ada teks "undefined", "NaN", atau blob hex di UI mana pun.
- [ ] Semua halaman rapi di lebar 375px (DevTools mobile).
- [ ] Jika `/api/extract` mati/error, registrasi manual tetap bisa.

### Bukti di PR
- [ ] Screenshot: penolakan 900/877, halaman verify (desktop + mobile), QR.
- [ ] Catat bug/kejutan baru di bagian "Temuan" deskripsi PR.

---

## 5. Jadwal & sinkronisasi

| Jam | Target teammate | Sync |
|---|---|---|
| H0–H2 | W1 | ABI + alamat Anvil siap dari Marshal |
| H2–H6 | W2 | |
| H6–H10 | W3 | **Merge #1** (W1–W3) |
| H10–H14 | W4 | Alamat Amoy dari Marshal |
| H14–H18 | W5 (+W6) | **Merge #2**, uji di Amoy |
| H18–H21 | W7 + gladi | **Merge #3**, code freeze H21 |

Merge kecil dan sering lebih baik daripada satu merge besar di akhir.

---

## 6. Pelajaran rehearsal (level tooling, boleh dipakai)

- `npm install` di Windows bisa ~30 menit → jalankan paling awal.
- Next 16: `params` di route dinamis adalah **Promise**; `tsc` tidak menangkap kesalahan ini, hanya error saat runtime.
- `process.env.X as \`0x${string}\`` hanya cast compile-time; env yang hilang jadi `undefined` diam-diam → validasi di runtime.
- ABI yang di-import dari `.json` kehilangan inferensi tipe wagmi → pakai file `.ts` dengan `as const` (sudah disediakan).
- Revert custom error terjadi saat **estimasi gas**, sebelum transaksi dikirim → tidak ada tx hash. Decode dengan
  `err.walk(e => e instanceof ContractFunctionRevertedError)` lalu `data.errorName` / `data.args`.
- Connector `injected()` tanpa ekstensi bisa membuat hook baca wagmi menggantung → halaman publik pakai `publicClient` viem langsung.
- Dev server Next di Windows lambat (~20 detik start, warning "Slow filesystem") → normal.
- `next build` ~4 menit di laptop ini → jangan build pertama kali saat mepet freeze.
