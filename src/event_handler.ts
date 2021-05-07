import Discord from 'discord.js';
import { BotDataStorage, FirebaseHandler } from './bot';
import { Watcher } from './watcher';

export class EventHandler {
    dispatch(command: string, ...args: any[]) {
        switch (command) {
            case 'na': {
                const message: Discord.Message = args[0];
                message.reply("I'm online!");
                break;
            }
            case 'spy': {
                const message: Discord.Message = args[0];
                this._spy(message);
                break;
            }
            case 'kill': {
                const message: Discord.Message = args[0];
                this._kill(message);
                break;
            }
            case 'person_add': {
                const message: Discord.Message = args[0];
                this._addPerson(message);
                break;
            }
            case 'person_get': {
                const message: Discord.Message = args[0];
                this._getPerson(message);
                break;
            }
            case 'person_remove': {
                const message: Discord.Message = args[0];
                const userId = message.mentions.users.first()?.id;

                if (userId) {
                    FirebaseHandler.removeUserFromWatchList(userId);
                }
            }
        }
    }

    async _spy(message: Discord.Message) {
        const connectedChannel = message.member?.voice.channel;
        const connection = await connectedChannel?.join();

        if (connection && message.guild) {
            BotDataStorage.addConnection(message.guild?.id, connection);

            FirebaseHandler.addGuildListener(message.guild.id, (members) => {
                connectedChannel?.members.forEach((member) => {
                    if (!members.map((m) => m.id).includes(member.id)) return;

                    this._watchUser(member, message.guild!.id);
                });
            });

            message.reply('Sure thing, bud!');
        }
    }

    _kill(message: Discord.Message) {
        if (message.guild) {
            BotDataStorage.removeConnection(message.guild.id);
            FirebaseHandler.removeGuildListener(message.guild.id);

            message.reply('C ya!');
        }
    }

    _addPerson(message: Discord.Message) {
        const userId = message.mentions.users.first()?.id;
        const guildId = message.guild?.id;

        if (userId && guildId) {
            FirebaseHandler.addUserToWatchList(userId, guildId);

            message.reply('User was added to the watch list successfully.');
        } else {
            message.reply(
                'You need to mention the person you want to add to the watch list.'
            );
        }
    }

    async _getPerson(message: Discord.Message) {
        const guildId = message.guild?.id;

        if (guildId) {
            const members = await FirebaseHandler.getGuildWatchList(guildId);

            message.reply(
                `Those individuals are on the watch list right now: ${members
                    .map((member) => member.displayName)
                    .join(', ')}`
            );
        }
    }

    // ----------------------------------------------------------------------
    // ------------------------ Not an event handler ------------------------
    // ----------------------------------------------------------------------

    _watchUser(member: Discord.GuildMember, guildId: string) {
        const audio = BotDataStorage.getConnection(
            guildId
        )?.receiver.createStream(member.id, {
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
