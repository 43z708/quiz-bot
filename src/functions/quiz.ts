import {
  Client,
  Events,
  Message,
  GatewayIntentBits,
  Guild,
  PermissionFlagsBits,
  ChannelType,
  OverwriteType,
  StringSelectMenuInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';

import admin from 'firebase-admin';
import utils from '../utils.json';
import { QuestionModel } from '../models/questionModel';
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

      if (user) {
        const deadline = this.exportDeadline(user.startedAt.toDate(), cooltime);
        const now = new Date().getTime();

        // 2回目以降cooltime未満ならスルー
        if (now <= deadline.deadlineTime) {
          await message.reply(utils.coolTimeError);
          return;
        } else {
          // 2回目以降cooltime以降なら最初からやり直し
          userModel.setUser(
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
        const deadline = this.exportDeadline(new Date(), cooltime);
        userModel.setUser(
          message.author,
          message.guildId,
          roundedQuestionIds,
          admin.firestore.Timestamp.fromDate(new Date()),
          admin.firestore.Timestamp.fromDate(deadline.deadlineDate),
          0,
          0
        );
      }
      await message.reply({
        content: 'Pong!',
        components: [this.quizComponent()],
      });
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
      user.guildId === interaction.guildId
    ) {
      const deadline = user.deadline.toDate();
      const now = new Date();

      if (now.getTime() < deadline.getTime()) {
        // cooltime以内
        if (user.order + 1 === user.questions.length) {
          // 最後の問題(userModelは変更の必要なし)
          // 終わりのメッセージ
        } else {
          // 途中の問題
          userModel.setUser(
            interaction.user,
            interaction.guildId!,
            user.questions,
            user.startedAt,
            user.deadline,
            user.order + 1,
            user.round
          );
          // 次の問題を出題
        }
      } else {
        // cooltime以降
        if (user.order + 1 === user.questions.length) {
          // 最後の問題で存在しないinteractionのはずなのでエラーを返す
        } else {
          // 途中の問題で時間経過してしまっているのでやり直すようメッセージ
        }
      }
    }
  }

  public static quizComponent(): ActionRowBuilder<StringSelectMenuBuilder> {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select')
        .setPlaceholder('Nothing selected')
        .addOptions(
          {
            label: 'Select me',
            description: 'This is a description',
            value: 'first_option',
          },
          {
            label: 'You can select me too',
            description: 'This is also a description',
            value: 'second_option',
          }
        )
    );
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
