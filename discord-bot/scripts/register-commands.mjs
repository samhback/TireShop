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
];

const teamChoices = TEAM_NAMES.map((name) => ({ name, value: name }));

const commands = [
  {
    name: "offer",
    description: "Offer a player a contract from your assigned team.",
    options: [
      {
        name: "player",
        description: "Player receiving the offer.",
        type: 6,
        required: true,
      },
      {
        name: "contract",
        description: "Contract terms.",
        type: 3,
        required: true,
        max_length: 1000,
      },
    ],
  },
  {
    name: "release",
    description: "Release a player from your assigned team.",
    options: [
      {
        name: "player",
        description: "Player to release.",
        type: 6,
        required: true,
      },
    ],
  },
  {
    name: "team",
    description: "Show one team roster.",
    options: [
      {
        name: "team",
        description: "Team to display.",
        type: 3,
        required: true,
        choices: teamChoices,
      },
    ],
  },
  {
    name: "teams",
    description: "Show roster counts for all teams.",
  },
  {
    name: "player",
    description: "Show a player's current team and contract.",
    options: [
      {
        name: "player",
        description: "Player to display.",
        type: 6,
        required: true,
      },
    ],
  },
  {
    name: "offers",
    description: "Show pending offers.",
    options: [
      {
        name: "team",
        description: "Filter by team.",
        type: 3,
        required: false,
        choices: teamChoices,
      },
      {
        name: "player",
        description: "Filter by player.",
        type: 6,
        required: false,
      },
    ],
  },
  {
    name: "transactions",
    description: "Show recent signings and releases.",
    options: [
      {
        name: "limit",
        description: "Number of transactions to show.",
        type: 4,
        required: false,
        min_value: 1,
        max_value: 20,
      },
    ],
  },
  {
    name: "admin",
    description: "League admin tools.",
    default_member_permissions: "8",
    options: [
      {
        name: "set-coach",
        description: "Assign a head coach to a team.",
        type: 1,
        options: [
          {
            name: "user",
            description: "Head coach.",
            type: 6,
            required: true,
          },
          {
            name: "team",
            description: "Team.",
            type: 3,
            required: true,
            choices: teamChoices,
          },
        ],
      },
      {
        name: "set-team-role",
        description: "Map a team to its Discord role.",
        type: 1,
        options: [
          {
            name: "team",
            description: "Team.",
            type: 3,
            required: true,
            choices: teamChoices,
          },
          {
            name: "role",
            description: "Discord team role.",
            type: 8,
            required: true,
          },
        ],
      },
      {
        name: "set-log-channel",
        description: "Set the transaction log channel.",
        type: 1,
        options: [
          {
            name: "channel",
            description: "Channel for signing and release logs.",
            type: 7,
            required: true,
            channel_types: [0],
          },
        ],
      },
      {
        name: "force-release",
        description: "Admin release for fixing roster state.",
        type: 1,
        options: [
          {
            name: "player",
            description: "Player to release.",
            type: 6,
            required: true,
          },
        ],
      },
    ],
  },
];

const token = process.env.DISCORD_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !applicationId || !guildId) {
  console.error("Set DISCORD_TOKEN, DISCORD_APPLICATION_ID, and DISCORD_GUILD_ID before registering commands.");
  process.exit(1);
}

const response = await fetch(`${DISCORD_API}/applications/${applicationId}/guilds/${guildId}/commands`, {
  method: "PUT",
  headers: {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(commands),
});

if (!response.ok) {
  console.error(`Discord returned ${response.status}: ${await response.text()}`);
  process.exit(1);
}

const result = await response.json();
console.log(`Registered ${result.length} guild commands.`);
