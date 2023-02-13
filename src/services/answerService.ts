import { AnswerDataForCsv } from '../models/answerModel';
import { QuestionData } from '../models/questionModel';
import { utils } from '../utils';

export class AnswerService {
  public static formatCsv(
    questions: QuestionData[],
    answers: AnswerDataForCsv[]
  ): string[][] {
    // userName: '回答者', percentageOfCorrects: '正答率', startedAt: 'クイズ開始時間', duration: '回答時間', round: '何回目', numberOfCorrects: '正解数', numberOfQuestions: '出題数',・・・
    // idとtextの両方x

    const header: string[] = [
      utils.csvHeader.userName,
      utils.csvHeader.percentageOfCorrects,
      utils.csvHeader.startedAt,
      utils.csvHeader.duration,
      utils.csvHeader.round,
      utils.csvHeader.numberOfCorrects,
      utils.csvHeader.numberOfQuestions,
    ].concat(questions.map((question) => question.question));

    const body = answers.map((answer) => {
      const numberOfCorrects = answer.answerDetails.filter((detail) => {
        return (
          detail.answer ===
          questions.find((question) => {
            return question.id === detail.id;
          })?.correct
        );
      }).length;
      const milsec = answer.duration ?? 0;
      const sec = Math.floor(milsec / 1000);
      const duration = `${Math.floor(sec! / 3600)}h${Math.floor(
        (sec! % 3600) / 60
      )}m${sec! % 60}`;
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
        `${answer.round + 1}`,
        `${numberOfCorrects}`,
        `${answer.numberOfQuestions}`,
      ];
      const secondHalf = questions.map((question) => {
        return (
          answer.answerDetails.find((detail) => detail.id === question.id)
            ?.answer ?? ''
        );
      });
      return firstHalf.concat(secondHalf);
    });
    body.unshift(header);
    return body;
  }
}
