import {
  Client,
  Events,
  Message,
  GatewayIntentBits,
  PermissionsBitField,
  InteractionType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { CsvCommand } from './csv';
import { ChannelCommand } from './channel';
import { QuizCommand } from './quiz';
import admin from 'firebase-admin';
import utils from '../utils.json';
import { ChannelData } from '../models/channelModel';

export class DiscordClient {
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

  public channelCreate(db: admin.firestore.Firestore) {
    console.log('channelCreate');
    this.client.on('guildCreate', async (guild) => {
      // botがサーバーに参加した際、quizチャンネルを作成
      await ChannelCommand.create(guild, this.client.user?.id ?? '', db);
    });
  }

  public interactionCreate(db: admin.firestore.Firestore) {
    console.log('interactionCreate');
    this.client.on('interactionCreate', async (interaction) => {
      console.log({ interaction });

      // quizチャンネル情報を取得
      if (this.channels.length === 0) {
        this.channels = await ChannelCommand.getChannels(
          interaction.guild?.id ?? '',
          db
        );
      }

      if (!interaction.guildId && interaction.isRepliable()) {
        await interaction.reply({
          content: utils.mustUseInServer,
        });
        return;
      }
      // quizチャンネルのIDを取得
      const channelId = ChannelCommand.getQuizChannel(this.channels).id;

      if (
        interaction.type === InteractionType.MessageComponent &&
        interaction.isStringSelectMenu() &&
        interaction.isRepliable() &&
        interaction.channelId === channelId
      ) {
        await QuizCommand.reply(interaction, db);
      }
    });
  }

  public messageCreate(
    db: admin.firestore.Firestore,
    strage: admin.storage.Storage
  ) {
    console.log('messageCreate');
    this.client.on('messageCreate', async (message) => {
      // bot自身のmessageは無視
      if (message.author.id == this.client.user?.id) {
        return;
      }
      if (!message.guildId) {
        await message.reply({
          content: utils.mustUseInServer,
        });
        return;
      }

      // チャンネル情報を取得
      if (this.channels.length === 0) {
        this.channels = await ChannelCommand.getChannels(
          message.guild?.id ?? '',
          db
        );
      }

      const isQuizManagementChannel = ChannelCommand.isQuizManagementChannel(
        this.channels,
        message
      );
      const isQuizChannel = ChannelCommand.isQuizChannel(
        this.channels,
        message
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
        await CsvCommand.importCsv(message, db);
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
        await QuizCommand.start(message, db);
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
