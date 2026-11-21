import {
  BaseError,
  ContractFunctionRevertedError,
  UserRejectedRequestError,
  decodeErrorResult,
  type Hex,
} from "viem";
import { eudrPassErrorsAbi } from "./abi";
import { ROLE_LABEL } from "./contracts";
import { fmtNum } from "./format";

const OUT_OF_RANGE = "DITOLAK — nilai di luar rentang";

function arg(args: readonly unknown[], i: number): string {
  const v = args[i];
  if (typeof v === "bigint" || typeof v === "number") return fmtNum(v);
  if (typeof v === "string") return v;
  return "?";
}

/** Maps a decoded custom error to the UI message from TEAMMATE-TASKS §2. */
export function messageForError(name: string, args: readonly unknown[]): string {
  switch (name) {
    case "MassBalanceExceeded":
      return `DITOLAK — akan membuat total musim lahan #${arg(args, 0)} menjadi ${arg(args, 1)} kg, batasnya ${arg(args, 2)} kg`;
    case "PlotRevoked":
      return `DITOLAK — lahan #${arg(args, 0)} sudah dicabut`;
    case "UnknownPlot":
      return `Lahan #${arg(args, 0)} tidak terdaftar`;
    case "ZeroQuantity":
      return "Berat harus lebih dari 0 kg";
    case "DeliveryAlreadyShipped":
      return `DITOLAK — pengiriman #${arg(args, 0)} sudah dipakai di shipment #${arg(args, 1)}`;
    case "UnknownDelivery":
      return `Pengiriman #${arg(args, 0)} tidak ditemukan`;
    case "UnknownShipment":
      return `Shipment #${arg(args, 0)} tidak ditemukan`;
    case "EmptyShipment":
      return "Pilih minimal satu pengiriman";
    case "InvalidArea":
      return "Luas harus 0,1–50 ha";
    case "UnknownCommodity":
      return "Komoditas tidak dikenal";
    case "EmptyDeclaration":
      return "ID deklarasi wajib diisi";
    case "AccessControlUnauthorizedAccount": {
      const role = typeof args[1] === "string" ? ROLE_LABEL[args[1].toLowerCase()] : undefined;
      return `Wallet ini tidak punya peran ${role ?? "yang dibutuhkan"}`;
    }
    case "PlotIsSoulbound":
      return "PlotPassport tidak dapat dipindahtangankan";
    case "AlreadyRevoked":
      return `Lahan #${arg(args, 0)} sudah dicabut sebelumnya`;
    case "NotPlotAuthority":
      return `Wallet ini bukan koperasi penerbit lahan #${arg(args, 1)}`;
    default:
      return OUT_OF_RANGE;
  }
}

function decodeRaw(raw: Hex | undefined): { name: string; args: readonly unknown[] } | null {
  if (!raw || raw === "0x") return null;
  try {
    const d = decodeErrorResult({ abi: eudrPassErrorsAbi, data: raw });
    return { name: d.errorName, args: d.args ?? [] };
  } catch {
    return null;
  }
}

/** Turns any viem/wagmi/wallet error into a readable Indonesian message. Never returns hex. */
export function decodeContractError(err: unknown): string {
  if (err instanceof BaseError) {
    if (err.walk((e) => e instanceof UserRejectedRequestError)) {
      return "Transaksi dibatalkan di wallet";
    }
    const reverted = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName;
      if (name && name !== "Panic" && name !== "Error") {
        return messageForError(name, reverted.data?.args ?? []);
      }
      const fromRaw = decodeRaw(reverted.raw);
      if (fromRaw) return messageForError(fromRaw.name, fromRaw.args);
      return OUT_OF_RANGE;
    }
    const text = `${err.shortMessage} ${err.details ?? ""}`;
    if (/fetch failed|HTTP request failed|ECONNREFUSED|Failed to fetch/i.test(text)) {
      return "Tidak dapat terhubung ke jaringan blockchain. Pastikan node (Anvil/RPC) berjalan.";
    }
    if (/does not match the target chain|chain mismatch/i.test(text)) {
      return "Wallet terhubung ke jaringan lain. Ganti jaringan di wallet lalu coba lagi.";
    }
    if (/nonce/i.test(text)) {
      return "Nonce wallet tidak cocok. MetaMask → Settings → Advanced → Clear activity tab data.";
    }
    return err.shortMessage.replace(/0x[0-9a-fA-F]{16,}/g, "…");
  }
  if (err instanceof Error) return err.message.replace(/0x[0-9a-fA-F]{16,}/g, "…");
  return "Terjadi kesalahan yang tidak dikenal";
}

/** True when a read reverted with the given custom error name (e.g. "UnknownShipment"). */
export function isContractError(err: unknown, name: string): boolean {
  if (!(err instanceof BaseError)) return false;
  const reverted = err.walk((e) => e instanceof ContractFunctionRevertedError);
  if (!(reverted instanceof ContractFunctionRevertedError)) return false;
  return (reverted.data?.errorName ?? decodeRaw(reverted.raw)?.name) === name;
}
