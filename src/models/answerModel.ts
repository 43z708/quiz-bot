import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import { CommandInteraction } from 'discord.js';
import { QuestionData } from './questionModel';
/**
 * Firestore のドキュメントと AnswerData オブジェクトの型変換
 */
export const answerDataConverter: FirestoreDataConverter<AnswerData> = {
  /**
   * AnswerData オブジェクトを Firestore ドキュメントデータへ変換
   */
  toFirestore(data: AnswerData): DocumentData {
    return {
      id: data.id,
      guildId: data.guildId,
      userId: data.userId,
      userName: data.userName,
      startedAt: data.startedAt,
      finishedAt: data.finishedAt,
      duration: data.duration,
      round: data.round,
      numberOfQuestions: data.numberOfQuestions,
    };
  },

  /**
   * Firestore ドキュメントデータを AnswerData オブジェクトへ変換
   */
  fromFirestore(snapshot: QueryDocumentSnapshot): AnswerData {
    const data = snapshot.data();
    return {
      id: data.id,
      guildId: data.guildId,
      userId: data.userId,
      userName: data.userName,
      startedAt: data.startedAt,
      finishedAt: data.finishedAt,
      duration: data.duration,
      round: data.round,
      numberOfQuestions: data.numberOfQuestions,
    };
  },
};
/**
 * Firestore のドキュメントと AnswerData オブジェクトの型変換
 */
export const answerDetailDataConverter: FirestoreDataConverter<AnswerDetailData> =
  {
    /**
     * AnswerData オブジェクトを Firestore ドキュメントデータへ変換
     */
    toFirestore(data: AnswerDetailData): DocumentData {
      return {
        id: data.id,
        answer: data.answer,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: data.updatedAt,
      };
    },

    /**
     * Firestore ドキュメントデータを AnswerDetailData オブジェクトへ変換
     */
    fromFirestore(snapshot: QueryDocumentSnapshot): AnswerDetailData {
      const data = snapshot.data();
      return {
        id: data.id,
        answer: data.answer,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    },
  };

// answerコレクションのデータ型
export interface AnswerData {
  id: string; // ユーザーのこのラウンドのid
  guildId: string;
  userId: string;
  userName: string;
  startedAt: admin.firestore.Timestamp;
  finishedAt: admin.firestore.Timestamp | null; //終了時刻
  duration: number | null; // 回答時間(ミリ秒)
  round: number;
  numberOfQuestions: number;
}

// answerコレクションのサブコレクション
export interface AnswerDetailData {
  id: string; // 質問id
  answer: string | null; // 回答
  createdAt?: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp | null;
}

// csv変換のためのanswerコレクションデータ型
export interface AnswerDataForCsv extends AnswerData {
  answerDetails: AnswerDetailData[];
}

// AnswerCreate関数のparam
export interface AnswerCreateParams {
  answerId: string;
  startedAt: admin.firestore.Timestamp;
  round: number;
  interaction: CommandInteraction;
  questions: QuestionData[];
  numberOfQuestions: number;
}

// AnswerUpdate関数のparam
export interface AnswerUpdateParams {
  answerId: string;
  guildId: string;
  userId: string;
  startedAt: admin.firestore.Timestamp | null;
  finishedAt: admin.firestore.Timestamp | null;
  round: number;
  questionId: string;
  answer: string;
}

export class AnswerModel {
  private db;
  constructor(db: admin.firestore.Firestore) {
    this.db = db;
  }

  /**
   * collection生成前にreplyをするため、answerIdを事前に生成する必要があるので、そのための関数
   * @param guildId
   * @returns
   */
  public async createId(guildId: string): Promise<string> {
    return await this.db
      .collection('guilds')
      .doc(guildId)
      .collection('answers')
      .doc().id;
  }

  /**
   * answersとanswerDetailsを生成
   * @param params
   */
  public async create(params: AnswerCreateParams): Promise<void> {
    try {
      const batch = this.db.batch();
      const collection = this.db
        .collection('guilds')
        .doc(params.interaction.guildId!)
        .collection('answers');
      await collection.doc(params.answerId).set(
        answerDataConverter.toFirestore({
          id: params.answerId,
          guildId: params.interaction.guildId!,
          userId: params.interaction.user.id,
          userName: `${params.interaction.user.username}#${params.interaction.user.discriminator}`,
          startedAt: params.startedAt,
          finishedAt: null,
          duration: null,
          round: params.round,
          numberOfQuestions: params.numberOfQuestions,
        })
      );
      const subCollection = collection
        .doc(params.answerId)
        .collection('amswerDetails');

      await Promise.all(
        params.questions.map((question) =>
          subCollection.doc(question.id).set(
            answerDetailDataConverter.toFirestore({
              id: question.id,
              answer: null,
              updatedAt: null,
            })
          )
        )
      );
      await batch.commit();
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * 回答するごとにデータを記録
   * @param params
   */
  public async update(params: AnswerUpdateParams): Promise<void> {
    try {
      const batch = this.db.batch();
      const collection = this.db
        .collection('guilds')
        .doc(params.guildId)
        .collection('answers');
      const duration =
        params.startedAt && params.finishedAt
          ? params.finishedAt.toDate().getTime() -
            params.startedAt.toDate().getTime()
          : null;
      const subCollection = collection
        .doc(params.answerId)
        .collection('amswerDetails');
      await Promise.all([
        collection.doc(params.answerId).update({
          finishedAt: params.finishedAt,
          duration: duration,
          round: params.round,
        }),
        subCollection.doc(params.questionId).update({
          answer: params.answer,
          updatedAt: admin.firestore.Timestamp.fromDate(new Date()),
        }),
      ]);
      await batch.commit();
    } catch (e) {
      console.error(e);
    }
  }

  public async index(guildId: string): Promise<AnswerDataForCsv[] | undefined> {
    try {
      const batch = this.db.batch();
      const collection = this.db
        .collection('guilds')
        .doc(guildId)
        .collection('answers');
      const answerDocs = await collection.where('finishedAt', '!=', null).get();
      const answers: AnswerData[] = [];
      answerDocs.forEach((doc) => {
        answers.push(answerDataConverter.fromFirestore(doc));
      });

      // AnswerData型を再帰的にAnswerDataForCsvに変換して返したい
      const answerDataForCsv = await Promise.all(
        answers.map(async (answer) => {
          const docs = await collection
            .doc(answer.id)
            .collection('amswerDetails')
            .get();
          const answerDetails: AnswerDetailData[] = [];
          docs.forEach((doc) => {
            answerDetails.push(answerDetailDataConverter.fromFirestore(doc));
          });
          (answer as AnswerDataForCsv).answerDetails = answerDetails;
          return answer as AnswerDataForCsv;
        })
      );
      await batch.commit();
      return answerDataForCsv;
    } catch (e) {
      console.error(e);
    }
  }
}
