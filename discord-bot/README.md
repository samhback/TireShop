# Roblox Football League Discord Bot

Cloudflare Worker Discord bot for managing signings and releases for 12 Roblox football teams.

## Commands

- `/offer player contract` - head coach sends a contract offer to a player.
- `/release player` - head coach releases a player from their own team.
- `/team team` - shows one roster.
- `/teams` - shows all roster counts.
- `/player player` - shows a player's active contract.
- `/offers` - shows pending offers.
- `/transactions` - shows recent signings and releases.
- `/admin set-coach user team` - assigns a head coach.
- `/admin set-team-role team role` - maps a team to the Discord role the bot adds/removes.
- `/admin set-log-channel channel` - sets the transaction log channel.
- `/admin force-release player` - admin cleanup command.

## Setup

1. Create a Discord application at <https://discord.com/developers/applications>.

2. In the Discord app, open **Bot** and create/reset the bot token. Keep it private.

3. Invite the bot to your server with these scopes:

   ```txt
   bot applications.commands
   ```

   Give it these bot permissions:

   ```txt
   Manage Roles
   Send Messages
   Use Slash Commands
   ```

   The bot's Discord role must be above all 12 team roles, or role assignment will fail.

4. Install the bot project dependencies:

   ```sh
   cd discord-bot
   npm install
   ```

5. Log in to Cloudflare:

   ```sh
   npx wrangler login
   ```

6. Create the D1 database:

   ```sh
   npm run db:create
   ```

   Copy the returned `database_id` into `wrangler.toml`.

7. Apply the database migration:

   ```sh
   npm run db:migrate:remote
   ```

8. Set Worker secrets:

   ```sh
   npx wrangler secret put DISCORD_PUBLIC_KEY
   npx wrangler secret put DISCORD_TOKEN
   npx wrangler secret put DISCORD_APPLICATION_ID
   ```

   `DISCORD_PUBLIC_KEY` is in the Discord application **General Information** page.

9. Deploy the Worker:

   ```sh
   npm run deploy
   ```

10. Copy the deployed Worker URL. In the Discord application **General Information** page, paste it into **Interactions Endpoint URL** and save.

11. Register slash commands for your Discord server:

   ```sh
   DISCORD_TOKEN="your_bot_token" \
   DISCORD_APPLICATION_ID="your_application_id" \
   DISCORD_GUILD_ID="your_server_id" \
   npm run commands:register
   ```

12. In Discord, map the 12 team roles:

   ```txt
   /admin set-team-role team:Roblox Warriors role:@Roblox Warriors
   /admin set-team-role team:Dumpsville Dummies role:@Dumpsville Dummies
   /admin set-team-role team:Bloxburg Buccaneers role:@Bloxburg Buccaneers
   /admin set-team-role team:Redcliff Raiders role:@Redcliff Raiders
   /admin set-team-role team:Overseer Owls role:@Overseer Owls
   /admin set-team-role team:Las Vegas Valkyrie role:@Las Vegas Valkyrie
   /admin set-team-role team:Lua Lions role:@Lua Lions
   /admin set-team-role team:Darkheart Dragons role:@Darkheart Dragons
   /admin set-team-role team:Korblox Knights role:@Korblox Knights
   /admin set-team-role team:Bloxxer Bengals role:@Bloxxer Bengals
   /admin set-team-role team:Stud City Spartans role:@Stud City Spartans
   /admin set-team-role team:Barton Bruisers role:@Barton Bruisers
   ```

13. Set the log channel:

   ```txt
   /admin set-log-channel channel:#transactions
   ```

14. Assign head coaches:

   ```txt
   /admin set-coach user:@Coach team:Barton Bruisers
   ```

15. Test the main flow:

   ```txt
   /offer player:@Player contract:1 season, starter, no-trade clause
   ```

   The player clicks **Accept**. The bot writes the contract to D1, gives the player the team role, cancels that player's other pending offers, and posts a transaction log.

## Local Development

Copy the example local secrets file:

```sh
cp .dev.vars.example .dev.vars
```

Fill in the values, then run:

```sh
npm run db:migrate:local
npm run dev
```

For local Discord endpoint testing, expose Wrangler with a tunnel such as Cloudflare Tunnel or ngrok, then set that URL as the Discord Interactions Endpoint URL.

## Important Rules Enforced

- A player can only have one active contract.
- Coaches can only offer and release players for their assigned team.
- Players accept or decline their own offers with buttons.
- Team roles are added on signing and removed on release.
