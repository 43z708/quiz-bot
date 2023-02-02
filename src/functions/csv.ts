import {
  Client,
  Events,
  Message,
  GatewayIntentBits,
  PermissionsBitField,
  PermissionFlagsBits,
  ChannelType,
  OverwriteType,
  GuildMember,
} from 'discord.js';
import { channelDataConverter, ChannelDataType } from '../types/channelData.js';
import admin from 'firebase-admin';
import utils from '../utils.json';

export class CsvCommand {
  /**
   * CSVのテンプレート出力
   * @param message
   * @param strage
   */
  static async exportTemplate(
    message: Message,
    strage: admin.storage.Storage
  ): Promise<void> {
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
   * @param strage
   */
  static async importCsv(
    message: Message,
    strage: admin.storage.Storage
  ): Promise<void> {
    const urls = message.attachments.map((attachment) => attachment.url);
    if (urls.length === 1 && urls[0]) {
      const csvfile = new XMLHttpRequest(); //要修正
      csvfile.open('get', urls[0], true);
      csvfile.send(null);
      csvfile.onload = () => {
        const resultData = this.convertCSV(csvfile.responseText);
        console.log({ resultData });
      };
    } else if (urls.length === 0) {
      message.reply(utils.importErrorReply0);
    } else {
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
    const tmp = csvdata.split('\n'); // 改行を基準にデータを行ごとで配列化
    // 各行ごとにカンマで区切った文字列の配列データを生成
    if (tmp.length > 0) {
      for (let i = 0; i < tmp.length; i++) {
        var tmpROW = tmp[i]?.split(',') ?? [];
        if (tmpROW.length > 0) {
          resultdata[i] = tmpROW;
        }
      }
    }
    return resultdata;
  }
}
