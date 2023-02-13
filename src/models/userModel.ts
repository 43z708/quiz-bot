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
      deadline: data.deadline,
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
      deadline: data.deadline,
      order: data.order,
      round: data.round,
    };
  },
};

// usersコレクションのデータ型
export interface UserData {
  guildId: string;
  id: string;
  name: string;
  questions: string[];
  startedAt: admin.firestore.Timestamp;
  deadline: admin.firestore.Timestamp;
  order: number; //クイズの何問目か（開始点0）
  round: number; //クイズを受けるのが何回目か（開始点0）
}

export class UserModel {
  private db;
  constructor(db: admin.firestore.Firestore) {
    this.db = db;
  }

  /**
   * ユーザー情報を保存（ユーザーが現在何番を解いていて、いつが締切かなど）
   * @param user
   * @param guildId
   * @param questions
   * @param startedAt
   * @param deadline
   * @param order
   * @param round
   */
  public async setUser(
    user: User,
    guildId: string,
    questions: string[],
    startedAt: admin.firestore.Timestamp,
    deadline: admin.firestore.Timestamp,
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
            deadline: deadline,
            order: order,
            round: round,
          })
        );
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * ユーザー情報を取得
   * @param userId
   * @param guildId
   * @returns
   */
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
          deadline: data.deadline,
          order: data.order,
          round: data.round,
        }
      : null;

    return userDocData;
  }

  public async deleteAll(guildId: string): Promise<void> {
    try {
      const batch = this.db.batch();

      const collection = await this.db
        .collection('guilds')
        .doc(guildId)
        .collection('users');

      const docs = await collection.get();
      const docIds: string[] = [];
      docs.forEach((doc) => {
        docIds.push(doc.id);
      });
      for (const docId of docIds) {
        await collection.doc(docId).delete();
      }
      await batch.commit();
    } catch (e) {
      console.error(e);
    }
  }
}
