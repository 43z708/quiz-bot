import {
  Client,
  Events,
  Message,
  GatewayIntentBits,
  Guild,
  PermissionFlagsBits,
  ChannelType,
  OverwriteType,
  GuildMember,
} from 'discord.js';
import { channelDataConverter, ChannelData } from '../types/channelData';
import admin from 'firebase-admin';
import utils from '../utils.json';

export class ChannelCommand {
  /**
   * チェンネル作成
   * @param member bot自身
   * @param db
   */
  static async create(
    guild: Guild,
    botId: string,
    db: admin.firestore.Firestore
  ): Promise<void> {
    const countchannels = await db
      .collection('channels')
      .where('guildId', '==', guild.id)
      .count()
      .get();
    if (countchannels.data().count === 0) {
      countchannels;
      const category = await guild.channels.create({
        name: utils.categoryName,
        type: ChannelType.GuildCategory,
      });
      const quizChannel = await guild.channels.create({
        name: utils.quizChannelName,
        type: ChannelType.GuildText,
        rateLimitPerUser: 60,
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

      await Promise.all([
        db
          .collection('channels')
          .doc(quizChannel.id)
          .set(
            channelDataConverter.toFirestore({
              id: quizChannel.id,
              name: quizChannel.name,
              type: 'quiz',
              botId: botId,
              guildId: guild.id,
            })
          ),
        db
          .collection('channels')
          .doc(quizManagementChannel.id)
          .set(
            channelDataConverter.toFirestore({
              id: quizManagementChannel.id,
              name: quizManagementChannel.name,
              type: 'quiz-management',
              botId: botId,
              guildId: guild.id,
            })
          ),
      ]);

      await quizManagementChannel.send(utils.initialSendMessage);
    }
  }

  static async getChannels(
    guildId: string,
    db: admin.firestore.Firestore
  ): Promise<ChannelData[]> {
    const channelDocs = await db
      .collection('channels')
      .where('guildId', '==', guildId)
      .get();
    const channelDataList: ChannelData[] = [];
    channelDocs.forEach((doc) => {
      channelDataList.push(channelDataConverter.fromFirestore(doc));
    });
    return channelDataList;
  }
}
