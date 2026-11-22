# EUDRPass

Lapisan settlement **mass-balance** untuk kopi petani kecil Indonesia agar lolos EUDR.
Setiap lahan didaftarkan sebagai **PlotPassport** (ERC-721 soulbound) dengan batas panen per musim
`capKg = luas (ha) × yield rate` (Ditjenbun 2024: arabika 877 kg/ha, robusta 807 kg/ha), dikunci saat registrasi.
Kontrak **menolak** setiap pengiriman yang membuat total musim sebuah lahan melebihi batasnya, dan setiap
pengiriman hanya bisa masuk satu shipment. Pembeli memverifikasi shipment lewat QR, tanpa wallet.

**Live:** https://eudrpass.vercel.app · contoh bukti: https://eudrpass.vercel.app/verify/1 · paspor lahan: https://eudrpass.vercel.app/plot/2

Screenshot aplikasi (diambil dari URL live, untuk materi presentasi) ada di `presentation/screenshots/`.

## Deploy aktif: Polygon Amoy (chain 80002)

| Kontrak | Alamat |
|---|---|
| PlotRegistry | [`0x65709b17AB09c8eaA88dA05b1563d1cEa9312b1a`](https://amoy.polygonscan.com/address/0x65709b17AB09c8eaA88dA05b1563d1cEa9312b1a) |
| DeliveryLedger | [`0xCE46ccD129fC308687804c8E0F3Ca3baE740B6E8`](https://amoy.polygonscan.com/address/0xCE46ccD129fC308687804c8E0F3Ca3baE740B6E8) |

### Yield rate di Amoy

Batas = luas × yield rate kode komoditas, dikunci saat registrasi. Selain angka nasional, kabupaten Gayo punya kode
sendiri (di-set dengan `setYieldRate`, tanpa deploy ulang). Form registrasi menyarankan kode kabupaten bila
kabupaten hasil ekstraksi AI cocok; default tetap nasional.

| Kode | Komoditas | kg/ha | Sumber |
|---|---|---|---|
| 1 / 2 | Arabika / Robusta, nasional | 877 / 807 | Ditjenbun 2024 |
| 11 / 21 | Arabika / Robusta, Aceh Tengah | 817 / 535 | BPS Aceh 2022 |
| 12 / 22 | Arabika / Robusta, Bener Meriah | 941 / 754 | BPS Aceh 2022 |
| 13 / 23 | Arabika / Robusta, Gayo Lues | 700 / 602 | BPS Aceh 2022 |

Data kabupaten: BPS Aceh, "Rata-rata Produktivitas Kopi Perkebunan Rakyat Menurut Kabupaten/Kota" (OpenData Aceh,
data.acehprov.go.id, dataset `produksi-kopi-perkebunan-rakyat-menurut-kabupaten-kota`), tahun 2022 (tahun terbaru
dengan pemisahan arabika/robusta). Label kode ada di `web/lib/contracts.ts`.

Deploy block `53418689`. Data uji di Amoy: plot #2 (1,00 ha arabika, dokumen di IPFS), delivery #1 600 kg,
shipment #1 → halaman `/verify/1`. Plot #1 memakai CID placeholder dari versi script lama.

## Struktur

```
contracts/   Foundry: PlotRegistry.sol, DeliveryLedger.sol, 37 test (unit, adversarial, fuzz), Deploy.s.sol
web/         Next.js 16 + wagmi/viem. Halaman: /register /deliver /ship /verify/[id] /plot/[id]
web/app/api  /api/ipfs (pin dokumen ke Pinata), /api/extract (baca SHM/SKT/STDB dengan Claude Haiku 5.5)
samples/     Dokumen contoh FIKTIF bertanda SPESIMEN untuk uji ekstraksi (cetak lalu foto)
  shm-contoh.pdf        SHM 1 halaman, 10.000 m² (dipakai plot seed)
  dokumen-contoh.*      SHM + SKT + STDB (3 halaman) untuk dicetak
  foto-simulasi/*.png   foto HP simulasi tiap dokumen: -mild (sedikit miring) dan -hard (miring, blur, redup, silau)
```

### Hasil uji ekstraksi (`/api/extract`, Claude Haiku 5.5, 21 Nov 2026)

| Foto | Waktu | Luas → `hectaresE2` | Catatan |
|---|---|---|---|
| shm-mild / shm-hard | 7 / 11 dtk | 10.000 m² → 100 | semua field benar |
| skt-mild / skt-hard | 10 / 13 dtk | 1,5 ha → 150 | benar; versi hard menandai nama & luas untuk review |
| stdb-mild / stdb-hard | 9 / 12 dtk | 85 are → 85 | hard: desa kosong, kecamatan salah, tetapi ditandai `needsReview` |

Luas (penentu batas panen) benar di 6/6 foto. Field yang salah selalu masuk `needsReview`, jadi petugas wajib
memeriksa sebelum mint. Ekstraksi butuh 7–13 detik.

## Menjalankan

**Kontrak**

```bash
cd contracts
forge test
# lokal
anvil
SEED_DEMO=true forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80   # key publik Anvil
```

Deploy testnet: isi `contracts/.env` (`PRIVATE_KEY`, `AMOY_RPC_URL`, `SEED_DEMO=true`; file ini di-gitignore), lalu
`forge script script/Deploy.s.sol --rpc-url $AMOY_RPC_URL --private-key $PRIVATE_KEY --broadcast`.
Plot seed memakai CID asli `samples/shm-contoh.pdf`; ganti dengan env `DEMO_DOC_CID` bila perlu.

**Web**

```bash
cd web
cp .env.example .env.local   # isi alamat kontrak, RPC, PINATA_JWT, ANTHROPIC_API_KEY
npm install
npm run dev
```

Tanpa `PINATA_JWT` dokumen tidak diunggah (CID diganti `sha256-…`); tanpa `ANTHROPIC_API_KEY` ekstraksi AI
mati dan form diisi manual. Keduanya opsional.

## Deploy web (Vercel)

Project Vercel di-import dari repo GitHub ini dengan **Root Directory `web`**. Setiap push ke `main` otomatis
deploy ulang. Env di Vercel (Settings → Environment Variables) sama dengan `web/.env.local`:
`NEXT_PUBLIC_CHAIN=amoy`, `NEXT_PUBLIC_RPC_URL`, `NEXT_PUBLIC_PLOT_REGISTRY`, `NEXT_PUBLIC_DELIVERY_LEDGER`,
`NEXT_PUBLIC_DEPLOY_BLOCK`, `PINATA_JWT`, `ANTHROPIC_API_KEY`. Variabel `NEXT_PUBLIC_*` dibaca saat build, jadi
setelah mengubahnya lakukan **Redeploy**.

`/api/extract` dan `/api/ipfs` di URL publik bisa dipanggil siapa saja dan memakai kredit Anthropic/Pinata kita:
pasang batas pengeluaran di console Anthropic, dan hapus env key-nya setelah hackathon.

## Catatan Amoy

- RPC bawaan `rpc-amoy.polygon.technology` tidak resolve. Pakai RPC Alchemy
  (`https://polygon-amoy.g.alchemy.com/v2/<key>`, buat app chain Polygon PoS di dashboard.alchemy.com) atau publik
  `https://polygon-amoy-bor-rpc.publicnode.com` / `https://polygon-amoy.drpc.org`. Pasang URL yang sama di
  `NEXT_PUBLIC_RPC_URL` **dan** di setting network MetaMask. RPC publik sesekali rate-limit ("Internal JSON-RPC
  error" di MetaMask); Alchemy lebih stabil. Key Alchemy ikut ke browser (`NEXT_PUBLIC_*`): bagikan lewat DM, bukan repo.
- QR dibuat dari `window.location.origin`. Dibuka di `localhost`, QR berisi `localhost` dan tidak bisa dipindai HP
  lain: untuk demo pakai URL Vercel (lihat bawah).
- Node Polygon menolak priority fee < 25 gwei; web mengirim fee sendiri (`web/lib/fees.ts`, tip ≥ 30 gwei).
- POL testnet: https://faucet.polygon.technology

## Alur demo

1. `/register`: unggah `samples/shm-contoh.pdf` → "Ekstrak dari foto" → periksa field → mint. Batas 877 kg.
2. `/deliver`: 600 kg → diterima. 300 kg → **DITOLAK** (900 > 877), MetaMask tidak terbuka.
3. `/ship`: kapalkan delivery → shipment + QR. Kapalkan ulang → ditolak.
4. Buka `/verify/{id}` di jendela privat tanpa wallet → TERVERIFIKASI, bukti per lahan, dokumen di IPFS.

## Privasi

Nama pemilik dan dokumen tidak pernah masuk chain; yang disimpan hanya CID dokumen dan hash lokasi (`bytes12`).
Ekstraksi memakai Claude API (data tidak dipakai untuk training secara default); nilai hasil ekstraksi tidak di-log.
