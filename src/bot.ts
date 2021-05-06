import Discord from 'discord.js';
import config from '../config.json';

import admin from 'firebase-admin';
import { Watcher } from './watcher';
import { FirebaseSync } from './guild_firebase_sync';

interface BotData {
    activeConnections: Map<string, Discord.VoiceConnection>;
    firebaseUserId?: string;
}

export class Bot {
    botData: BotData = { activeConnections: new Map() };

    constructor(client: Discord.Client, prefix: string) {
        this.init(client, prefix);
    }

    async init(client: Discord.Client, prefix: string) {
        admin
            .firestore()
            .collection('watchedUsers')
            .onSnapshot((document) => {});

        client.on('message', async (message) => {
            if (message.author.bot) return;

            if (!message.content.startsWith(prefix)) return;

            const commandBody = message.content.slice(prefix.length);
            const args = commandBody.split(/ +/);
            const command = args.shift()?.toLowerCase();

            if (command === 'na') {
                message.reply('WAS IST DENN HIER LOS?');
            } else if (command === 'spy') {
                const connectedChannel = message.member?.voice.channel;
                const connection = await connectedChannel?.join();

                if (connection && message.guild) {
                    this.botData.activeConnections.set(
                        message.guild?.id,
                        connection
                    );

                    new FirebaseSync(client, message.guild.id, (members) => {
                        console.log('Updating member list');

                        connectedChannel?.members.forEach((member) => {
                            if (!members.map((m) => m.id).includes(member.id))
                                return;

                            this._watchUser(member, message.guild!.id);
                        });
                    });

                    message.reply('Sure thing, bud!');
                }
            } else if (command === 'kill') {
                if (message.guild != null) {
                    this.botData.activeConnections
                        .get(message.guild.id)
                        ?.disconnect();

                    this.botData.activeConnections.delete(message.guild.id);
                    message.reply('C ya!');
                }
            } else if (command === 'person_add') {
                const userId = message.mentions.users.first()?.id;
                const guildId = message.guild?.id;

                if (userId && guildId) {
                    admin
                        .firestore()
                        .collection('watchedUsers')
                        .doc(userId)
                        .set({
                            guildId,
                        });
                } else {
                    message.reply(
                        'You need to mention the person you want to add to the watch list.'
                    );
                }
            } else if (command === 'person_get') {
                const guildId = message.guild?.id;

                if (guildId) {
                    const documents = await admin
                        .firestore()
                        .collection('watchedUsers')
                        .where('guildId', '==', guildId)
                        .get();

                    const userNames: string[] = [];

                    for (let i = 0; i < documents.size; i++) {
                        if (documents.docs[i].exists) {
                            userNames.push(
                                (
                                    await message.guild?.members.fetch(
                                        documents.docs[i].id
                                    )
                                )?.displayName ?? ''
                            );
                        }
                    }

                    message.reply(
                        `Those individuals are on the watch list right now: ${userNames.join(
                            ', '
                        )}`
                    );
                }
            } else if (command === 'person_remove') {
                const userId = message.mentions.users.first()?.id;

                if (userId) {
                    admin
                        .firestore()
                        .collection('watchedUsers')
                        .doc(userId)
                        .delete();
                }
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

    _watchUser(member: Discord.GuildMember, guildId: string) {
        const audio = this.botData.activeConnections
            .get(guildId)
            ?.receiver.createStream(member.id, {
                mode: 'pcm',
                end: 'manual',
            });

        if (audio) {
            new Watcher(audio, 10000, async () => {
                await member.voice.kick();
            });
        }
    }
}
