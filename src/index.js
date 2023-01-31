import { config } from "./config.js";
import dotenv from "dotenv";
import { Client, Events, GatewayIntentBits } from "discord.js";
import admin from "firebase-admin";
import { DiscordClient } from "./functions/client.js";

dotenv.config();
const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
	credential: admin.credential.cert(credentials),
});

const db = admin.firestore();

(async function () {
	const bots = await db
		.collection("bots")
		.where("isAvailable", "==", true)
		.get();
	if (bots.size > 0) {
		bots.forEach((bot) => {
			const discordClient = new DiscordClient(bot.data().token);
			discordClient.login(db);
		});
	}
})();
