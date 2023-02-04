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
      answer: data.answer,
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
      answer: data.answer,
    };
  },
};

export interface QuestionData {
  guildId: string;
  id: string;
  question: string;
  options: OptionType;
  answer: AnswerType;
}

export interface OptionType {
  A: string;
  B: string;
  C: string;
  D: string;
}

export const Answer = ['A', 'B', 'C', 'D'] as const;
export type AnswerType = typeof Answer[number];
export const isAnswer = (name: string): name is AnswerType => {
  return Answer.some((value) => value === name);
};

export class QuestionModel {
  private db;
  constructor(db: admin.firestore.Firestore) {
    this.db = db;
  }

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
        const answerText = question[5];

        if (
          questionText &&
          optionA &&
          optionB &&
          optionC &&
          optionD &&
          answerText &&
          isAnswer(answerText)
        ) {
          const newDocId = collection.doc().id;
          await collection.doc(newDocId).set(
            questionDataConverter.toFirestore({
              guildId: guildId,
              id: newDocId,
              question: questionText,
              options: { A: optionA, B: optionB, C: optionC, D: optionD },
              answer: answerText,
            })
          );
        }
      }
      await batch.commit();
    } catch (e) {
      console.error(e);
    }
  }

  public async getQuestionIds(guildId: string): Promise<string[]> {
    const questionDocs = await this.db
      .collection('guilds')
      .doc(guildId)
      .collection('questions')
      .get();
    const questionIds: string[] = [];
    questionDocs.forEach((doc) => {
      questionIds.push(doc.id);
    });
    return questionIds;
  }

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
          answer: data.answer,
        }
      : null;
  }
}
