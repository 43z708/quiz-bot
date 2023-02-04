export class CsvService {
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
