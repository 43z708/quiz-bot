import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import admin from 'firebase-admin';
import { utils } from '../utils';
import { QuestionModel, CorrectType } from '../models/questionModel';

export class QuizService {
  /**
   * クイズのコンポーネントを作成
   * @param userId
   * @param guildId
   * @param answerId
   * @param order
   * @param numberOfQuestions
   * @param deadlineTime //Date型から取得するミリ秒
   * @param questionId
   * @param db
   * @returns
   */
  public static async getQuizComponent(
    userId: string,
    guildId: string,
    answerId: string,
    order: number,
    numberOfQuestions: number,
    deadlineTime: number,
    questionId: string,
    db: admin.firestore.Firestore
  ): Promise<any> {
    // 問題情報を取得
    const questionData = await new QuestionModel(db).get(questionId, guildId);
    if (!questionData) {
      return;
    }
    // 制限時間をunix(秒単位)に直す
    const unixtime = Math.floor(deadlineTime / 1000);
    // メンション、問題番号、締切時間を表示
    const content = `<@!${userId}>\n **${utils.questionNumber(
      order,
      numberOfQuestions
    )}** \n <t:${unixtime}:f> ${utils.deadline}`;

    // 問題情報
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setDescription(questionData.question.split('\\n').join('\n'));
    // 画像URLがあれば添付する
    if (!!questionData.imageUrl) {
      embed.setImage(questionData.imageUrl);
    }
    questionData.options;
    // 選択肢をシャッフル
    const randomlySortedKeys: CorrectType[] = this.shuffleArray([
      'A',
      'B',
      'C',
      'D',
    ]);

    // select menuで選択肢をつくる
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(this.toCustomId(answerId, questionData.id))
        .setPlaceholder(utils.placeholder)
        .addOptions(
          {
            label: `1. ${questionData.options[randomlySortedKeys[0]!]}`,
            value: randomlySortedKeys[0]!,
          },
          {
            label: `2. ${questionData.options[randomlySortedKeys[1]!]}`,
            value: randomlySortedKeys[1]!,
          },
          {
            label: `3. ${questionData.options[randomlySortedKeys[2]!]}`,
            value: randomlySortedKeys[2]!,
          },
          {
            label: `4. ${questionData.options[randomlySortedKeys[3]!]}`,
            value: randomlySortedKeys[3]!,
          }
        )
    );
    return {
      content: content,
      embeds: [embed],
      components: [row],
    };
  }

  /**
   * quizComponentで使うcustomIdに変換
   * @param answerId
   * @param questionId
   * @returns
   */
  public static toCustomId(answerId: string, questionId: string): string {
    return JSON.stringify({
      answerId: answerId,
      questionId: questionId,
    });
  }

  /**
   * quizComponentのcustomIdからanswerIdとquestionIdを取得。別のinteractionの場合はnull
   * @param customId
   * @returns { answerId: string; questionId: string } | null
   */
  public static fromCustomId(
    customId: string
  ): { answerId: string; questionId: string } | null {
    const obj = JSON.parse(customId);
    if (obj.answerId && obj.questionId) {
      return obj;
    } else {
      return null;
    }
  }

  /**
   * 配列をランダムにシャッフルする関数
   * @param array
   * @returns
   */
  public static shuffleArray<T>(array: T[]): T[] {
    const cloneArray = [...array];

    for (let i = cloneArray.length - 1; i >= 0; i--) {
      let rand = Math.floor(Math.random() * (i + 1));
      // 配列の要素の順番を入れ替える
      let tmpStorage = cloneArray[i];
      cloneArray[i] = cloneArray[rand]!;
      cloneArray[rand] = tmpStorage!;
    }
    return cloneArray;
  }

  /**
   * cooltime締め切りを算出
   * @param date
   * @param cooltime
   * @returns { deadlineTime: number; deadlineDate: Date }
   */
  public static exportDeadline(
    date: Date,
    cooltime: number
  ): { deadlineTime: number; deadlineDate: Date } {
    // ミリ秒で締切を表す
    const deadlineTime = date.getTime() + cooltime * 1000;

    const hour = Math.floor(cooltime / 3600);
    const min = Math.floor((cooltime % 3600) / 60);
    const rem = cooltime % 60;

    // 締切をDate型で表す
    const deadlineDate = date;
    deadlineDate.setHours(deadlineDate.getHours() + hour);
    deadlineDate.setMinutes(deadlineDate.getMinutes() + min);
    deadlineDate.setSeconds(deadlineDate.getSeconds() + rem);
    return { deadlineTime, deadlineDate };
  }
}
