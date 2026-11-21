import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Full-database backup as one self-describing JSON document.
//
// Every Prisma model is discovered from the generated schema metadata, so new
// models are included automatically. Each model carries its table name, field
// list (with database column names and types) and relations, so the file can be
// understood and re-imported years from now without this codebase.
//
// Values: Decimal -> string (exact, e.g. "123.45"), DateTime -> ISO 8601 UTC
// string, null stays null.

export const BACKUP_FORMAT = "healdton-service-center-backup";
export const BACKUP_FORMAT_VERSION = 1;

// Fields whose values are never written to a backup file. QuickBooks tokens
// grant access to the shop's accounting data; reconnecting restores them.
const REDACTED_FIELDS: Record<string, string[]> = {
  QuickBooksConnection: ["accessToken", "refreshToken"],
};

type ModelBackup = {
  table: string;
  primaryKey: string[];
  fields: {
    name: string;
    column: string;
    type: string;
    required: boolean;
    unique?: boolean;
    redacted?: boolean;
  }[];
  relations: {
    name: string;
    model: string;
    many: boolean;
    fields?: string[];
    references?: string[];
  }[];
  rowCount: number;
  rows: Record<string, unknown>[];
};

function delegateName(modelName: string) {
  return modelName[0].toLowerCase() + modelName.slice(1);
}

export async function buildDatabaseBackup(createdBy: string) {
  const models = Prisma.dmmf.datamodel.models;

  // One repeatable-read transaction so every table comes from the same
  // instant (an invoice can't appear without its line items, etc.).
  const rowsByModel = await prisma.$transaction(
    async (tx) => {
      const result: Record<string, Record<string, unknown>[]> = {};

      for (const model of models) {
        const idFields = model.fields.filter((field) => field.isId).map((field) => field.name);
        const delegate = (tx as unknown as Record<
          string,
          { findMany: (args: unknown) => Promise<Record<string, unknown>[]> }
        >)[delegateName(model.name)];

        result[model.name] = await delegate.findMany({
          orderBy: idFields.map((name) => ({ [name]: "asc" })),
        });
      }

      return result;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 60_000 },
  );

  const backupModels: Record<string, ModelBackup> = {};

  for (const model of models) {
    const redacted = new Set(REDACTED_FIELDS[model.name] ?? []);
    const scalarFields = model.fields.filter((field) => field.kind !== "object");
    const rows = rowsByModel[model.name].map((row) => {
      if (redacted.size === 0) return row;
      const copy = { ...row };
      for (const name of redacted) {
        if (name in copy) copy[name] = null;
      }
      return copy;
    });

    backupModels[model.name] = {
      table: model.dbName ?? model.name,
      primaryKey: model.fields.filter((field) => field.isId).map((field) => field.name),
      fields: scalarFields.map((field) => ({
        name: field.name,
        column: field.dbName ?? field.name,
        type: field.type,
        required: field.isRequired,
        ...(field.isUnique ? { unique: true } : {}),
        ...(redacted.has(field.name) ? { redacted: true } : {}),
      })),
      relations: model.fields
        .filter((field) => field.kind === "object")
        .map((field) => ({
          name: field.name,
          model: field.type,
          many: field.isList,
          ...(field.relationFromFields?.length
            ? {
                fields: [...field.relationFromFields],
                references: [...(field.relationToFields ?? [])],
              }
            : {}),
        })),
      rowCount: rows.length,
      rows,
    };
  }

  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAt: new Date().toISOString(),
    createdBy,
    readme: [
      "Full backup of the Healdton Service Center database (PostgreSQL via Prisma).",
      "models.<Name>.rows holds every row of that table, keyed by Prisma field name.",
      "models.<Name>.fields maps each field to its database column and type; relations show how tables link (fields -> references on the related model).",
      "Decimal values are exact strings (e.g. \"123.45\"); DateTime values are ISO 8601 UTC strings.",
      "Fields marked redacted (QuickBooks tokens) are intentionally null; reconnect QuickBooks after a restore.",
      "To restore: insert models in dependency order (parents before rows that reference them), then reset each table's id sequence to max(id).",
    ],
    models: backupModels,
  };
}
