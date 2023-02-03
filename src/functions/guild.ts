import {
  Client,
  Events,
  Message,
  GatewayIntentBits,
  Guild,
  PermissionFlagsBits,
  ChannelType,
  OverwriteType,
  StringSelectMenuInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';

import admin from 'firebase-admin';
import utils from '../utils.json';
import { GuildModel, GuildData } from '../models/guildModel';

export class GuildCommand {
  public static async create(
    guild: Guild,
    db: admin.firestore.Firestore
  ): Promise<void> {
    const guildModel = new GuildModel(db);
    const guildData: GuildData = {
      id: guild.id,
      name: guild.name,
      cooltime: 6 * 3600,
      numberOfQuestions: 30,
    };
    await guildModel.setGuild(guildData);
  }

  public static async get(
    guildId: string,
    db: admin.firestore.Firestore
  ): Promise<GuildData | null> {
    const guildModel = new GuildModel(db);
    return await guildModel.getGuild(guildId);
  }
}
