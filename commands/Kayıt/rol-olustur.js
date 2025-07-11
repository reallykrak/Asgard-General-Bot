const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  name: "rol-oluştur",
  description: "Yeni bir rol oluşturursun!",
  type: 1,
  options: [
    { name: "isim", description: "Oluşturulacak rolün adı!", type: 3, required: true },
  ],
  run: async (client, interaction) => {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({ content: "❌ | Rolleri Yönet Yetkin Yok!", ephemeral: true });
    }
      
    const isim = interaction.options.getString("isim");

    try {
        await interaction.guild.roles.create({ name: isim });
        const embed = new EmbedBuilder()
            .setColor("Green")
            .setDescription(`✅ | Başarıyla **${isim}** adında bir rol oluşturuldu!`);
        interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error("Rol oluşturma hatası:", error);
        interaction.reply({ content: "❌ | Rol oluşturulurken bir hata oluştu. Yetkilerimi kontrol edin.", ephemeral: true });
    }
  },
};