const { EmbedBuilder } = require("discord.js");
const db = require("croxydb");

module.exports = {
    name: "kayıt-istatistik",
    description: "Bir yetkilinin veya kendinizin kayıt sayısını gösterir.",
    type: 1,
    options: [
        {
            name: "yetkili",
            description: "İstatistiklerine bakılacak yetkili.",
            type: 6, // User Tipi
            required: false 
        }
    ],
    run: async (client, interaction) => {
        // Hedef kullanıcıyı belirle (seçenek varsa o, yoksa komutu kullanan)
        const user = interaction.options.getMember("yetkili") || interaction.member;

        // Veritabanından kayıt sayısını al (yoksa 0)
        const count = db.get(`kayit_sayisi_${interaction.guild.id}_${user.id}`) || 0;

        const embed = new EmbedBuilder()
            .setColor("Yellow")
            .setAuthor({ name: `${user.user.tag} Kayıt İstatistikleri`, iconURL: user.displayAvatarURL() })
            .setDescription(`> **${user}** kullanıcısı toplamda **${count}** kişiyi kaydetmiş.`);
            
        await interaction.reply({ embeds: [embed] });
    }
};