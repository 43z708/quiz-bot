import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import { User } from 'discord.js';
/**
 * Firestore のドキュメントと UserData オブジェクトの型変換
 */
export const userDataConverter: FirestoreDataConverter<UserData> = {
  /**
   * UserData オブジェクトを Firestore ドキュメントデータへ変換
   */
  toFirestore(data: UserData): DocumentData {
    return {
      id: data.id,
      guildId: data.guildId,
      name: data.name,
      questions: data.questions,
      startedAt: data.startedAt,
      order: data.order,
      round: data.round,
    };
  },

  /**
   * Firestore ドキュメントデータを UserData オブジェクトへ変換
   */
  fromFirestore(snapshot: QueryDocumentSnapshot): UserData {
    const data = snapshot.data();
    return {
      id: data.id,
      guildId: data.guildId,
      name: data.name,
      questions: data.questions,
      startedAt: data.startedAt,
      order: data.order,
      round: data.round,
    };
  },
};

export interface UserData {
  guildId: string;
  id: string;
  name: string;
  questions: string[];
  startedAt: admin.firestore.Timestamp;
  order: number; //クイズの何問目か（開始点0）
  round: number; //クイズを受けるのが何回目か（開始点0）
}

export class UserModel {
  private db;
  constructor(db: admin.firestore.Firestore) {
    this.db = db;
  }

  public async setUser(
    user: User,
    guildId: string,
    questions: string[],
    startedAt: admin.firestore.Timestamp,
    order: number,
    round: number
  ): Promise<void> {
    try {
      await this.db
        .collection('guilds')
        .doc(guildId)
        .collection('users')
        .doc(user.id)
        .set(
          userDataConverter.toFirestore({
            id: user.id,
            guildId: guildId,
            name: `${user.username}#${user.discriminator}`,
            questions: questions,
            startedAt: startedAt,
            order: order,
            round: round,
          })
        );
    } catch (e) {
      console.error(e);
    }
  }

  public async getUser(
    userId: string,
    guildId: string
  ): Promise<UserData | null> {
    const userDoc = await this.db
      .collection('guilds')
      .doc(guildId)
      .collection('users')
      .doc(userId)
      .get();
    const data = userDoc.data() ?? null;
    const userDocData: UserData | null = data
      ? {
          id: data.id,
          guildId: data.guildId,
          name: data.name,
          questions: data.questions,
          startedAt: data.startedAt,
          order: data.order,
          round: data.round,
        }
      : null;

    return userDocData;
  }
}
