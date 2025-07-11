const { Client, EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js");
const db = require("croxydb");

module.exports = [
  {
    name: "otorol-ayarla",
    description: "Yeni üyelere otomatik rol verir ve bilgilendirme mesajı gönderir!",
    type: 1,
    options: [
      { name: "rol", description: "Yeni üyelere verilecek rol", type: 8, required: true },
      { name: "kanal", description: "Bilgilendirme mesajının gönderileceği kanal", type: 7, required: true, channel_types: [ChannelType.GuildText] },
    ],
    run: async (client, interaction) => {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "❌ | Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısınız!", ephemeral: true });
      }

      const rol = interaction.options.getRole("rol");
      const kanal = interaction.options.getChannel("kanal");
      const botMember = interaction.guild.members.me;

      if (botMember.roles.highest.position <= rol.position) {
        return interaction.reply({ content: "❌ | Botun rolü, ayarlamaya çalıştığınız rolden daha yüksek veya aynı seviyede olmalı!", ephemeral: true });
      }

      db.set(`otorol_${interaction.guild.id}`, { rolId: rol.id, kanalId: kanal.id });

      const embed = new EmbedBuilder()
        .setTitle("✅ Otorol Ayarlandı!")
        .setColor("Green")
        .setDescription(`Yeni üyelere otomatik olarak **${rol}** rolü verilecek ve bilgilendirme mesajları ${kanal} kanalına gönderilecek.`)
        .addFields({ name: "Kapatmak için", value: "`/otorol-kapat` komutunu kullanın."})
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    name: "otorol-kapat",
    description: "Otorol sistemini kapatır!",
    type: 1,
    options: [],
    run: async (client, interaction) => {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "❌ | Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısınız!", ephemeral: true });
      }

      if (!db.get(`otorol_${interaction.guild.id}`)) {
        return interaction.reply({ content: "❌ | Bu sunucuda otorol sistemi zaten ayarlı değil!", ephemeral: true });
      }

      db.delete(`otorol_${interaction.guild.id}`);

      const embed = new EmbedBuilder()
        .setTitle("🔧 Otorol Sistemi Kapatıldı!")
        .setColor("Red")
        .setDescription("Otorol sistemi devre dışı bırakıldı. Yeni üyelere artık otomatik rol verilmeyecek.")
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    },
  },
];

// Bu olay dinleyicisini ana bot dosyanıza taşımanız daha sağlıklı olabilir.
client.on("guildMemberAdd", async (member) => {
  const otorolAyar = db.get(`otorol_${member.guild.id}`);
  if (!otorolAyar) return;

  const { rolId, kanalId } = otorolAyar;
  const rol = member.guild.roles.cache.get(rolId);
  const kanal = member.guild.channels.cache.get(kanalId);

  if (!rol || !kanal) {
    db.delete(`otorol_${member.guild.id}`);
    return;
  }
  
  try {
    await member.roles.add(rol);
    const embed = new EmbedBuilder()
      .setTitle("Sunucuya Yeni Bir Üye Katıldı! 🎉")
      .setColor("Blue")
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setDescription(`${member} sunucumuza katıldı ve **${rol.name}** rolü otomatik olarak verildi.`)
      .addFields({ name: "Mevcut Üye Sayısı", value: `${member.guild.memberCount}`})
      .setTimestamp();
    await kanal.send({ embeds: [embed] });
  } catch (error) {
    console.error("Otorol verilirken hata oluştu:", error);
  }
});