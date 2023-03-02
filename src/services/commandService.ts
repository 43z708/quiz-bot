import { ApplicationCommandDataResolvable } from 'discord.js';

const quizStart: ApplicationCommandDataResolvable = {
  name: 'quiz-start',
  description:
    'クイズ開始コマンド（quizチャンネル内のみ有効。quizチャンネルではadmin以外のユーザーはコマンド以外のコメントは自動消去されます。）',
};
export const Commands = [quizStart];
