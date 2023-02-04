import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import admin from 'firebase-admin';
/**
 * Firestore のドキュメントと QuestionData オブジェクトの型変換
 */
export const questionDataConverter: FirestoreDataConverter<QuestionData> = {
  /**
   * QuestionData オブジェクトを Firestore ドキュメントデータへ変換
   */
  toFirestore(data: QuestionData): DocumentData {
    return {
      id: data.id,
      guildId: data.guildId,
      question: data.question,
      options: data.options,
      correct: data.correct,
    };
  },

  /**
   * Firestore ドキュメントデータを QuestionData オブジェクトへ変換
   */
  fromFirestore(snapshot: QueryDocumentSnapshot): QuestionData {
    const data = snapshot.data();
    return {
      id: data.id,
      guildId: data.guildId,
      question: data.question,
      options: data.options,
      correct: data.correct,
    };
  },
};

// questionsコレクションのデータ型
export interface QuestionData {
  guildId: string;
  id: string;
  question: string;
  options: OptionType;
  correct: CorrectType;
}

export interface OptionType {
  A: string;
  B: string;
  C: string;
  D: string;
}

export const Correct = ['A', 'B', 'C', 'D'] as const;
export type CorrectType = typeof Correct[number];
export const isCorrect = (name: string): name is CorrectType => {
  return Correct.some((value) => value === name);
};

export class QuestionModel {
  private db;
  constructor(db: admin.firestore.Firestore) {
    this.db = db;
  }

  /**
   * CSVから問題情報を保存（一度全部消して保存しなおす）
   * @param questions
   * @param guildId
   */
  public async setQuestions(
    questions: string[][],
    guildId: string
  ): Promise<void> {
    try {
      const collection = this.db
        .collection('guilds')
        .doc(guildId)
        .collection('questions');
      const batch = this.db.batch();

      const docs = await collection.get();
      const docIds: string[] = [];
      docs.forEach((doc) => {
        docIds.push(doc.id);
      });
      for (const docId of docIds) {
        await collection.doc(docId).delete();
      }

      for (const question of questions) {
        const questionText = question[0];
        const optionA = question[1];
        const optionB = question[2];
        const optionC = question[3];
        const optionD = question[4];
        const correctText = question[5];

        if (
          questionText &&
          optionA &&
          optionB &&
          optionC &&
          optionD &&
          correctText &&
          isCorrect(correctText)
        ) {
          const newDocId = collection.doc().id;
          await collection.doc(newDocId).set(
            questionDataConverter.toFirestore({
              guildId: guildId,
              id: newDocId,
              question: questionText,
              options: { A: optionA, B: optionB, C: optionC, D: optionD },
              correct: correctText,
            })
          );
        }
      }
      await batch.commit();
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * 全問題ID情報を取得
   * @param guildId
   * @returns
   */
  public async getAllQuestions(guildId: string): Promise<QuestionData[]> {
    const questionDocs = await this.db
      .collection('guilds')
      .doc(guildId)
      .collection('questions')
      .get();
    const questions: QuestionData[] = [];
    questionDocs.forEach((doc) => {
      questions.push(questionDataConverter.fromFirestore(doc));
    });
    return questions;
  }

  /**
   * 問題IDから問題情報を取得
   * @param questionId
   * @param guildId
   * @returns
   */
  public async getQuestion(
    questionId: string,
    guildId: string
  ): Promise<QuestionData | null> {
    const data = await (
      await this.db
        .collection('guilds')
        .doc(guildId)
        .collection('questions')
        .doc(questionId)
        .get()
    ).data();
    return data
      ? {
          id: data.id,
          guildId: data.guildId,
          question: data.question,
          options: data.options,
          correct: data.correct,
        }
      : null;
  }
}
