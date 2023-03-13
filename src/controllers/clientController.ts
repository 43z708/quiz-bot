import {
  Client,
  Events,
  Message,
  GatewayIntentBits,
  PermissionsBitField,
  InteractionType,
  CommandInteraction,
} from 'discord.js';
import { CsvController } from './csvController';
import { ChannelController } from './channelController';
import { QuizController } from './quizController';
import { GuildController } from './guildController';
import admin from 'firebase-admin';
import { utils } from '../utils';
import { ChannelData } from '../models/channelModel';
import { Commands } from '../services/commandService';

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

  public login(db: admin.firestore.Firestore) {
    this.client.once(Events.ClientReady, async (c) => {
      console.log(
        `Ready! Logged in as ${c.user.tag} on ${c.guilds.cache
          .map((guild) => guild.name)
          .join('\n')}`
      );
      if (this.client.application) {
        // 開発環境ではsetの第2引数にguildIdを入れ、本番環境ではキャッシュさせるため第2引数は不要
        await this.client.application.commands.set(Commands);
      }
      this.channels = await ChannelController.getAllChannels(db);
    });
    this.client.login(this.token);
  }

  /**
   * botがサーバーに参加した際、quizチャンネルを作成
   * @param db
   */
  public guildCreate(db: admin.firestore.Firestore) {
    this.client.on('guildCreate', async (guild) => {
      try {
      if (this.client.application) {
        // 開発環境ではsetの第2引数にguildIdを入れ、本番環境ではキャッシュさせるため第2引数は不要
        await this.client.application.commands.set(Commands);
      }
      await Promise.all([
        ChannelController.create(guild, this.client.user?.id ?? '', db),
        GuildController.create(guild, db),
      ]);
      this.channels = await ChannelController.getAllChannels(db);
    } catch (e ) {
      console.log(e)
    }
  });
  }

  /**
   * selectmenuを選択した際に発火する
   * @param db
   */
  public interactionCreate(db: admin.firestore.Firestore) {
    this.client.on('interactionCreate', async (interaction) => {
      try {
      // サーバー内のチャンネル情報を取得
      const channels = this.channels.filter(
        (channel) => channel.guildId === interaction.guild?.id
      );

      // サーバー情報が読み取れない場合はエラー
      if (!interaction.guildId && interaction.isRepliable()) {
        await interaction.reply({
          content: utils.mustUseInServer,
        });
        return;
      }

      // 送られたメッセージが所属するチャンネルがquizチャンネルかどうか
      const isQuizChannel = ChannelController.isQuizChannel(
        channels,
        interaction.channelId
      );

      // クイズ開始(quizチャンネルのみ)
      if (
        interaction.type === InteractionType.ApplicationCommand &&
        interaction.commandName === utils.quizStartCommandName &&
        isQuizChannel
      ) {
        await QuizController.start(interaction, db);
      }

      // quizチャンネルのIDを取得
      const channelId = ChannelController.getQuizChannel(channels).id;

      if (
        interaction.type === InteractionType.MessageComponent &&
        interaction.isStringSelectMenu() &&
        interaction.isRepliable() &&
        interaction.channelId === channelId
      ) {
        await QuizController.reply(interaction, db);
      }
              
    } catch (e) {
      console.log(e)
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
      try {
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
        console.log({ message });
        // サーバー内のチャンネル情報を取得
        const channels = this.channels.filter(
          (channel) => channel.guildId === message.guild?.id
        );

        // 送られたメッセージが所属するチャンネルがquiz-manegementがどうか
        const isQuizManagementChannel =
          ChannelController.isQuizManagementChannel(
            channels,
            message.channelId
          );
        console.log({ isQuizManagementChannel });

        // 送られたメッセージが所属するチャンネルがquizチャンネルかどうか
        const isQuizChannel = ChannelController.isQuizChannel(
          channels,
          message.channelId
        );
        console.log({ isQuizChannel });

        // csvテンプレート出力(quiz-managementチャンネルのみ)
        if (
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
          message.content === utils.quizAnswersCommandName &&
          isQuizManagementChannel
        ) {
          await CsvController.exportAnswers(message, db);
        }
        // quizチャンネルでadmin権限以外の人のコマンド以外の発言は消す
        if (
          message.content !== utils.quizStartCommandName &&
          isQuizChannel &&
          !this.isAdmin(message)
        ) {
          await message.delete();
        }
      } catch (e) {
        console.log({ e });
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
