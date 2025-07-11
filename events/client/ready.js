const { ActivityType } = require("discord.js");
const figlet = require("figlet");
const chalk = require("chalk");
const gradient = require("gradient-string");

module.exports = {
    name: "ready",
    once: true,
    // Fonksiyonu async olarak işaretliyoruz çünkü içinde await kullanacağız.
    async execute(client) {

        console.log('\n\n');

        const botName = client.user.username.toUpperCase();
        // figlet'in callback fonksiyonunu da async yapıyoruz.
        figlet(botName, {
            font: 'ANSI Shadow',
            horizontalLayout: 'fitted'
        }, async (err, data) => { // async eklendi
            if (err) {
                console.log(chalk.red('ASCII başlık oluşturulamadı!'));
                return;
            }

            // Kırmızı, Mavi ve Magenta renklerini içeren bir gradient oluşturur.
            const colors = gradient([
                '#ff0000', // Kırmızı
                '#0000ff', // Mavi
                '#ff00ff'  // Magenta
            ]);

            // ASCII yazısını oluşturulan renklerle konsola yazdırır.
            console.log(colors.multiline(data));

            client.user.setPresence({
                activities: [{ name: `Nuron's Krak Bots is the best`, type: ActivityType.Watching }],
                status: 'idle',
            });

            // Güncellenmiş giriş mesajı
            console.log(chalk.green.bold('--> BAŞARILI ') + chalk.white.bold(`| ${client.user.username} başarıyla giriş yaptı!`));
            console.log(chalk.gray("----------------------------------------"));

            // --- YENİ EKLENEN KOD BAŞLANGICI ---
            try {
                // Global komutları çek ve ID'lerini kaydet
                const commands = await client.application.commands.fetch();
                client.commandIds = new Map(); // client üzerinde yeni bir Map oluştur
                commands.forEach(command => {
                    client.commandIds.set(command.name, command.id);
                });
                console.log(chalk.blue.bold('--> BİLGİ    ') + chalk.white.bold(`| ${client.commandIds.size} adet slash komutu ID\'si başarıyla yüklendi.`));
                console.log(chalk.gray("----------------------------------------"));
            } catch (error) {
                console.error(chalk.red.bold('--> HATA     ') + chalk.white.bold('| Slash komutları yüklenirken bir hata oluştu:'), error);
                console.log(chalk.gray("----------------------------------------"));
            }
            // --- YENİ EKLENEN KOD SONU ---
        });
    },
};