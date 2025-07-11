const fs = require("fs");
const chalk = require("chalk"); // Chalk eklendi

function loadEvents(client) {
    const eventFolders = fs.readdirSync("./events");
    console.log(chalk.cyan.bold("🌀 Olaylar Yükleniyor..."));

    for (const folder of eventFolders) {
        const eventFiles = fs
            .readdirSync(`./events/${folder}`)
            .filter(file => file.endsWith(".js"));

        for (const file of eventFiles) {
            const event = require(`../events/${folder}/${file}`);

            if (event.once) {
                client.once(event.name, (...args) => event.execute(client, ...args));
            } else {
                client.on(event.name, (...args) => event.execute(client, ...args));
            }

            console.log(chalk.blue("  ↳ BAŞARILI  ") + chalk.white(`Olay Yüklendi: `) + chalk.magenta.bold(`${event.name}`));
        }
    }
    console.log(chalk.cyan.bold("✨ Tüm olaylar başarıyla yüklendi.\n"));
}

module.exports = { loadEvents };