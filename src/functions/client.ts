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
import { CsvCommand } from './csv.js';
import admin from 'firebase-admin';

export class DiscordClient {
  token: string;
  client: Client;

  constructor(token: string) {
    this.token = token;
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
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

  channelCreate(db: admin.firestore.Firestore, bucket: any) {
    this.client.on('guildMemberAdd', async (member) => {
      // botがサーバーに参加した際、quizチャンネルを作成
      if (member.id == this.client.user?.id) {
        const category = await member.guild.channels.create({
          name: 'QUIZ',
          type: ChannelType.GuildCategory,
        });
        const quizChannel = await member.guild.channels.create({
          name: 'quiz',
          type: ChannelType.GuildText,
          rateLimitPerUser: 60,
        });
        const quizManagementChannel = await member.guild.channels.create({
          name: 'quiz-management',
          permissionOverwrites: [
            {
              id: member.guild.roles.everyone.id,
              type: OverwriteType.Role,
              deny: [PermissionFlagsBits.ViewChannel],
            },
          ],
        });
        quizChannel.setParent(category.id);
        quizManagementChannel.setParent(category.id);
      }
    });
  }

  messageCreate(db: admin.firestore.Firestore, bucket: any) {
    console.log('messageCreate');
    this.client.on('messageCreate', async (message) => {
      console.log({ message });
      // bot自身のmessageは無視
      if (message.author.id == this.client.user?.id) {
        return;
      }
      // csvテンプレート出力
      if (this.isAdmin(message) && message.content === '!quiz-template') {
        const csvCommand = new CsvCommand();
        await csvCommand.outputTemplate(message, bucket);
      }

      // csv問題入力
      if (this.isAdmin(message) && message.content === '!quiz-import') {
      }
      // 回答一覧csv出力
      if (this.isAdmin(message) && message.content === '!quiz-answers') {
      }
      // クイズ開始
      if (message.content === '!quiz-start') {
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
