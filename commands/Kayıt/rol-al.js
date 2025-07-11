const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  name: "rol-al",
  description: "Bir kullanıcıdan rol alırsın!",
  type: 1,
  options: [
    { name: "user", description: "Rolü alınacak kullanıcıyı seçin!", type: 6, required: true },
    { name: "rol", description: "Alınacak rolü etiketleyin!", type: 8, required: true },
  ],
  run: async (client, interaction) => {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({ content: "❌ | Rolleri Yönet Yetkin Yok!", ephemeral: true });
    }

    const rol = interaction.options.getRole("rol");
    const user = interaction.options.getMember("user");
    const botMember = interaction.guild.members.me;

    if (rol.position >= botMember.roles.highest.position) {
      return interaction.reply({
          embeds: [ new EmbedBuilder().setColor("Red").setDescription("❌ | Benim rolüm, bu rolü alabileceğim kadar yüksek değil!") ],
          ephemeral: true
      });
    }
    
    if (!user.roles.cache.has(rol.id)) {
        return interaction.reply({
            embeds: [ new EmbedBuilder().setColor("Red").setDescription(`❌ | ${user} kullanıcısında zaten bu rol bulunmuyor.`) ],
            ephemeral: true
        });
    }

    try {
      await user.roles.remove(rol);
      const embed = new EmbedBuilder()
        .setColor("Green")
        .setDescription(`✅ | Başarıyla ${user} kullanıcısından **${rol.name}** rolü alındı!`);
      interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Rol alma sırasında bir hata oluştu:", error);
      interaction.reply({ content: "❌ | Rol alma sırasında bir hata oluştu. Yetkilerimi kontrol edin.", ephemeral: true });
    }
  },
};