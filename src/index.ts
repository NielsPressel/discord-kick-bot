import Discord from 'discord.js';

import admin from 'firebase-admin';
import { Bot } from './bot';
const serviceAccount = require('../../ServiceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const prefix = '!';
const client = new Discord.Client();

const bot = new Bot(client, prefix);
