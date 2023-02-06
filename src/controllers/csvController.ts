import { Message } from 'discord.js';
import { QuestionModel } from '../models/questionModel';
import admin from 'firebase-admin';
import { utils } from '../utils';
import fetch from 'node-fetch';
import { CsvService } from '../services/csvService';
import { AnswerModel } from '../models/answerModel';
import { AnswerService } from '../services/answerService';
import * as path from 'path';
import * as url from 'url';
/**
 * csvに関する処理
 */
export class CsvController {
  /**
   * CSVのテンプレート出力
   * @param message
   * @param strage
   */
  static async exportTemplate(
    message: Message,
    strage: admin.storage.Storage
  ): Promise<void> {
    // strageに保存しているcsvテンプレートを返す
    const url = await strage
      .bucket()
      .file('template/quiz-template.csv')
      .getSignedUrl({
        action: 'read',
        expires: '12-31-3020', //1000年後に設定
      });
    message
      .reply({
        files: url,
      })
      .then()
      .catch(console.error);
  }

  /**
   * csv問題入力
   * @param message
   */
  static async importQuestions(
    message: Message,
    db: admin.firestore.Firestore
  ): Promise<void> {
    // メッセージに添付されたファイルのurl
    const urls = message.attachments.map((attachment) => attachment.url);
    const parsedUrl = urls[0] ? url.parse(urls[0]) : null;
    const ext =
      parsedUrl && parsedUrl.pathname ? path.extname(parsedUrl.pathname) : '';

    if (urls.length === 1 && urls[0] && ext === '.csv') {
      await message.channel.sendTyping();
      // csvファイル1つのみ
      const response = await fetch(urls[0]);
      const data = await response.text();
      if (CsvService.convertFromCsvToArray(data).length !== 0) {
        // CSVを配列に変換し、DBに保存
        await new QuestionModel(db).setQuestions(
          CsvService.convertFromCsvToArray(data),
          message.guildId ?? ''
        );
        await message.reply(utils.importSuccessReply);
      } else {
        // csvが空や書式に合っていない
        message.reply(utils.importErrorFormatReply);
      }
    } else if (urls.length === 0) {
      // 添付ファイルなし
      message.reply(utils.importErrorReply0);
    } else {
      // 添付ファイルが多い
      message.reply(utils.importErrorReplyMoreThan2);
    }
  }

  static async exportAnswers(
    message: Message,
    db: admin.firestore.Firestore
  ): Promise<void> {
    await message.channel.sendTyping();
    const answerModel = new AnswerModel(db);
    const answers = await answerModel.index(message);
    if (answers) {
      const answersForCsv = AnswerService.formatCsv(answers);
      if (message.guildId && answersForCsv) {
        const file = await CsvService.convertFromArrayToCsv(
          message.guildId,
          answersForCsv
        );
        message.reply({ files: [file] });
      } else {
        message.reply(utils.csvExportError);
      }
    } else {
      message.reply(utils.csvExportError);
    }
  }
}
