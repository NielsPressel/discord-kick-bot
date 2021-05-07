import Discord from 'discord.js';
import config from '../config.json';

import admin from 'firebase-admin';
import { EventHandler } from './event_handler';

interface BotData {
    activeConnections: Map<string, Discord.VoiceConnection>;
    userWatchMap: Map<string, Discord.GuildMember[]>;
    client?: Discord.Client;
}

export namespace FirebaseHandler {
    const userCollection = 'watchedUsers';
    const listeners = new Map<string, Function>();

    export function addUserToWatchList(userId: string, guildId: string) {
        admin.firestore().collection(userCollection).doc(userId).set({
            guildId,
        });
    }

    export function removeUserFromWatchList(userId: string) {
        admin.firestore().collection(userCollection).doc(userId).delete();
    }

    export async function addGuildListener(
        guildId: string,
        callback: (members: Discord.GuildMember[]) => void
    ) {
        const guild = await BotDataStorage.getClient()!.guilds.fetch(guildId);
        const func = admin
            .firestore()
            .collection(userCollection)
            .where('guildId', '==', guildId)
            .onSnapshot(async (documents) => {
                const members: Discord.GuildMember[] = [];

                for (let i = 0; i < documents.size; i++) {
                    var user = await guild.members.fetch(documents.docs[i].id);
                    members.push(user);
                }

                callback(members);
                BotDataStorage.setGuildWatchList(guildId, members);
            });

        listeners.set(guildId, func);
    }

    export function removeGuildListener(guildId: string) {
        listeners.get(guildId)!();
        listeners.delete(guildId);
        BotDataStorage.removeGuildWatchList(guildId);
    }

    export async function getGuildWatchList(guildId: string) {
        const snapshot = await admin
            .firestore()
            .collection(userCollection)
            .where('guildId', '==', guildId)
            .get();

        const members: Discord.GuildMember[] = [];
        const guild = await BotDataStorage.getClient()!.guilds.fetch(guildId);

        for (let i = 0; i < snapshot.size; i++) {
            if (snapshot.docs[i].exists) {
                members.push(await guild.members.fetch(snapshot.docs[i].id));
            }
        }

        return members;
    }
}

export namespace BotDataStorage {
    const botData: BotData = {
        activeConnections: new Map(),
        userWatchMap: new Map(),
    };

    export function addConnection(
        guildId: string,
        connection: Discord.VoiceConnection
    ) {
        botData.activeConnections.set(guildId, connection);
    }

    export function getConnection(guildId: string) {
        return botData.activeConnections.get(guildId);
    }

    export function removeConnection(guildId: string) {
        getConnection(guildId)?.disconnect();
        botData.activeConnections.delete(guildId);
    }

    export function setClient(client: Discord.Client) {
        botData.client = client;
    }

    export function getClient() {
        return botData.client;
    }

    export function setGuildWatchList(
        guildId: string,
        members: Discord.GuildMember[]
    ) {
        botData.userWatchMap.set(guildId, members);
    }

    export function getGuildWatchList(guildId: string) {
        botData.userWatchMap.get(guildId);
    }

    export function removeGuildWatchList(guildId: string) {
        botData.userWatchMap.delete(guildId);
    }
}

export class Bot {
    constructor(client: Discord.Client, prefix: string) {
        this.init(client, prefix);
    }

    async init(client: Discord.Client, prefix: string) {
        const eventHandler = new EventHandler();
        BotDataStorage.setClient(client);

        client.on('message', async (message) => {
            if (message.author.bot) return;

            if (!message.content.startsWith(prefix)) return;

            const commandBody = message.content.slice(prefix.length);
            const args = commandBody.split(/ +/);
            const command = args.shift()?.toLowerCase();

            if (command) {
                eventHandler.dispatch(command, message);
            }
        });

        client.on('voiceStateUpdate', (oldState, newState) => {
            const oldChannel = oldState.channel;
            const newChannel = newState.channel;

            if (!oldChannel && newChannel) {
            }
        });

        client.login(config.BOT_TOKEN);
    }
}
