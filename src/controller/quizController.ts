import {
  Message,
  EmbedBuilder,
  StringSelectMenuInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import admin from 'firebase-admin';
import { utils } from '../utils';
import { QuestionModel, AnswerType } from '../models/questionModel';
import { UserModel } from '../models/userModel';
import { GuildController } from './guildController';
import { GuildData } from '../models/guildModel';

/**
 * クイズに関する処理
 */
export class QuizController {
  /**
   * !quiz-startコマンドで発火する関数
   * @param message
   * @param db
   */
  public static async start(
    message: Message,
    db: admin.firestore.Firestore
  ): Promise<void> {
    if (message.guildId) {
      // 処理に時間がかかるため入力中フラグ
      await message.channel.sendTyping();
      const userModel = new UserModel(db);

      // ユーザー情報、全問題ID、サーバー情報を取得
      const response = await Promise.all([
        userModel.getUser(message.author.id, message.guildId),
        new QuestionModel(db).getQuestionIds(message.guildId),
        GuildController.get(message.guildId, db),
      ]);
      const user = response[0];
      const questionIds: string[] = response[1];
      const guildData: GuildData | null = response[2];
      if (!guildData) {
        return;
      }
      // クールタイム
      const cooltime = guildData.cooltime;
      // 問題数
      const numberOfQuestions = guildData.numberOfQuestions;
      // 問題番号をシャッフル
      const randomlySortedQuestionIds = this.shuffleArray(questionIds);
      // csv問題数が設定問題数以下ならそのまま、csv問題数が設定問題数より多ければカット
      const roundedQuestionIds =
        questionIds.length <= numberOfQuestions
          ? randomlySortedQuestionIds
          : randomlySortedQuestionIds.slice(0, numberOfQuestions);

      // 現在時刻からクールタイムを考慮した締切時間を算出
      const deadline = this.exportDeadline(new Date(), cooltime);

      if (user) {
        // クイズ2回目以降の回答(すでにユーザー情報があるため)
        const now = new Date().getTime();

        if (now <= user.deadline.toDate().getTime()) {
          // 締切時間前にクイズを!quiz-startで再開することはできない。(discord上でcooltime設定を変えている可能性を考慮)
          await message.reply(utils.coolTimeError);
          return;
        } else {
          // cooltimeを過ぎているため、!quiz-startを許可
          // ユーザー情報を更新
          await userModel.setUser(
            message.author,
            message.guildId,
            roundedQuestionIds,
            admin.firestore.Timestamp.fromDate(new Date()),
            admin.firestore.Timestamp.fromDate(deadline.deadlineDate),
            0,
            user.round + 1
          );
        }
      } else {
        // 初回なのでユーザー情報を保存
        await userModel.setUser(
          message.author,
          message.guildId,
          roundedQuestionIds,
          admin.firestore.Timestamp.fromDate(new Date()),
          admin.firestore.Timestamp.fromDate(deadline.deadlineDate),
          0,
          0
        );
      }

      if (roundedQuestionIds[0]) {
        // クイズ1問目を出題
        const component = await this.getQuizComponent(
          message.author.id,
          message.guildId,
          0,
          roundedQuestionIds.length,
          deadline.deadlineTime,
          roundedQuestionIds[0],
          db
        );
        await message.reply(component);
      }
    }
  }

  /**
   * クイズの2問目以降はinteractionに対して発火させる
   * @param interaction
   * @param db
   * @returns
   */
  public static async reply(
    interaction: StringSelectMenuInteraction,
    db: admin.firestore.Firestore
  ): Promise<void> {
    const userModel = new UserModel(db);
    const user = await userModel.getUser(
      interaction.user.id,
      interaction.guildId!
    );

    // user情報が存在しない場合エラー
    if (!user) {
      interaction.reply(utils.noUserInfo);
      return;
    }
    // interaction情報に対し、ユーザー、サーバー、クイズの問題IDの一致を確認
    if (
      user.id === interaction.user.id &&
      user.guildId === interaction.guildId &&
      user.questions[user.order] === interaction.customId
    ) {
      // 処理に時間がかかるため入力中フラグ
      await interaction.channel?.sendTyping();

      const deadline = user.deadline.toDate();
      const now = new Date();

      if (now.getTime() < deadline.getTime()) {
        // 締切時間前
        if (user.order + 1 >= user.questions.length) {
          // 最後の問題(userModelは変更の必要なし)
          // 終了メッセージを送信
          interaction.reply(`<@!${user.id}> ${utils.quizEnd}`);
        } else {
          // 次の問題を出題、ユーザー情報を更新
          const response = await Promise.all([
            this.getQuizComponent(
              interaction.user.id,
              interaction.guildId,
              user.order + 1,
              user.questions.length,
              deadline.getTime(),
              user.questions[user.order + 1]!,
              db
            ),
            userModel.setUser(
              interaction.user,
              interaction.guildId!,
              user.questions,
              user.startedAt,
              user.deadline,
              user.order + 1,
              user.round
            ),
          ]);
          await interaction.reply(response[0]);
        }
      } else {
        // 締切時間を過ぎた
        if (user.order + 1 > user.questions.length) {
          // 存在しないinteractionのはずなのでエラーを返す
          await interaction.reply(`<@!${user.id}> ${utils.systemError}`);
        } else {
          // 全問題を回答する前に時間経過してしまっているのでやり直すようメッセージ
          interaction.reply(`<@!${user.id}> ${utils.quizRetry}`);
        }
      }
    }
  }

  /**
   * クイズのコンポーネントを作成
   * @param userId
   * @param guildId
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
    order: number,
    numberOfQuestions: number,
    deadlineTime: number,
    questionId: string,
    db: admin.firestore.Firestore
  ): Promise<any> {
    // 問題情報を取得
    const questionData = await new QuestionModel(db).getQuestion(
      questionId,
      guildId
    );
    if (!questionData) {
      return;
    }
    // 制限時間をunix(秒単位)に直す
    const unixtime = Math.floor(deadlineTime / 1000);
    // メンション、問題番号、締切時間を表示
    const content = `<@!${userId}>\n ${utils.questionNumber(
      order,
      numberOfQuestions
    )}\n <t:${unixtime}:f> ${utils.deadline}`;

    // 問題情報
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(questionData.question);
    questionData.options;
    type key = 'A' | 'B' | 'C' | 'D';
    // 選択肢をシャッフル
    const randomlySortedKeys: AnswerType[] = this.shuffleArray([
      'A',
      'B',
      'C',
      'D',
    ]);

    // select menuで選択肢をつくる
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(questionData.id)
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
