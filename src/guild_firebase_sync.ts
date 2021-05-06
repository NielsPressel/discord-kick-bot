import Discord, { DiscordAPIError } from 'discord.js';
import admin from 'firebase-admin';

export class FirebaseSync {
    constructor(
        client: Discord.Client,
        guildId: string,
        callback: (members: Discord.GuildMember[]) => void
    ) {
        this.init(client, guildId, callback);
    }

    async init(client: Discord.Client, guildId: string, callback: Function) {
        const guild = await client.guilds.fetch(guildId);

        admin
            .firestore()
            .collection('watchedUsers')
            .where('guildId', '==', guildId)
            .onSnapshot(async (documents) => {
                const members: Discord.GuildMember[] = [];

                for (let i = 0; i < documents.size; i++) {
                    var user = await guild.members.fetch(documents.docs[i].id);
                    members.push(user);
                }

                callback(members);
            });
    }
}
