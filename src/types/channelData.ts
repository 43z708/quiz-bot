import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';

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

export interface ChannelData {
  id: string;
  name: string;
  type: ChannelDataType;
  botId: string;
  guildId: string;
}

export type ChannelDataType = 'quiz' | 'quiz-management';
