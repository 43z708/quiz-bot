import admin from 'firebase-admin';
import { ClientlController } from './controllers/clientController';
import { credentials } from './config';
import { BotModel } from './models/botModel';

admin.initializeApp({
  credential: admin.credential.cert(credentials),
  storageBucket: credentials.project_id + '.appspot.com',
});

const db = admin.firestore();
const strage = admin.storage();

const botModel = new BotModel(db);

(async function () {
  // bot情報を取得。新しいbotを作る際は、firestoreに事前に情報を入れておく。
  const bots = await botModel.getBots();
  if (bots.length > 0) {
    bots.forEach((bot) => {
      // 各種clientを稼働
      const clientlController = new ClientlController(bot.token);
      clientlController.login(db);
      clientlController.guildCreate(db);
      clientlController.messageCreate(db, strage);
      clientlController.interactionCreate(db);
    });
  }
})();
