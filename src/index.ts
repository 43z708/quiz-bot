import { Client, Events, GatewayIntentBits } from 'discord.js';
import admin from 'firebase-admin';
import { DiscordClient } from './functions/client';
import { credentials } from './config';
import { BotData, botDataConverter } from './types/botData';

admin.initializeApp({
  credential: admin.credential.cert(credentials),
  storageBucket: credentials.project_id + '.appspot.com',
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

(async function () {
  const bots = await db
    .collection('bots')
    .where('isAvailable', '==', true)
    .get();
  if (bots.size > 0) {
    bots.forEach((bot) => {
      const botData: BotData = botDataConverter.fromFirestore(bot);
      const discordClient = new DiscordClient(botData.token);
      discordClient.login();
      discordClient.messageCreate(db, bucket);
    });
  }
})();
