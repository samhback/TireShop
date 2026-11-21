import { NextResponse } from "next/server";
import { buildDatabaseBackup } from "@/lib/backup";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CHUNK_SIZE = 256 * 1024;

function timestampForFilename(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}-${part("hour")}${part("minute")}`;
}

export async function GET() {
  const admin = await getAdminSession();

  if (!admin) {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const backup = await buildDatabaseBackup(admin);
  const body = new TextEncoder().encode(JSON.stringify(backup, null, 1));

  // Streamed in chunks so the download isn't capped by the platform's
  // single-response body size limit as the shop's data grows.
  let offset = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= body.length) {
        controller.close();
        return;
      }
      controller.enqueue(body.subarray(offset, offset + CHUNK_SIZE));
      offset += CHUNK_SIZE;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="healdton-backup-${timestampForFilename(new Date())}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
