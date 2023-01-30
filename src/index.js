import { config } from "./config.js";

const dotenv = require("dotenv");
dotenv.config();
const {
	Client,
	Intents,
	MessageActionRow,
	MessageSelectMenu,
	MessageButton,
	Permissions,
} = require("discord.js");

const client = new Client({
	intents: [
		Intents.FLAGS.MESSAGE,
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MESSAGES,
	],
});
client.on("ready", () => {
	console.log(`${client.user.tag}がサーバーにログインしました！`);
});
client.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) return;
	if (interaction.commandName === "hello") {
		await interaction.reply("hello!");
	}
});

client.login(config.token);
