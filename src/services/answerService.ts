import { AnswerDataForCsv } from '../models/answerModel';
import { utils } from '../utils';

export class AnswerService {
  public static formatCsv(answers: AnswerDataForCsv[]): string[][] {
    // userName: '回答者', percentageOfCorrects: '正答率', startedAt: 'クイズ開始時間', duration: '回答時間', round: '何回目', numberOfCorrects: '正解数', numberOfQuestions: '出題数',・・・
    const duplicatedQuestions = answers
      .map((answer) =>
        answer.answerDetails.map((detail) => {
          return { id: detail.id, text: detail.question };
        })
      )
      .flat();

    // idのみ
    const questionIds: string[] = Array.from(
      new Set(duplicatedQuestions.map((question) => question.id))
    );
    // idとtextの両方
    const questions: { id: string; text: string }[] =
      duplicatedQuestions.filter((question) =>
        questionIds.some((questionId) => questionId === question.id)
      );
    // textのみ
    const questionTexts: string[] = questions.map((question) => question.text);

    const header: string[] = [
      utils.csvHeader.userName,
      utils.csvHeader.percentageOfCorrects,
      utils.csvHeader.startedAt,
      utils.csvHeader.duration,
      utils.csvHeader.round,
      utils.csvHeader.numberOfCorrects,
      utils.csvHeader.numberOfQuestions,
    ].concat(questionTexts);

    const body = answers.map((answer) => {
      const numberOfCorrects = answer.answerDetails.filter(
        (detail) => detail.answer === detail.correct
      ).length;
      const duration = `${Math.floor(answer.duration! / 3600)}h${Math.floor(
        (answer.duration! % 3600) / 60
      )}m${answer.duration! % 60}`;
      const firstHalf = [
        answer.userName,
        `${
          Math.round((numberOfCorrects / answer.numberOfQuestions) * 10000) /
          100
        }%`, // 四捨五入して小数第二位まで表示
        `${answer.startedAt
          .toDate()
          .toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}(JST)`,
        duration,
        `${answer.round}`,
        `${numberOfCorrects}`,
        `${answer.numberOfQuestions}`,
      ];
      const secondHalf = questionIds.map((id) => {
        return (
          answer.answerDetails.find((detail) => detail.id === id)?.answer ?? ''
        );
      });
      return firstHalf.concat(secondHalf);
    });

    return body.splice(0, 0, header);
  }
}