import {
  Client,
  Events,
  Message,
  GatewayIntentBits,
  PermissionsBitField,
  PermissionFlagsBits,
  ChannelType,
  OverwriteType,
} from 'discord.js';
import { CsvCommand } from './csv';
import { ChannelCommand } from './channel';
import admin from 'firebase-admin';
import utils from '../utils.json';

export class DiscordClient {
  token: string;
  client: Client;

  constructor(token: string) {
    this.token = token;
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });
  }

  login() {
    this.client.once(Events.ClientReady, (c) => {
      console.log(`Ready! Logged in as ${c.user.tag}`);
    });
    this.client.login(this.token);
  }

  channelCreate(db: admin.firestore.Firestore) {
    console.log('channelCreate');
    this.client.on('guildCreate', async (guild) => {
      // botがサーバーに参加した際、quizチャンネルを作成
      await ChannelCommand.create(guild, this.client.user?.id ?? '', db);
    });
  }

  messageCreate(db: admin.firestore.Firestore, strage: admin.storage.Storage) {
    console.log('messageCreate');
    this.client.on('messageCreate', async (message) => {
      // bot自身のmessageは無視
      if (message.author.id == this.client.user?.id) {
        return;
      }
      const channels = await ChannelCommand.getChannels(
        message.guildId ?? '',
        db
      );

      const isQuizManagementChannel = channels.some(
        (channel) =>
          channel.type === 'quiz-management' &&
          message.channel.id === channel.id
      );
      const isQuizChannel = channels.some(
        (channel) =>
          channel.type === 'quiz' && message.channel.id === channel.id
      );

      // csvテンプレート出力(quiz-managementチャンネルのみ)
      if (
        this.isAdmin(message) &&
        message.content === utils.quizTemplateCommandName &&
        isQuizManagementChannel
      ) {
        await CsvCommand.exportTemplate(message, strage);
      }

      // 問題選択肢csvアップロード(quiz-managementチャンネルのみ)
      if (
        this.isAdmin(message) &&
        message.content === utils.quizImportCommandName &&
        isQuizManagementChannel
      ) {
        console.log('quiz-import');
        await CsvCommand.importCsv(message, strage);
      }
      // 回答一覧csv出力(quiz-managementチャンネルのみ)
      if (
        this.isAdmin(message) &&
        message.content === utils.quizAnswersCommandName &&
        isQuizManagementChannel
      ) {
        console.log('quiz-answers');
      }
      // クイズ開始(quizチャンネルのみ)
      if (message.content === utils.quizStartCommandName && isQuizChannel) {
        console.log('quiz-start');
      }
    });
  }

  // メッセージ送信者が管理者権限をもつかどうか
  isAdmin(message: Message) {
    return message.member?.permissions.has([
      PermissionsBitField.Flags.Administrator,
    ]);
  }
}
