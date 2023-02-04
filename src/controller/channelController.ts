import {
  Message,
  Guild,
  PermissionFlagsBits,
  ChannelType,
  OverwriteType,
} from 'discord.js';
import { ChannelModel, ChannelData } from '../models/channelModel';
import admin from 'firebase-admin';
import { utils } from '../utils';

export class ChannelController {
  /**
   * チャンネル作成
   * @param member bot自身
   * @param db
   */
  static async create(
    guild: Guild,
    botId: string,
    db: admin.firestore.Firestore
  ): Promise<void> {
    // バリデーション
    const countchannels = await db
      .collection('channels')
      .where('guildId', '==', guild.id)
      .count()
      .get();

    // quizカテゴリとチャンネル、管理用チャンネルを作成する
    if (countchannels.data().count === 0) {
      const category = await guild.channels.create({
        name: utils.categoryName,
        type: ChannelType.GuildCategory,
      });
      const quizChannel = await guild.channels.create({
        name: utils.quizChannelName,
        type: ChannelType.GuildText,
        rateLimitPerUser: 6 * 3600,
        parent: category.id,
      });
      const quizManagementChannel = await guild.channels.create({
        name: utils.quizManagementChannelName,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            type: OverwriteType.Role,
            deny: [PermissionFlagsBits.ViewChannel],
          },
        ],
        parent: category.id,
      });
      const channelModel = new ChannelModel(db);
      await Promise.all([
        channelModel.setChannel(quizChannel, 'quiz', botId, guild.id),
        channelModel.setChannel(
          quizManagementChannel,
          'quiz-management',
          botId,
          guild.id
        ),
      ]);

      await quizManagementChannel.send(utils.initialSendMessage);
    }
  }
  /**
   * チャンネル情報を取得
   * @param guildId
   * @param db
   * @returns
   */
  static async getChannels(
    guildId: string,
    db: admin.firestore.Firestore
  ): Promise<ChannelData[]> {
    const channels = await new ChannelModel(db).getChannels(guildId);
    return channels;
  }

  /**
   * 送られたメッセージが所属するチャンネルがquiz-manegementがどうか
   * @param channels
   * @param message
   * @returns
   */
  public static isQuizManagementChannel(
    channels: ChannelData[],
    message: Message
  ): boolean {
    return channels.some(
      (channel) =>
        channel.type === 'quiz-management' && message.channel.id === channel.id
    );
  }

  /**
   * 送られたメッセージが所属するチャンネルがquizチャンネルかどうか
   * @param channels
   * @param message
   * @returns
   */
  public static isQuizChannel(
    channels: ChannelData[],
    message: Message
  ): boolean {
    return channels.some(
      (channel) => channel.type === 'quiz' && message.channel.id === channel.id
    );
  }

  /**
   * quizチャンネルの情報を取得
   * @param channels
   * @returns
   */
  public static getQuizChannel(channels: ChannelData[]): ChannelData {
    return channels.find((channel) => channel.type === 'quiz')!;
  }
}
