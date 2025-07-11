const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./config.json");
const { loadEvents } = require("./function/eventLoader");
const chalk = require("chalk");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember
    ],
});

client.commands = new Collection();
client.config = config;
client.cooldowns = new Collection();
global.client = client;

// Olayları Yükle
loadEvents(client);

// ========================================================================
// Gelişmiş Komut Yükleme ve Renklendirme Bölümü
// ========================================================================

console.log(chalk.gray("----------------------------------------"));
console.log(chalk.magenta.bold("⚡ Komutlar Yükleniyor..."));
const commandsPath = path.join(__dirname, 'commands');

if (!fs.existsSync(commandsPath)) {
    console.error(chalk.red.bold(`[FATAL HATA]`) + chalk.yellow(` 'commands' klasörü bulunamadı! Lütfen botun ana dizininde bu klasörü oluşturun.`));
    process.exit(1);
}

const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    console.log(chalk.cyan(`\n📁 Klasörden yükleniyor: ${folder}`));

    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        try {
            const commandOrModule = require(filePath);

            // Başarıyla yüklenen komutu loglama fonksiyonu
            const logSuccess = (cmdName) => {
                console.log(chalk.green("  --> BAŞARILI  ") + chalk.white(`Komut Yüklendi: `) + chalk.red.bold(`/${cmdName}`));
            };

            if (commandOrModule.commands && typeof commandOrModule.initialize === 'function') {
                // Çoklu komut içeren modül
                commandOrModule.commands.forEach(cmd => {
                    if (cmd.name && cmd.run) {
                        client.commands.set(cmd.name, cmd);
                        logSuccess(cmd.name);
                    } else {
                        console.log(chalk.yellow(`  [UYARI] ${file} içindeki bir komut 'name' veya 'run' içermiyor.`));
                    }
                });
                commandOrModule.initialize(client);
            } else if (Array.isArray(commandOrModule)) {
                // Komut dizisi export eden dosya
                commandOrModule.forEach(cmd => {
                    if (cmd.name && cmd.run) {
                        client.commands.set(cmd.name, cmd);
                        logSuccess(cmd.name);
                    }
                });
            } else if (commandOrModule.name && commandOrModule.run) {
                // Tek komut objesi export eden dosya
                client.commands.set(commandOrModule.name, commandOrModule);
                logSuccess(commandOrModule.name);
            } else {
                console.log(chalk.yellow(`  [UYARI] ${file} dosyası geçerli bir komut yapısı içermiyor, atlanıyor.`));
            }
        } catch (error) {
            console.error(chalk.red.bold(`  [YÜKLEME HATASI]`) + chalk.yellow(` ${file} yüklenemedi:`), error);
        }
    }
}
console.log(chalk.magenta.bold("\n✨ Tüm komutlar başarıyla yüklendi."));
console.log(chalk.gray("----------------------------------------"));

client.login(config.token);