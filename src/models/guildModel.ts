import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import { TextChannel } from 'discord.js';

export interface GuildData {
  id: string;
  name: string;
  cooltime: number;
  numberOfQuestions: number;
}

export class GuildModel {
  private db;
  constructor(db: admin.firestore.Firestore) {
    this.db = db;
  }

  /**
   *
   * @param guildData
   */
  public async setGuild(guildData: GuildData): Promise<void> {
    await this.db.collection('guilds').doc(guildData.id).set(guildData);
  }

  public async getGuild(guildId: string): Promise<GuildData | null> {
    const doc = await this.db.collection('guilds').doc(guildId).get();
    const data = doc.data();
    return data
      ? {
          id: data.id,
          name: data.name,
          cooltime: data.cooltime,
          numberOfQuestions: data.numberOfQuestions,
        }
      : null;
  }
}
