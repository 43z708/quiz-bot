import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import admin from 'firebase-admin';

/**
 * Firestore のドキュメントと BotData オブジェクトの型変換
 */
export const botDataConverter: FirestoreDataConverter<BotData> = {
  /**
   * BotData オブジェクトを Firestore ドキュメントデータへ変換
   */
  toFirestore(data: BotData): DocumentData {
    return {
      id: data.id,
      isAvailable: data.isAvailable,
      name: data.name,
      token: data.token,
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

// botsコレクションのデータ型
export interface BotData {
  id: string;
  isAvailable: boolean;
  name: string;
  token: string;
}

export class BotModel {
  private db;
  constructor(db: admin.firestore.Firestore) {
    this.db = db;
  }
  /**
   * bot情報を取得
   * @returns
   */
  public async getBots(): Promise<BotData[]> {
    const bots = await this.db
      .collection('bots')
      .where('isAvailable', '==', true)
      .get();
    const botData: BotData[] = [];
    if (bots.size > 0) {
      bots.forEach((bot) => {
        botData.push(botDataConverter.fromFirestore(bot));
      });
    }
    return botData;
  }
}
