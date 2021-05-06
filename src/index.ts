import Discord from 'discord.js';
import { connect } from 'http2';
import config from '../config.json';

interface BotData {
    activeConnection?: Discord.VoiceConnection;
}

const prefix = '!';
const client = new Discord.Client();

const botData: BotData = {};

client.on('message', async (message) => {
    if (message.author.bot) return;

    if (!message.content.startsWith(prefix)) return;

    const commandBody = message.content.slice(prefix.length);
    const args = commandBody.split(' ');
    const command = args.shift()?.toLowerCase();

    if (command === 'na') {
        message.reply('WAS IST DENN HIER LOS?');
    } else if (command === 'spy') {
        const connectedChannel = message.member?.voice.channel;
        const connection = await connectedChannel?.join();
        botData.activeConnection = connection;

        connectedChannel?.members.forEach((member) => {
            if (member.displayName === 'Kick Bot') return;

            const audio = connection?.receiver.createStream(member.id, {
                mode: 'pcm',
                end: 'manual',
            });
            audio?.addListener('data', async (chunk) => {
                const data = new DataView(chunk.buffer);

                var sum = 0.0;
                for (var i = 0; i < chunk.length / 2; i++) {
                    sum += Math.pow(data.getInt16(i * 2, true), 2);
                }

                var volumeLevel = Math.sqrt(sum / (chunk.length / 2));

                if (volumeLevel > 2500) {
                    console.log(
                        `User ${member.displayName} has a volume level of ${volumeLevel}.`
                    );
                }

                if (volumeLevel > 10000) {
                    await member.voice.kick();
                }
            });
        });
        message.reply('Sure thing, bud!');
    } else if (command === 'kill') {
        botData.activeConnection?.disconnect();
        message.reply('C ya!');
    }
});

client.login(config.BOT_TOKEN);
