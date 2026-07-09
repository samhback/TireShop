const DISCORD_API = "https://discord.com/api/v10";

const TEAM_NAMES = [
  "Roblox Warriors",
  "Dumpsville Dummies",
  "Bloxburg Buccaneers",
  "Redcliff Raiders",
  "Overseer Owls",
  "Las Vegas Valkyrie",
  "Lua Lions",
  "Darkheart Dragons",
  "Korblox Knights",
  "Bloxxer Bengals",
  "Stud City Spartans",
  "Barton Bruisers",
] as const;

type TeamName = (typeof TEAM_NAMES)[number];

interface Env {
  DB: D1Database;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_TOKEN: string;
  DISCORD_APPLICATION_ID: string;
}

interface DiscordUser {
  id: string;
  username?: string;
}

interface DiscordMember {
  user: DiscordUser;
  permissions?: string;
}

interface DiscordOption {
  name: string;
  type: number;
  value?: string | number | boolean;
  options?: DiscordOption[];
}

interface DiscordInteraction {
  id: string;
  type: number;
  guild_id?: string;
  channel_id?: string;
  token: string;
  member?: DiscordMember;
  data?: {
    id: string;
    name: string;
    custom_id?: string;
    options?: DiscordOption[];
  };
}

interface TeamRow {
  id: number;
  name: TeamName;
  role_id: string | null;
}

interface OfferRow {
  id: number;
  player_user_id: string;
  team_id: number;
  team_name: TeamName;
  role_id: string | null;
  contract_text: string;
  offered_by_user_id: string;
  status: string;
}

interface ContractRow {
  id: number;
  player_user_id: string;
  team_id: number;
  team_name: TeamName;
  role_id: string | null;
  contract_text: string;
  signed_at: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "GET") {
      return text("Roblox football league bot is running.");
    }

    if (request.method !== "POST") {
      return text("Method not allowed", 405);
    }

    const rawBody = await request.text();
    const valid = await verifyDiscordRequest(request, rawBody, env.DISCORD_PUBLIC_KEY);
    if (!valid) {
      return text("Bad request signature", 401);
    }

    const interaction = JSON.parse(rawBody) as DiscordInteraction;

    if (interaction.type === 1) {
      return json({ type: 1 });
    }

    try {
      if (interaction.type === 2) {
        return await handleCommand(interaction, env);
      }

      if (interaction.type === 3) {
        return await handleComponent(interaction, env);
      }

      return interactionMessage("Unsupported interaction.", true);
    } catch (error) {
      console.error(error);
      return interactionMessage("Something went wrong. Ask a league admin to check the bot logs.", true);
    }
  },
};

async function handleCommand(interaction: DiscordInteraction, env: Env): Promise<Response> {
  const command = interaction.data?.name;

  if (command === "offer") {
    return createOffer(interaction, env);
  }

  if (command === "release") {
    return releasePlayer(interaction, env, false);
  }

  if (command === "team") {
    return showTeam(interaction, env);
  }

  if (command === "teams") {
    return showTeams(env);
  }

  if (command === "player") {
    return showPlayer(interaction, env);
  }

  if (command === "offers") {
    return showOffers(interaction, env);
  }

  if (command === "transactions") {
    return showTransactions(interaction, env);
  }

  if (command === "admin") {
    return handleAdminCommand(interaction, env);
  }

  return interactionMessage("Unknown command.", true);
}

async function handleAdminCommand(interaction: DiscordInteraction, env: Env): Promise<Response> {
  if (!isGuildAdmin(interaction)) {
    return interactionMessage("Only server admins can use that command.", true);
  }

  const subcommand = interaction.data?.options?.[0];
  if (!subcommand) {
    return interactionMessage("Missing admin subcommand.", true);
  }

  if (subcommand.name === "set-coach") {
    const coachId = getStringOption(subcommand.options, "user");
    const teamName = getStringOption(subcommand.options, "team") as TeamName | null;
    if (!coachId || !teamName) {
      return interactionMessage("Missing coach or team.", true);
    }

    const team = await getTeamByName(env.DB, teamName);
    if (!team) {
      return interactionMessage("Unknown team.", true);
    }

    await env.DB.prepare(
      `INSERT INTO coaches (discord_user_id, team_id, assigned_by_user_id)
       VALUES (?, ?, ?)
       ON CONFLICT(discord_user_id)
       DO UPDATE SET team_id = excluded.team_id, assigned_by_user_id = excluded.assigned_by_user_id`
    ).bind(coachId, team.id, actorId(interaction)).run();

    return interactionMessage(`<@${coachId}> is now head coach of **${team.name}**.`);
  }

  if (subcommand.name === "set-team-role") {
    const roleId = getStringOption(subcommand.options, "role");
    const teamName = getStringOption(subcommand.options, "team") as TeamName | null;
    if (!roleId || !teamName) {
      return interactionMessage("Missing role or team.", true);
    }

    await env.DB.prepare("UPDATE teams SET role_id = ? WHERE name = ?").bind(roleId, teamName).run();
    return interactionMessage(`**${teamName}** is now mapped to <@&${roleId}>.`);
  }

  if (subcommand.name === "set-log-channel") {
    const channelId = getStringOption(subcommand.options, "channel");
    if (!channelId) {
      return interactionMessage("Missing channel.", true);
    }

    await setConfig(env.DB, "transaction_log_channel_id", channelId);
    return interactionMessage(`Transaction logs will post in <#${channelId}>.`);
  }

  if (subcommand.name === "force-release") {
    return releasePlayer(interaction, env, true, subcommand.options);
  }

  return interactionMessage("Unknown admin subcommand.", true);
}

async function createOffer(interaction: DiscordInteraction, env: Env): Promise<Response> {
  const guildId = interaction.guild_id;
  if (!guildId) {
    return interactionMessage("This command must be used in the league server.", true);
  }

  const coach = await getCoachTeam(env.DB, actorId(interaction));
  if (!coach) {
    return interactionMessage("You are not assigned as a head coach.", true);
  }

  if (!coach.role_id) {
    return interactionMessage(`No Discord role is mapped for **${coach.name}** yet. Ask an admin to run /admin set-team-role.`, true);
  }

  const playerId = getStringOption(interaction.data?.options, "player");
  const contractText = getStringOption(interaction.data?.options, "contract");
  if (!playerId || !contractText) {
    return interactionMessage("Missing player or contract text.", true);
  }

  if (playerId === actorId(interaction)) {
    return interactionMessage("You cannot offer yourself a contract.", true);
  }

  const existing = await getActiveContract(env.DB, playerId);
  if (existing) {
    return interactionMessage(`<@${playerId}> is already signed to **${existing.team_name}**.`, true);
  }

  const insert = await env.DB.prepare(
    `INSERT INTO offers (player_user_id, team_id, contract_text, offered_by_user_id)
     VALUES (?, ?, ?, ?)`
  ).bind(playerId, coach.id, contractText, actorId(interaction)).run();

  const offerId = Number(insert.meta.last_row_id);
  return json({
    type: 4,
    data: {
      content: `<@${playerId}>, you have a contract offer from **${coach.name}**.`,
      embeds: [
        {
          title: "Contract Offer",
          color: 0x2f80ed,
          fields: [
            { name: "Team", value: coach.name, inline: true },
            { name: "Head Coach", value: `<@${actorId(interaction)}>`, inline: true },
            { name: "Terms", value: truncate(contractText, 1024) },
          ],
        },
      ],
      components: [
        {
          type: 1,
          components: [
            { type: 2, style: 3, label: "Accept", custom_id: `offer_accept:${offerId}` },
            { type: 2, style: 4, label: "Decline", custom_id: `offer_decline:${offerId}` },
          ],
        },
      ],
      allowed_mentions: { users: [playerId, actorId(interaction)] },
    },
  });
}

async function releasePlayer(
  interaction: DiscordInteraction,
  env: Env,
  force: boolean,
  options = interaction.data?.options
): Promise<Response> {
  const guildId = interaction.guild_id;
  if (!guildId) {
    return interactionMessage("This command must be used in the league server.", true);
  }

  const playerId = getStringOption(options, "player");
  if (!playerId) {
    return interactionMessage("Missing player.", true);
  }

  const active = await getActiveContract(env.DB, playerId);
  if (!active) {
    return interactionMessage(`<@${playerId}> is not signed to a team.`, true);
  }

  if (!force) {
    const coach = await getCoachTeam(env.DB, actorId(interaction));
    if (!coach || coach.id !== active.team_id) {
      return interactionMessage("You can only release players from your own team.", true);
    }
  }

  if (active.role_id) {
    try {
      await removeGuildRole(env, guildId, playerId, active.role_id);
    } catch (error) {
      return interactionMessage(roleMutationErrorMessage(error, "remove", active.team_name), true);
    }
  }

  await env.DB.prepare(
    `UPDATE contracts
     SET status = 'released', released_at = datetime('now'), released_by_user_id = ?
     WHERE id = ? AND status = 'active'`
  ).bind(actorId(interaction), active.id).run();

  await env.DB.prepare(
    `INSERT INTO transactions (type, player_user_id, team_id, contract_id, actor_user_id, details)
     VALUES ('release', ?, ?, ?, ?, ?)`
  ).bind(playerId, active.team_id, active.id, actorId(interaction), force ? "Admin force-release" : "Coach release").run();

  await postTransactionLog(env, {
    guildId,
    title: "Player Released",
    description: `<@${playerId}> has been released by **${active.team_name}**.`,
    color: 0xc0392b,
  });

  return interactionMessage(`<@${playerId}> has been released by **${active.team_name}**.`);
}

async function showTeam(interaction: DiscordInteraction, env: Env): Promise<Response> {
  const teamName = getStringOption(interaction.data?.options, "team") as TeamName | null;
  if (!teamName) {
    return interactionMessage("Missing team.", true);
  }

  const team = await getTeamByName(env.DB, teamName);
  if (!team) {
    return interactionMessage("Unknown team.", true);
  }

  const players = await env.DB.prepare(
    `SELECT player_user_id, contract_text, signed_at
     FROM contracts
     WHERE team_id = ? AND status = 'active'
     ORDER BY signed_at ASC`
  ).bind(team.id).all<{ player_user_id: string; contract_text: string; signed_at: string }>();

  const roster = players.results.length
    ? players.results.map((player, index) => `${index + 1}. <@${player.player_user_id}> - ${truncate(player.contract_text, 120)}`).join("\n")
    : "No active players.";

  return interactionMessage(`**${team.name}**\n${roster}`);
}

async function showTeams(env: Env): Promise<Response> {
  const teams = await env.DB.prepare(
    `SELECT teams.name, COUNT(contracts.id) AS roster_count
     FROM teams
     LEFT JOIN contracts ON contracts.team_id = teams.id AND contracts.status = 'active'
     GROUP BY teams.id
     ORDER BY teams.id ASC`
  ).all<{ name: string; roster_count: number }>();

  const content = teams.results.map((team) => `**${team.name}** - ${team.roster_count}`).join("\n");
  return interactionMessage(content || "No teams found.");
}

async function showPlayer(interaction: DiscordInteraction, env: Env): Promise<Response> {
  const playerId = getStringOption(interaction.data?.options, "player");
  if (!playerId) {
    return interactionMessage("Missing player.", true);
  }

  const active = await getActiveContract(env.DB, playerId);
  if (!active) {
    return interactionMessage(`<@${playerId}> is not currently signed.`);
  }

  return interactionMessage(
    `<@${playerId}> is signed to **${active.team_name}**.\n` +
      `**Contract:** ${active.contract_text}\n` +
      `**Signed:** ${active.signed_at}`
  );
}

async function showOffers(interaction: DiscordInteraction, env: Env): Promise<Response> {
  const teamName = getStringOption(interaction.data?.options, "team") as TeamName | null;
  const playerId = getStringOption(interaction.data?.options, "player");

  const conditions = ["offers.status = 'pending'"];
  const bindings: string[] = [];
  if (teamName) {
    conditions.push("teams.name = ?");
    bindings.push(teamName);
  }
  if (playerId) {
    conditions.push("offers.player_user_id = ?");
    bindings.push(playerId);
  }

  const offers = await env.DB.prepare(
    `SELECT offers.id, offers.player_user_id, offers.contract_text, teams.name AS team_name
     FROM offers
     JOIN teams ON teams.id = offers.team_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY offers.created_at DESC
     LIMIT 15`
  ).bind(...bindings).all<{ id: number; player_user_id: string; contract_text: string; team_name: string }>();

  if (!offers.results.length) {
    return interactionMessage("No pending offers.");
  }

  return interactionMessage(
    offers.results
      .map((offer) => `#${offer.id} **${offer.team_name}** -> <@${offer.player_user_id}>: ${truncate(offer.contract_text, 120)}`)
      .join("\n")
  );
}

async function showTransactions(interaction: DiscordInteraction, env: Env): Promise<Response> {
  const limit = Math.min(Number(getNumberOption(interaction.data?.options, "limit") ?? 10), 20);
  const transactions = await env.DB.prepare(
    `SELECT transactions.type, transactions.player_user_id, transactions.created_at, teams.name AS team_name
     FROM transactions
     JOIN teams ON teams.id = transactions.team_id
     ORDER BY transactions.created_at DESC
     LIMIT ?`
  ).bind(limit).all<{ type: string; player_user_id: string; created_at: string; team_name: string }>();

  if (!transactions.results.length) {
    return interactionMessage("No transactions yet.");
  }

  return interactionMessage(
    transactions.results
      .map((tx) => `${tx.type === "signing" ? "Signed" : "Released"} <@${tx.player_user_id}> - **${tx.team_name}** (${tx.created_at})`)
      .join("\n")
  );
}

async function handleComponent(interaction: DiscordInteraction, env: Env): Promise<Response> {
  const customId = interaction.data?.custom_id;
  if (!customId) {
    return interactionMessage("Missing component id.", true);
  }

  const [action, rawOfferId] = customId.split(":");
  const offerId = Number(rawOfferId);
  if (!Number.isInteger(offerId)) {
    return interactionMessage("Invalid offer.", true);
  }

  if (action === "offer_accept") {
    return acceptOffer(interaction, env, offerId);
  }

  if (action === "offer_decline") {
    return declineOffer(interaction, env, offerId);
  }

  return interactionMessage("Unknown button.", true);
}

async function acceptOffer(interaction: DiscordInteraction, env: Env, offerId: number): Promise<Response> {
  const guildId = interaction.guild_id;
  if (!guildId) {
    return interactionMessage("This button must be used in the league server.", true);
  }

  const offer = await getPendingOffer(env.DB, offerId);
  if (!offer) {
    return updateMessage("This offer is no longer pending.");
  }

  if (offer.player_user_id !== actorId(interaction)) {
    return interactionMessage("Only the player who received this offer can accept it.", true);
  }

  if (!offer.role_id) {
    return interactionMessage(`No Discord role is mapped for **${offer.team_name}**. Ask an admin to fix the team role first.`, true);
  }

  const existing = await getActiveContract(env.DB, offer.player_user_id);
  if (existing) {
    await env.DB.prepare(
      "UPDATE offers SET status = 'canceled', responded_at = datetime('now') WHERE id = ? AND status = 'pending'"
    ).bind(offer.id).run();
    return updateMessage(`<@${offer.player_user_id}> is already signed to **${existing.team_name}**.`);
  }

  try {
    await addGuildRole(env, guildId, offer.player_user_id, offer.role_id);
  } catch (error) {
    return interactionMessage(roleMutationErrorMessage(error, "add", offer.team_name), true);
  }

  let contractId: number;
  try {
    const insert = await env.DB.prepare(
      `INSERT INTO contracts (player_user_id, team_id, contract_text, signed_by_user_id, offer_id)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(offer.player_user_id, offer.team_id, offer.contract_text, offer.offered_by_user_id, offer.id).run();
    contractId = Number(insert.meta.last_row_id);
  } catch (error) {
    await removeGuildRole(env, guildId, offer.player_user_id, offer.role_id);
    console.error(error);
    return interactionMessage("That player could not be signed because they may already have an active contract.", true);
  }

  await env.DB.prepare(
    "UPDATE offers SET status = 'accepted', responded_at = datetime('now') WHERE id = ?"
  ).bind(offer.id).run();
  await env.DB.prepare(
    `UPDATE offers
     SET status = 'canceled', responded_at = datetime('now')
     WHERE player_user_id = ? AND status = 'pending' AND id != ?`
  ).bind(offer.player_user_id, offer.id).run();
  await env.DB.prepare(
    `INSERT INTO transactions (type, player_user_id, team_id, contract_id, offer_id, actor_user_id, details)
     VALUES ('signing', ?, ?, ?, ?, ?, ?)`
  ).bind(offer.player_user_id, offer.team_id, contractId, offer.id, offer.offered_by_user_id, offer.contract_text).run();

  await postTransactionLog(env, {
    guildId,
    title: "Player Signed",
    description: `<@${offer.player_user_id}> has signed with **${offer.team_name}**.`,
    color: 0x27ae60,
  });

  return updateMessage(`<@${offer.player_user_id}> accepted the offer from **${offer.team_name}**.`);
}

async function declineOffer(interaction: DiscordInteraction, env: Env, offerId: number): Promise<Response> {
  const offer = await getPendingOffer(env.DB, offerId);
  if (!offer) {
    return updateMessage("This offer is no longer pending.");
  }

  if (offer.player_user_id !== actorId(interaction)) {
    return interactionMessage("Only the player who received this offer can decline it.", true);
  }

  await env.DB.prepare(
    "UPDATE offers SET status = 'declined', responded_at = datetime('now') WHERE id = ? AND status = 'pending'"
  ).bind(offer.id).run();

  return updateMessage(`<@${offer.player_user_id}> declined the offer from **${offer.team_name}**.`);
}

async function getTeamByName(db: D1Database, teamName: TeamName): Promise<TeamRow | null> {
  return db.prepare("SELECT id, name, role_id FROM teams WHERE name = ?").bind(teamName).first<TeamRow>();
}

async function getCoachTeam(db: D1Database, userId: string): Promise<TeamRow | null> {
  return db.prepare(
    `SELECT teams.id, teams.name, teams.role_id
     FROM coaches
     JOIN teams ON teams.id = coaches.team_id
     WHERE coaches.discord_user_id = ?`
  ).bind(userId).first<TeamRow>();
}

async function getActiveContract(db: D1Database, playerId: string): Promise<ContractRow | null> {
  return db.prepare(
    `SELECT contracts.id, contracts.player_user_id, contracts.team_id, teams.name AS team_name,
            teams.role_id, contracts.contract_text, contracts.signed_at
     FROM contracts
     JOIN teams ON teams.id = contracts.team_id
     WHERE contracts.player_user_id = ? AND contracts.status = 'active'`
  ).bind(playerId).first<ContractRow>();
}

async function getPendingOffer(db: D1Database, offerId: number): Promise<OfferRow | null> {
  return db.prepare(
    `SELECT offers.id, offers.player_user_id, offers.team_id, teams.name AS team_name,
            teams.role_id, offers.contract_text, offers.offered_by_user_id, offers.status
     FROM offers
     JOIN teams ON teams.id = offers.team_id
     WHERE offers.id = ? AND offers.status = 'pending'`
  ).bind(offerId).first<OfferRow>();
}

async function setConfig(db: D1Database, key: string, value: string): Promise<void> {
  await db.prepare(
    `INSERT INTO config (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).bind(key, value).run();
}

async function getConfig(db: D1Database, key: string): Promise<string | null> {
  const row = await db.prepare("SELECT value FROM config WHERE key = ?").bind(key).first<{ value: string }>();
  return row?.value ?? null;
}

async function postTransactionLog(
  env: Env,
  message: { guildId: string; title: string; description: string; color: number }
): Promise<void> {
  const channelId = await getConfig(env.DB, "transaction_log_channel_id");
  if (!channelId) {
    return;
  }

  try {
    await discordFetch(env, `/channels/${channelId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        embeds: [
          {
            title: message.title,
            description: message.description,
            color: message.color,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch (error) {
    console.error("Failed to post transaction log", error);
  }
}

async function addGuildRole(env: Env, guildId: string, userId: string, roleId: string): Promise<void> {
  await discordFetch(env, `/guilds/${guildId}/members/${userId}/roles/${roleId}`, { method: "PUT" });
}

async function removeGuildRole(env: Env, guildId: string, userId: string, roleId: string): Promise<void> {
  await discordFetch(env, `/guilds/${guildId}/members/${userId}/roles/${roleId}`, { method: "DELETE" });
}

async function discordFetch(env: Env, path: string, init: RequestInit): Promise<Response> {
  const response = await fetch(`${DISCORD_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${env.DISCORD_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new DiscordApiError(response.status, body, path);
  }

  return response;
}

class DiscordApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    readonly path: string
  ) {
    super(`Discord API ${status} on ${path}: ${body}`);
  }
}

function roleMutationErrorMessage(error: unknown, action: "add" | "remove", teamName: string): string {
  console.error(error);
  if (error instanceof DiscordApiError && error.status === 403) {
    return (
      `Discord blocked me from ${action === "add" ? "adding" : "removing"} the **${teamName}** role. ` +
      "Move my bot role above every team role in Server Settings > Roles, then try again."
    );
  }

  return `I could not ${action === "add" ? "add" : "remove"} the **${teamName}** role. Check my Manage Roles permission and role position.`;
}

async function verifyDiscordRequest(request: Request, rawBody: string, publicKeyHex: string): Promise<boolean> {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  if (!signature || !timestamp || !publicKeyHex) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(hexToBytes(publicKeyHex)),
    { name: "Ed25519" } as EcKeyImportParams,
    false,
    ["verify"]
  );

  const message = new TextEncoder().encode(timestamp + rawBody);
  return crypto.subtle.verify(
    { name: "Ed25519" } as EcdsaParams,
    key,
    toArrayBuffer(hexToBytes(signature)),
    toArrayBuffer(message)
  );
}

function actorId(interaction: DiscordInteraction): string {
  const userId = interaction.member?.user?.id;
  if (!userId) {
    throw new Error("Missing interaction member user id.");
  }
  return userId;
}

function isGuildAdmin(interaction: DiscordInteraction): boolean {
  const permissions = interaction.member?.permissions;
  if (!permissions) {
    return false;
  }
  return (BigInt(permissions) & 8n) === 8n;
}

function getStringOption(options: DiscordOption[] | undefined, name: string): string | null {
  const option = options?.find((item) => item.name === name);
  if (typeof option?.value === "string") {
    return option.value;
  }
  return null;
}

function getNumberOption(options: DiscordOption[] | undefined, name: string): number | null {
  const option = options?.find((item) => item.name === name);
  if (typeof option?.value === "number") {
    return option.value;
  }
  return null;
}

function interactionMessage(content: string, ephemeral = false): Response {
  return json({
    type: 4,
    data: {
      content,
      flags: ephemeral ? 64 : undefined,
      allowed_mentions: { parse: [] },
    },
  });
}

function updateMessage(content: string): Response {
  return json({
    type: 7,
    data: {
      content,
      embeds: [],
      components: [],
      allowed_mentions: { parse: [] },
    },
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function text(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

function hexToBytes(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g);
  if (!matches) {
    return new Uint8Array();
  }
  return new Uint8Array(matches.map((byte) => Number.parseInt(byte, 16)));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
