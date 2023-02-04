export const utils = {
  categoryName: 'QUIZ',
  quizChannelName: 'quiz',
  quizManagementChannelName: 'quiz-management',
  quizTemplateCommandName: '!quiz-template',
  quizImportCommandName: '!quiz-import',
  quizAnswersCommandName: '!quiz-answers',
  quizStartCommandName: '!quiz-start',
  initialSendMessage:
    '@here \n**quiz-botの使い方**\n\n**csvテンプレート出力コマンド**：```!quiz-template```（quiz-managementチャンネル内のみ有効）\n\n**クイズ問題csvアップロードコマンド（2回目のアップロード以降、データ追加ではなく上書き形式です）**：```!quiz-import```（quiz-managementチャンネル内のみ有効かつcsvファイルを添付したうえでコマンド入力必須）\n\n**回答一覧csv出力**：```!quiz-answers```（quiz-managementチャンネル内のみ有効）\n\n**クイズ開始コマンド**：```!quiz-start```（quizチャンネル内のみ有効）',
  importSuccessReply: 'csvの読み込みに成功しました。',
  importErrorReply0: 'csvファイルを添付してください。',
  importErrorFormatReply: 'csvファイルの入力に誤りがあります。',
  importErrorReplyMoreThan2:
    '添付ファイルが多すぎます。1つだけcsvファイルを添付してください。',
  mustUseInServer: 'サーバーで実行する必要があります。',
  noUserInfo: 'ユーザー情報がありません。管理者に問い合わせてください。',
  coolTimeError:
    '!quiz-startコマンドの制限時間のエラーが生じています。管理者に問い合わせてください。',
  questionNumber: (order: number, numberOfQuestions: number) => {
    return `第${order + 1}問 / 全${numberOfQuestions}問`;
  },
  deadline: '制限時間',
  placeholder: '選択してください。',
  quizEnd: 'お疲れ様でした！クイズは終了です。',
  systemError: 'システムエラーが発生しています。管理者に問い合わせてください。',
  quizRetry:
    '制限時間を超過しています。もう一度!quiz-startでクイズをやり直してください。',
};
