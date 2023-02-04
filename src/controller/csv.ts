import { Message } from 'discord.js';
import { QuestionModel } from '../models/questionModel';
import admin from 'firebase-admin';
import { utils } from '../utils';
import fetch from 'node-fetch';

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
  static async importCsv(
    message: Message,
    db: admin.firestore.Firestore
  ): Promise<void> {
    // メッセージに添付されたファイルのurl
    const urls = message.attachments.map((attachment) => attachment.url);
    if (
      urls.length === 1 &&
      urls[0] &&
      urls[0].split(/#|?/)[0]?.split('.').pop()?.trim() === 'csv'
    ) {
      // csvファイル1つのみ
      const response = await fetch(urls[0]);
      const data = await response.text();
      if (this.convertCSV(data).length !== 0) {
        // CSVを配列に変換し、DBに保存
        await new QuestionModel(db).setQuestions(
          this.convertCSV(data),
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
  /**
   * CSVを配列に変換
   * @param csvdata
   * @returns
   */
  static convertCSV(csvdata: string): string[][] {
    const resultdata: string[][] = []; // データを入れるための配列
    csvdata = csvdata.replace(/\r\n/g, '\n'); //IE対策　改行コード\r\nを\rに変換
    csvdata = csvdata.replace(/^(\n+)|(\n+)$/g, ''); //文頭と文末の余計な改行を除去
    const tmp = csvdata.split(/\n/g); //改行で分割
    // 各行ごとにカンマで区切った文字列の配列データを生成
    if (tmp.length > 0) {
      const head = tmp[0]?.split(',') ?? [];
      if (
        head[0] === '問題' &&
        head[1] === '選択肢A' &&
        head[2] === '選択肢B' &&
        head[3] === '選択肢C' &&
        head[4] === '選択肢D' &&
        head[5] === '解答'
      ) {
        for (let i = 1; i < tmp.length; i++) {
          const tmpROW = tmp[i]?.split(',') ?? [];
          if (tmpROW.length > 0) {
            resultdata[i - 1] = tmpROW;
          }
        }
      }
      return resultdata;
    } else {
      return [];
    }
  }
}
