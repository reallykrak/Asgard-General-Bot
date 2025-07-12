const {
    EmbedBuilder,
    ApplicationCommandType,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require("discord.js");
const fs = require("fs");
const config = require("../../config.json");

module.exports = {
    name: "yardım",
    description: "Botun komutlarını listeler!",
    type: ApplicationCommandType.ChatInput,
    cooldown: 5,

    run: async (client, interaction) => {
        // Komut klasörlerini ve toplam komut sayısını all
        const commandFolders = fs.readdirSync("./commands");
        let totalCommands = 0;
        client.commands.forEach(() => totalCommands++);

        // Ana Yardım Embed'i
        const mainEmbed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle("📚 | Komut Listesi")
            .setDescription(
                `Aşağıdaki menüden bir kategori seçerek komutları görüntüleyebilirsiniz.\nKomut aramak için "Komut Ara" butonunu kullanabilirsiniz.\n\n**Toplam Komut Sayısı: ${totalCommands}**`
            )
            .setThumbnail(client.user.displayAvatarURL())
            .setFooter({ text: client.config.footer })
            .setTimestamp();

        // Kategori Seçim Menüsü
        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId("category-select")
            .setPlaceholder("Bir kategori seçin")
            .addOptions(
                commandFolders.map((folder) => ({
                    label: folder.charAt(0).toUpperCase() + folder.slice(1),
                    description: `${folder.charAt(0).toUpperCase() + folder.slice(1)
                        } kategorisindeki komutları görüntüle`,
                    value: folder,
                }))
            );

        // Butonlar
        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("search-commands")
                .setLabel("Komut Ara")
                .setStyle(ButtonStyle.Primary)
                .setEmoji("🔍"),
            new ButtonBuilder()
                .setLabel("Sunucuya Ekle")
                .setStyle(ButtonStyle.Link)
                .setURL(config["bot-davet"]),
            new ButtonBuilder()
                .setLabel("Destek Sunucusu")
                .setStyle(ButtonStyle.Link)
                .setURL(config.desteksunucusu)
        );

        const categoryRow = new ActionRowBuilder().addComponents(categorySelect);

        // İlk Cevabı Gönder
        const response = await interaction.reply({
            embeds: [mainEmbed],
            components: [categoryRow, buttonRow],
        });

        // Etkileşimleri dinlemek için Collector
        const collector = response.createMessageComponentCollector({
            time: 300000, // 5 dakika
        });

        collector.on("collect", async (i) => {
            // Menüden kategori seçildiğinde
            if (i.customId === "category-select") {
                const selectedCategory = i.values[0];
                const commandFiles = fs
                    .readdirSync(`./commands/${selectedCategory}`)
                    .filter((file) => file.endsWith(".js"));

                let commandList = "";
                for (const file of commandFiles) {
                    const commandModule = require(`../../commands/${selectedCategory}/${file}`);
                    const commands = Array.isArray(commandModule) ? commandModule : [commandModule];

                    for (const cmd of commands) {
                        if (cmd.name && cmd.description) {
                            const commandId = client.commandIds?.get(cmd.name);
                            if (commandId) {
                                // DÜZELTİLDİ: Gereksiz tırnak işaretleri kaldırıldı.
                                commandList += `> </${cmd.name}:${commandId}> - ${cmd.description}\n`;
                            } else {
                                commandList += `> \`/${cmd.name}\` - ${cmd.description}\n`; // ID bulunamazsa normal göster
                            }
                        }
                    }
                }

                const categoryEmbed = new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setTitle(`📁 ${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Komutları`)
                    .setDescription(commandList || "Bu kategoride komut bulunamadı.")
                    .setFooter({ text: client.config.footer })
                    .setTimestamp();

                await i.update({ embeds: [categoryEmbed] });
            }

            // Komut arama butonuna tıklandığında
            if (i.customId === "search-commands") {
                const searchModal = new ModalBuilder()
                    .setCustomId("command-search-modal")
                    .setTitle("Komut Arama");

                const searchInput = new TextInputBuilder()
                    .setCustomId("search-input")
                    .setLabel("Aramak İstediğiniz Komut Adı")
                    .setPlaceholder("Örn: ban, kick, avatar...")
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short);

                searchModal.addComponents(new ActionRowBuilder().addComponents(searchInput));
                await i.showModal(searchModal);

                try {
                    const modalInteraction = await i.awaitModalSubmit({
                        time: 60000, // 1 dakika bekle
                    });

                    const searchQuery = modalInteraction.fields.getTextInputValue("search-input").toLowerCase();
                    const allCommands = Array.from(client.commands.values());

                    const matchedCommands = allCommands.filter(
                        (cmd) =>
                            cmd.name.toLowerCase().includes(searchQuery) ||
                            cmd.description.toLowerCase().includes(searchQuery)
                    );

                    let resultDescription = "";
                    if (matchedCommands.length > 0) {
                        for (const cmd of matchedCommands) {
                            const category = commandFolders.find(folder =>
                                fs.readdirSync(`./commands/${folder}`).some(file => {
                                    const requiredFile = require(`../../commands/${folder}/${file}`);
                                    return (Array.isArray(requiredFile) && requiredFile.some(c => c.name === cmd.name)) || requiredFile.name === cmd.name;
                                })
                            ) || "Bilinmeyen";

                            const commandId = client.commandIds?.get(cmd.name);
                            if (commandId) {
                                // DÜZELTİLDİ: Gereksiz tırnak işaretleri kaldırıldı.
                                resultDescription += `> </${cmd.name}:${commandId}> *(${category})* - ${cmd.description}\n`;
                            } else {
                                resultDescription += `> \`/${cmd.name}\` *(${category})* - ${cmd.description}\n`;
                            }
                        }
                    } else {
                        resultDescription = "Aradığınız kriterlere uygun komut bulunamadı.";
                    }

                    const searchResultEmbed = new EmbedBuilder()
                        .setColor(client.config.embedColor)
                        .setTitle(`🔍 Komut Arama Sonuçları: "${searchQuery}"`)
                        .setDescription(resultDescription)
                        .setFooter({ text: `${matchedCommands.length} komut bulundu.` })
                        .setTimestamp();

                    await modalInteraction.reply({
                        embeds: [searchResultEmbed],
                        ephemeral: true,
                    });

                } catch (err) {
                    // Kullanıcı modalı zamanında doldurmazsa işlem sessizce iptal edilir.
                }
            }
        });

        collector.on("end", () => {
            const disabledSelect = new StringSelectMenuBuilder()
                .setCustomId("category-select-disabled")
                .setPlaceholder("Süre doldu, komutu tekrar kullanın.")
                .setDisabled(true)
                .addOptions({ label: 'zaman-aşımı', value: 'zaman-aşımı' });

            const disabledRow = new ActionRowBuilder().addComponents(disabledSelect);

            interaction.editReply({
                components: [disabledRow, buttonRow],
            }).catch(() => { }); // Hata yakalama
        });
    },
};
