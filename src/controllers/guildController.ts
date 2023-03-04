import { Guild } from 'discord.js';
import admin from 'firebase-admin';
import { GuildModel, GuildData } from '../models/guildModel';
import { cooltime, numberOfQuestions } from '../config';
/**
 * サーバーの情報に関する処理
 */
export class GuildController {
  /**
   * サーバー情報を保存
   * @param guild
   * @param db
   */
  public static async create(
    guild: Guild,
    db: admin.firestore.Firestore
  ): Promise<void> {
    const guildModel = new GuildModel(db);
    // クールタイムの初期値は30分、問題数は30問
    const guildData: GuildData = {
      id: guild.id,
      name: guild.name,
      cooltime: cooltime,
      numberOfQuestions: numberOfQuestions,
    };
    await guildModel.setGuild(guildData);
  }

  /**
   * サーバー情報を取得
   * @param guildId
   * @param db
   * @returns
   */
  public static async get(
    guildId: string,
    db: admin.firestore.Firestore
  ): Promise<GuildData | null> {
    const guildModel = new GuildModel(db);
    return await guildModel.getGuild(guildId);
  }
}
