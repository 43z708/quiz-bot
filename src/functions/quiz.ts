import {
  Client,
  Events,
  Message,
  GatewayIntentBits,
  Guild,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  StringSelectMenuInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';

import admin from 'firebase-admin';
import { utils } from '../utils';
import {
  QuestionModel,
  QuestionData,
  AnswerType,
} from '../models/questionModel';
import { UserModel } from '../models/userModel';
import { GuildCommand } from './guild';
import { GuildData } from '../models/guildModel';

export class QuizCommand {
  /**
   * !quiz-startコマンドで稼働する関数
   * @param message
   * @param db
   */
  public static async start(
    message: Message,
    db: admin.firestore.Firestore
  ): Promise<void> {
    if (message.guildId) {
      await message.channel.sendTyping();
      const userModel = new UserModel(db);
      const response = await Promise.all([
        userModel.getUser(message.author.id, message.guildId),
        new QuestionModel(db).getQuestionIds(message.guildId),
        GuildCommand.get(message.guildId, db),
      ]);
      const user = response[0];
      const questionIds: string[] = response[1];
      const guildData: GuildData | null = response[2];
      if (!guildData) {
        return;
      }
      const cooltime = guildData.cooltime;
      const numberOfQuestions = guildData.numberOfQuestions;

      const randomlySortedQuestionIds = this.shuffleArray(questionIds);
      // csv問題数が設定問題数以下ならそのまま、csv問題数が設定問題数より多ければカット
      const roundedQuestionIds =
        questionIds.length <= numberOfQuestions
          ? randomlySortedQuestionIds
          : randomlySortedQuestionIds.slice(0, numberOfQuestions);

      const deadline = this.exportDeadline(new Date(), cooltime);

      if (user) {
        const now = new Date().getTime();

        // 2回目以降cooltime未満ならスルー
        if (now <= user.deadline.toDate().getTime()) {
          await message.reply(utils.coolTimeError);
          return;
        } else {
          // 2回目以降cooltime以降なら最初からやり直し
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
        // 初回=>dbつくってランダムを返す

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

      // クイズ1問目を出題
      if (roundedQuestionIds[0]) {
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

  // 次のクイズを返す
  // 6時間以内かつ途中→次の問題
  // 6時間以内かつ最後→終了
  // 6時間以降かつ途中→エラーを返す
  // 6時間以降かつ最後は選択肢が存在しないのであり得ない
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
    // ユーザーとサーバーが一致している
    if (
      user.id === interaction.user.id &&
      user.guildId === interaction.guildId &&
      user.questions[user.order] === interaction.customId
    ) {
      await interaction.channel?.sendTyping();

      const deadline = user.deadline.toDate();
      const now = new Date();

      if (now.getTime() < deadline.getTime()) {
        // cooltime以内
        if (user.order + 1 >= user.questions.length) {
          // 最後の問題(userModelは変更の必要なし)
          // 終わりのメッセージ
          interaction.reply(`<@!${user.id}> ${utils.quizEnd}`);
        } else {
          // 次の問題を出題
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
        // cooltime以降
        if (user.order + 1 === user.questions.length) {
          // 最後の問題で存在しないinteractionのはずなのでエラーを返す
          await interaction.reply(`<@!${user.id}> ${utils.systemError}`);
        } else {
          // 途中の問題で時間経過してしまっているのでやり直すようメッセージ
          interaction.reply(`<@!${user.id}> ${utils.quizRetry}`);
        }
      }
    }
  }

  public static async getQuizComponent(
    userId: string,
    guildId: string,
    order: number,
    numberOfQuestions: number,
    deadlineTime: number, //ミリ秒
    questionId: string,
    db: admin.firestore.Firestore
  ): Promise<any> {
    const questionData = await new QuestionModel(db).getQuestion(
      questionId,
      guildId
    );
    if (!questionData) {
      return;
    }
    const unixtime = Math.floor(deadlineTime / 1000);
    const content = `<@!${userId}>\n ${utils.questionNumber(
      order,
      numberOfQuestions
    )}\n ${utils.deadline}: <t:${unixtime}:f>`;

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(questionData.question);
    questionData.options;
    type key = 'A' | 'B' | 'C' | 'D';
    const randomlySortedKeys: AnswerType[] = this.shuffleArray([
      'A',
      'B',
      'C',
      'D',
    ]);

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
   * @returns
   */
  public static exportDeadline(
    date: Date,
    cooltime: number
  ): { deadlineTime: number; deadlineDate: Date } {
    const deadlineTime = date.getTime() + cooltime * 1000;

    const hour = Math.floor(cooltime / 3600);
    const min = Math.floor((cooltime % 3600) / 60);
    const rem = cooltime % 60;

    const deadlineDate = date;
    deadlineDate.setHours(deadlineDate.getHours() + hour);
    deadlineDate.setMinutes(deadlineDate.getMinutes() + min);
    deadlineDate.setSeconds(deadlineDate.getSeconds() + rem);
    return { deadlineTime, deadlineDate };
  }
}
