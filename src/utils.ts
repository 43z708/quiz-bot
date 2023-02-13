export const utils = {
  categoryName: 'QUIZ',
  quizChannelName: 'quiz',
  quizManagementChannelName: 'quiz-management',
  quizTemplateCommandName: '!quiz-template',
  quizImportCommandName: '!quiz-import',
  quizAnswersCommandName: '!quiz-answers',
  quizStartCommandName: '!quiz-start',
  initialSendMessage:
    '@here \n**quiz-botの使い方**\n\n**csvテンプレート出力コマンド**：```!quiz-template```（quiz-managementチャンネル内のみ有効）\n\n**クイズ問題csvアップロードコマンド**（2回目のアップロード以降は、既存の問題・ユーザーの回答データはすべて削除され、新しい問題データにリフレッシュされます。一部修正や追加、削除を希望の場合は開発者まで問合せてください。）：```!quiz-import```（quiz-managementチャンネル内のみ有効かつcsvファイルを添付したうえでコマンド入力必須）\n\n**回答一覧csv出力**：```!quiz-answers```（quiz-managementチャンネル内のみ有効）\n\n**クイズ開始コマンド**：```!quiz-start```（quizチャンネル内のみ有効。quizチャンネルではadmin以外のユーザーはコマンド以外のコメントは自動消去されます。）\n\n※quiz-managementチャンネル：管理者専用\n※quizチャンネル：クイズを実際に受けるチャンネル（cooltime初期値は6時間、変更の際は開発者に問合せてください。）\n※出題数初期値は30問。csvが30問以上なら30問をランダムピックアップして出題、30問未満なら全問題をシャッフルして出題されます。出題数初期値30問を変更したい場合は開発者に問い合わせてください。',
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
  deadline: 'までに全問題に回答してください。',
  placeholder: '選択してください。',
  quizEnd: 'お疲れ様でした！クイズは終了です。',
  systemError: 'システムエラーが発生しています。管理者に問い合わせてください。',
  quizRetry:
    '制限時間を超過しています。もう一度!quiz-startでクイズをやり直してください。',
  csvHeader: {
    userName: '回答者',
    percentageOfCorrects: '正答率',
    startedAt: 'クイズ開始時間',
    duration: '回答時間',
    round: '何回目',
    numberOfCorrects: '正解数',
    numberOfQuestions: '出題数',
  },
  csvExportError: 'データの読み込みの際にエラーが発生しています。',
};
