import {
  Message,
  EmbedBuilder,
  StringSelectMenuInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import admin from 'firebase-admin';
import { utils } from '../utils';
import { QuestionModel, CorrectType } from '../models/questionModel';
import { UserModel } from '../models/userModel';
import { GuildController } from './guildController';
import { GuildData } from '../models/guildModel';
import { QuestionData } from '../models/questionModel';
import { AnswerModel } from '../models/answerModel';
import { QuizService } from '../services/quizService';
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
      const answerModel = new AnswerModel(db);
      // 一連の回答に対する一意なidを付与する
      const answerId = await answerModel.createId(message.guildId);

      // ユーザー情報、全問題ID、サーバー情報を取得
      const response = await Promise.all([
        userModel.getUser(message.author.id, message.guildId),
        new QuestionModel(db).index(message.guildId),
        GuildController.get(message.guildId, db),
      ]);
      const user = response[0];
      const questions: QuestionData[] = response[1];
      const questionIds: string[] = questions.map((question) => question.id);
      const guildData: GuildData | null = response[2];
      if (!guildData) {
        return;
      }
      // そもそもクイズがなかったら無視
      if (questions.length === 0) {
        return;
      }
      // クールタイム
      const cooltime = guildData.cooltime;
      // 問題数
      const numberOfQuestions = guildData.numberOfQuestions;
      // 問題番号をシャッフル
      const randomlySortedQuestionIds = QuizService.shuffleArray(questionIds);
      // csv問題数が設定問題数以下ならそのまま、csv問題数が設定問題数より多ければカット
      const roundedQuestionIds =
        questionIds.length <= numberOfQuestions
          ? randomlySortedQuestionIds
          : randomlySortedQuestionIds.slice(0, numberOfQuestions);

      // 現在時刻からクールタイムを考慮した締切時間を算出
      const now = new Date();
      const deadline = QuizService.exportDeadline(new Date(), cooltime);
      const nowTime = now.getTime();

      if (user && nowTime <= user.deadline.toDate().getTime()) {
        // クイズ2回目以降の回答(すでにユーザー情報があるため)
        // 締切時間前にクイズを!quiz-startで再開することはできない。(discord上でcooltime設定を変えている可能性を考慮)
        await message.reply(utils.coolTimeError).then((msg) => {
          setTimeout(() => msg.delete(), 10000);
        });
        return;
      }

      if (roundedQuestionIds[0]) {
        // クイズ1問目を送信
        const component = await QuizService.getQuizComponent(
          message.author.id,
          message.guildId,
          answerId,
          0,
          roundedQuestionIds.length,
          deadline.deadlineTime,
          roundedQuestionIds[0],
          db
        );
        await message.reply(component);
      }

      // dbの整理
      if (user) {
        // cooltimeを過ぎているため、!quiz-startを許可
        // ユーザー情報を更新
        await userModel.setUser(
          message.author,
          message.guildId,
          roundedQuestionIds,
          admin.firestore.Timestamp.fromDate(now),
          admin.firestore.Timestamp.fromDate(deadline.deadlineDate),
          0,
          user.round + 1
        );
      } else {
        // 初回なのでユーザー情報を保存
        await userModel.setUser(
          message.author,
          message.guildId,
          roundedQuestionIds,
          admin.firestore.Timestamp.fromDate(now),
          admin.firestore.Timestamp.fromDate(deadline.deadlineDate),
          0,
          0
        );
      }

      await answerModel.create({
        answerId: answerId,
        startedAt: admin.firestore.Timestamp.fromDate(now),
        round: user ? user.round + 1 : 0,
        message: message,
        questions: questions,
        numberOfQuestions: roundedQuestionIds.length,
      });

      await message.delete();
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
    try {
      const userModel = new UserModel(db);
      const user = await userModel.getUser(
        interaction.user.id,
        interaction.guildId!
      );

      // user情報が存在しない場合エラー
      if (!user) {
        await interaction.reply(utils.noUserInfo);
        return;
      }

      // customIdからanswerIdとquestionIdを取得
      const obj = QuizService.fromCustomId(interaction.customId);
      if (obj === null) {
        return;
      }
      const answerId = obj.answerId;
      const questionId = obj.questionId;
      // interaction情報に対し、ユーザー、サーバー、クイズの問題IDの一致を確認し、interaction.values[0]つまり回答が返ってきていることを確認
      if (
        user.id === interaction.user.id &&
        user.guildId === interaction.guildId &&
        user.questions[user.order] === questionId &&
        interaction.values[0]
      ) {
        const deadline = user.deadline.toDate();
        const now = new Date();

        const answerModel = new AnswerModel(db);

        if (now.getTime() < deadline.getTime()) {
          // 締切時間前
          if (user.order + 1 >= user.questions.length) {
            // 最後の問題(userModelは変更の必要なし)
            await answerModel.update({
              answerId: answerId,
              guildId: user.guildId,
              userId: user.id,
              startedAt: user.startedAt,
              finishedAt: admin.firestore.Timestamp.fromDate(now),
              round: user.round,
              questionId: questionId,
              answer: interaction.values[0],
            });
            // 終了メッセージを送信
            await interaction.channel
              ?.send(`<@!${user.id}> ${utils.quizEnd}`)
              .then((msg) => {
                setTimeout(() => msg.delete(), 10000);
              });
            await interaction.message.delete();
          } else {
            await interaction.deferReply();

            // 次の問題を出題、ユーザー情報を更新
            const response = await Promise.all([
              QuizService.getQuizComponent(
                interaction.user.id,
                interaction.guildId,
                answerId,
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
              answerModel.update({
                answerId: answerId,
                guildId: user.guildId,
                userId: user.id,
                startedAt: user.startedAt,
                finishedAt: null,
                round: user.round,
                questionId: questionId,
                answer: interaction.values[0],
              }),
            ]);
            await interaction.editReply(response[0]);
            await interaction.message.delete();
          }
        } else {
          // 締切時間を過ぎた
          if (user.order + 1 > user.questions.length) {
            // 存在しないinteractionのはずなのでエラーを返す
            await interaction.channel
              ?.send(`<@!${user.id}> ${utils.systemError}`)
              .then((msg) => {
                setTimeout(() => msg.delete(), 10000);
              });
            await interaction.message.delete();
          } else {
            // 全問題を回答する前に時間経過してしまっているのでやり直すようメッセージ
            await interaction.channel
              ?.send(`<@!${user.id}> ${utils.quizRetry}`)
              .then((msg) => {
                setTimeout(() => msg.delete(), 10000);
              });
            await interaction.message.delete();
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
}
