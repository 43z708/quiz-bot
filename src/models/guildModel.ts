import admin from 'firebase-admin';

// guildsコレクションのデータ型
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
   * サーバー情報を保存
   * @param guildData
   */
  public async setGuild(guildData: GuildData): Promise<void> {
    await this.db.collection('guilds').doc(guildData.id).set(guildData);
  }

  /**
   * サーバー情報を取得
   * @param guildId
   * @returns
   */
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
