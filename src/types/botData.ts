import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';

/**
 * Firestore のドキュメントと BotData オブジェクトの型変換
 */
export const botDataConverter: FirestoreDataConverter<BotData> = {
  /**
   * BotData オブジェクトを Firestore ドキュメントデータへ変換
   */
  toFirestore(botData: BotData): DocumentData {
    return {
      id: botData.id,
      isAvailable: botData.isAvailable,
      name: botData.name,
      token: botData.token,
    };
  },

  /**
   * Firestore ドキュメントデータを BotData オブジェクトへ変換
   */
  fromFirestore(snapshot: QueryDocumentSnapshot): BotData {
    const data = snapshot.data();
    return {
      id: data.id,
      isAvailable: data.isAvailable,
      name: data.name,
      token: data.token,
    };
  },
};

export interface BotData {
  id: number;
  isAvailable: boolean;
  name: string;
  token: string;
}
