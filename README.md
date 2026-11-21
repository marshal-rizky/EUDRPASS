# EUDRPass

Lapisan settlement **mass-balance** untuk kopi petani kecil Indonesia agar lolos EUDR.
Setiap lahan didaftarkan sebagai **PlotPassport** (ERC-721 soulbound) dengan batas panen per musim
`capKg = luas (ha) × yield rate` (Ditjenbun 2024: arabika 877 kg/ha, robusta 807 kg/ha), dikunci saat registrasi.
Kontrak **menolak** setiap pengiriman yang membuat total musim sebuah lahan melebihi batasnya, dan setiap
pengiriman hanya bisa masuk satu shipment. Pembeli memverifikasi shipment lewat QR, tanpa wallet.

## Deploy aktif: Polygon Amoy (chain 80002)

| Kontrak | Alamat |
|---|---|
| PlotRegistry | [`0x65709b17AB09c8eaA88dA05b1563d1cEa9312b1a`](https://amoy.polygonscan.com/address/0x65709b17AB09c8eaA88dA05b1563d1cEa9312b1a) |
| DeliveryLedger | [`0xCE46ccD129fC308687804c8E0F3Ca3baE740B6E8`](https://amoy.polygonscan.com/address/0xCE46ccD129fC308687804c8E0F3Ca3baE740B6E8) |

Deploy block `53418689`. Data uji di Amoy: plot #2 (1,00 ha arabika, dokumen di IPFS), delivery #1 600 kg,
shipment #1 → halaman `/verify/1`. Plot #1 memakai CID placeholder dari versi script lama.

## Struktur

```
contracts/   Foundry: PlotRegistry.sol, DeliveryLedger.sol, 37 test (unit, adversarial, fuzz), Deploy.s.sol
web/         Next.js 16 + wagmi/viem. Halaman: /register /deliver /ship /verify/[id] /plot/[id]
web/app/api  /api/ipfs (pin dokumen ke Pinata), /api/extract (baca SHM/SKT/STDB dengan Claude Haiku 5.5)
samples/     Dokumen contoh FIKTIF bertanda SPESIMEN untuk uji ekstraksi (cetak lalu foto)
```

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

## Catatan Amoy

- RPC bawaan `rpc-amoy.polygon.technology` tidak resolve. Pakai `https://polygon-amoy-bor-rpc.publicnode.com`
  atau `https://polygon-amoy.drpc.org` (juga di setting network MetaMask). Untuk demo, RPC Alchemy lebih stabil.
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
