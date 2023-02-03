import { Client, Events, GatewayIntentBits } from 'discord.js';
import admin from 'firebase-admin';
import { DiscordClient } from './functions/client';
import { credentials } from './config';
import { BotData, botDataConverter, BotModel } from './models/botModel';

admin.initializeApp({
  credential: admin.credential.cert(credentials),
  storageBucket: credentials.project_id + '.appspot.com',
});

const db = admin.firestore();
const strage = admin.storage();

const botModel = new BotModel(db);

(async function () {
  const bots = await botModel.getBots();
  if (bots.length > 0) {
    bots.forEach((bot) => {
      const discordClient = new DiscordClient(bot.token);
      discordClient.login();
      discordClient.guildCreate(db);
      discordClient.messageCreate(db, strage);
      discordClient.interactionCreate(db);
    });
  }
})();
