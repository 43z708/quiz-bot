import { Client, Events, GatewayIntentBits } from "discord.js";

export class DiscordClient {
	constructor(token) {
		this.token = token;
		this.client = new Client({ intents: [GatewayIntentBits.Guilds] });
	}

	login(db) {
		this.client.once(Events.ClientReady, (c) => {
			console.log(`Ready! Logged in as ${c.user.tag}`);
		});
		this.client.login(this.token);
	}

	messageCreate(db) {
		this.client.on(Events.messageCreate, async (message) => {
			if (message.author.id == this.client.user.id) {
				return;
			}

			// if (this.isAdmin(message) && message.content === "!resetFp") {
			//   const reply = await deleteCollections(message);
			//   sendReply(message, reply);
			// }
		});
	}

	isAdmin(message) {
		return message.member.permissions.has([Permissions.FLAGS.ADMINISTRATOR]);
	}
}
