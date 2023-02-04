import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import { TextChannel } from 'discord.js';
/**
 * Firestore のドキュメントと ChannelData オブジェクトの型変換
 */
export const channelDataConverter: FirestoreDataConverter<ChannelData> = {
  /**
   * ChannelData オブジェクトを Firestore ドキュメントデータへ変換
   */
  toFirestore(data: ChannelData): DocumentData {
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      botId: data.botId,
      guildId: data.guildId,
    };
  },

  /**
   * Firestore ドキュメントデータを ChannelData オブジェクトへ変換
   */
  fromFirestore(snapshot: QueryDocumentSnapshot): ChannelData {
    const data = snapshot.data();
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      botId: data.botId,
      guildId: data.guildId,
    };
  },
};

// channelsコレクションのデータ型
export interface ChannelData {
  id: string;
  name: string;
  type: ChannelDataType;
  botId: string;
  guildId: string;
}

export type ChannelDataType = 'quiz' | 'quiz-management';

export class ChannelModel {
  private db;
  constructor(db: admin.firestore.Firestore) {
    this.db = db;
  }

  /**
   * channel情報を保存
   * @param channel
   * @param type
   * @param botId
   * @param guildId
   */
  public async setChannel(
    channel: TextChannel,
    type: ChannelDataType,
    botId: string,
    guildId: string
  ): Promise<void> {
    await this.db
      .collection('channels')
      .doc(channel.id)
      .set(
        channelDataConverter.toFirestore({
          id: channel.id,
          name: channel.name,
          type: type,
          botId: botId,
          guildId: guildId,
        })
      );
  }

  /**
   * 全channelを取得
   * @param guildId
   * @returns
   */
  public async getChannels(guildId: string): Promise<ChannelData[]> {
    const channelDocs = await this.db
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
