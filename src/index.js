import { config } from "./config.js";
import dotenv from "dotenv";
import { Client, Events, GatewayIntentBits } from "discord.js";

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.on("ready", () => {
	console.log(`${client.user.tag}がサーバーにログインしました！`);
});
client.once(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isCommand()) return;
	if (interaction.commandName === "hello") {
		await interaction.reply("hello!");
	}
});

client.login(config.token);
