import {
  Client,
  Events,
  Message,
  GatewayIntentBits,
  PermissionsBitField,
  InteractionType,
} from 'discord.js';
import { CsvController } from './csvController';
import { ChannelController } from './channelController';
import { QuizController } from './quizController';
import { GuildController } from './guildController';
import admin from 'firebase-admin';
import { utils } from '../utils';
import { ChannelData } from '../models/channelModel';

/**
 * nodejs起動時に発火するclientの処理
 */
export class ClientlController {
  private token: string;
  private client: Client;
  private channels: ChannelData[] = [];

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

  public login() {
    this.client.once(Events.ClientReady, (c) => {
      console.log(`Ready! Logged in as ${c.user.tag}`);
    });
    this.client.login(this.token);
  }

  /**
   * botがサーバーに参加した際、quizチャンネルを作成
   * @param db
   */
  public guildCreate(db: admin.firestore.Firestore) {
    this.client.on('guildCreate', async (guild) => {
      await Promise.all([
        ChannelController.create(guild, this.client.user?.id ?? '', db),
        GuildController.create(guild, db),
      ]);
    });
  }

  /**
   * selectmenuを選択した際に発火する
   * @param db
   */
  public interactionCreate(db: admin.firestore.Firestore) {
    this.client.on('interactionCreate', async (interaction) => {
      console.log({ interaction });

      // quizチャンネル情報を取得
      if (this.channels.length === 0) {
        this.channels = await ChannelController.getChannels(
          interaction.guild?.id ?? '',
          db
        );
      }

      // サーバー情報が読み取れない場合はエラー
      if (!interaction.guildId && interaction.isRepliable()) {
        await interaction.reply({
          content: utils.mustUseInServer,
        });
        return;
      }
      // quizチャンネルのIDを取得
      const channelId = ChannelController.getQuizChannel(this.channels).id;

      if (
        interaction.type === InteractionType.MessageComponent &&
        interaction.isStringSelectMenu() &&
        interaction.isRepliable() &&
        interaction.channelId === channelId
      ) {
        await QuizController.reply(interaction, db);
      }
    });
  }

  /**
   * メッセージが送られた際に発火
   * @param db
   * @param strage
   */
  public messageCreate(
    db: admin.firestore.Firestore,
    strage: admin.storage.Storage
  ) {
    this.client.on('messageCreate', async (message) => {
      // bot自身のmessageは無視
      if (message.author.id == this.client.user?.id) {
        return;
      }
      // サーバー情報が読み取れない場合はエラー
      if (!message.guildId) {
        await message.reply({
          content: utils.mustUseInServer,
        });
        return;
      }

      // チャンネル情報を取得
      if (this.channels.length === 0) {
        this.channels = await ChannelController.getChannels(
          message.guild?.id ?? '',
          db
        );
      }

      // 送られたメッセージが所属するチャンネルがquiz-manegementがどうか
      const isQuizManagementChannel = ChannelController.isQuizManagementChannel(
        this.channels,
        message
      );

      // 送られたメッセージが所属するチャンネルがquizチャンネルかどうか
      const isQuizChannel = ChannelController.isQuizChannel(
        this.channels,
        message
      );

      // csvテンプレート出力(quiz-managementチャンネルのみ)
      if (
        this.isAdmin(message) &&
        message.content === utils.quizTemplateCommandName &&
        isQuizManagementChannel
      ) {
        await CsvController.exportTemplate(message, strage);
      }

      // 問題選択肢csvアップロード(quiz-managementチャンネルのみ)
      if (
        this.isAdmin(message) &&
        message.content === utils.quizImportCommandName &&
        isQuizManagementChannel
      ) {
        await CsvController.importQuestions(message, db);
      }
      // 回答一覧csv出力(quiz-managementチャンネルのみ)
      if (
        this.isAdmin(message) &&
        message.content === utils.quizAnswersCommandName &&
        isQuizManagementChannel
      ) {
        await CsvController.exportAnswers(message, db);
      }
      // クイズ開始(quizチャンネルのみ)
      if (message.content === utils.quizStartCommandName && isQuizChannel) {
        await QuizController.start(message, db);
      }
      // quizチャンネルでadmin権限以外の人のコマンド以外の発言は消す
      if (
        message.content !== utils.quizStartCommandName &&
        isQuizChannel &&
        !this.isAdmin(message)
      ) {
        await message.delete();
      }
    });
  }

  // メッセージ送信者が管理者権限をもつかどうか
  public isAdmin(message: Message) {
    return message.member?.permissions.has([
      PermissionsBitField.Flags.Administrator,
    ]);
  }
}
