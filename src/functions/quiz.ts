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
      ]);
      const user = response[0];
      const questionIds: string[] = response[1];
      const randomlySortedQuestionIds = this.shuffleArray(questionIds);
      if (user) {
        // 2回目以降最初からやり直し
        userModel.setUser(
          message.author,
          message.guildId,
          randomlySortedQuestionIds,
          admin.firestore.Timestamp.fromDate(new Date()),
          0,
          user.round + 1
        );
      } else {
        // 初回=>dbつくってランダムを返す
        userModel.setUser(
          message.author,
          message.guildId,
          randomlySortedQuestionIds,
          admin.firestore.Timestamp.fromDate(new Date()),
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
      // 開始時刻より6時間後を締切とする。
      const deadline = user.startedAt.toDate();
      deadline.setHours(deadline.getHours() + 6);
      const now = new Date();

      if (now.getTime() < deadline.getTime()) {
        // 6時間以内
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
            user.order + 1,
            user.round
          );
          // 次の問題を出題
        }
      } else {
        // 6時間以降
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
}
