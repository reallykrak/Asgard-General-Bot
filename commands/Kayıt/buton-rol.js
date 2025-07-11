const {
  EmbedBuilder,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "buton-rol",
  description: "Seçtiğiniz roller için butonlu rol alma menüsü oluşturur.",
  type: 1,
  options: [
    { name: "rol1", description: "Eklenecek birinci rol.", type: 8, required: true },
    { name: "yazi", description: "Menüde görünecek açıklama yazısı.", type: 3, required: true },
    { name: "rol2", description: "Eklenecek ikinci rol.", type: 8, required: false },
    { name: "rol3", description: "Eklenecek üçüncü rol.", type: 8, required: false },
    { name: "rol4", description: "Eklenecek dördüncü rol.", type: 8, required: false },
    { name: "rol5", description: "Eklenecek beşinci rol.", type: 8, required: false },
  ],

  run: async (client, interaction) => {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({ content: "❌ | Rolleri Yönet Yetkin Yok!", ephemeral: true });
    }

    const roles = [
      interaction.options.getRole("rol1"),
      interaction.options.getRole("rol2"),
      interaction.options.getRole("rol3"),
      interaction.options.getRole("rol4"),
      interaction.options.getRole("rol5"),
    ].filter(Boolean);

    const yazi = interaction.options.getString("yazi");
    const botMember = interaction.guild.members.me;

    for (const rol of roles) {
        if (rol.position >= botMember.roles.highest.position) {
            return interaction.reply({ content: `❌ | Botun rolü, **${rol.name}** rolünü vermek için yeterince yüksek değil. Lütfen botun rolünü bu rolün üzerine taşıyın.`, ephemeral: true });
        }
    }

    // Rolleri metin olarak birleştir (etiketlemek için)
    const roleMentions = roles.map(r => r.toString()).join(", ");
    
    const embed = new EmbedBuilder()
      .setTitle("📜 Sunucu Rolleri")
      .setDescription(`${yazi}\n\nAşağıdaki butonlara tıklayarak ilgili rolleri alabilirsiniz:\n${roleMentions}`)
      .setColor("Blurple");

    const row = new ActionRowBuilder();
    const buttonStyles = [ButtonStyle.Primary, ButtonStyle.Success, ButtonStyle.Secondary, ButtonStyle.Danger];

    for (const [index, rol] of roles.entries()) {
        row.addComponents(
            new ButtonBuilder()
                .setLabel(rol.name) // Buton etiketine sadece rol adı yazılır (etiketlenemez)
                .setStyle(buttonStyles[index % buttonStyles.length])
                .setCustomId(`rol_${rol.id}`)
        );
    }
    
    await interaction.reply({ embeds: [embed], components: [row] });

    if (!client._butonRolEventEklendi) {
      client.on("interactionCreate", async (i) => {
        if (!i.isButton() || !i.customId.startsWith("rol_")) return;
        
        await i.deferReply({ ephemeral: true });

        const { guild, member } = i;
        const rolID = i.customId.split("_")[1];
        const rol = guild.roles.cache.get(rolID);

        if (!rol) {
            return i.editReply({ content: "❌ | Bu rol artık sunucuda mevcut değil." });
        }

        if (rol.position >= guild.members.me.roles.highest.position) {
            return i.editReply({ content: `❌ | Bot, **${rol.name}** rolünü verecek veya alacak yetkiye sahip değil.` });
        }
        
        try {
          if (member.roles.cache.has(rolID)) {
            await member.roles.remove(rolID);
            await i.editReply({ content: `✅ | **${rol.name}** rolü senden kaldırıldı!` });
          } else {
            await member.roles.add(rolID);
            await i.editReply({ content: `✅ | **${rol.name}** rolü sana verildi!` });
          }
        } catch (error) {
          console.error("Rol verme/alma hatası:", error);
          await i.editReply({ content: `❌ | Rol verilirken/alınırken bir hata oluştu.` });
        }
      });
      client._butonRolEventEklendi = true;
    }
  },
};