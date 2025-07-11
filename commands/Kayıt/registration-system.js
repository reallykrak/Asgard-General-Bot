const {
  Client,
  EmbedBuilder,
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require("discord.js");
const db = require("croxydb");

function initialize(client) {
  client.on("guildMemberAdd", async (member) => {
    const registrationSystem = db.get(`registrationSystem_${member.guild.id}`);
    if (!registrationSystem) return;

    const { registrationChannelId, unregisteredRoleId, staffRoleId } = registrationSystem;
    const registrationChannel = member.guild.channels.cache.get(registrationChannelId);
    const unregisteredRole = member.guild.roles.cache.get(unregisteredRoleId);
    const staffRole = member.guild.roles.cache.get(staffRoleId);

    if (!registrationChannel || !unregisteredRole || !staffRole) {
      db.delete(`registrationSystem_${member.guild.id}`);
      return console.error("[Kayıt Sistemi] Gerekli kanal/roller silindiği için sistem sıfırlandı.");
    }

    try {
      if (!member.roles.cache.has(unregisteredRoleId)) {
        await member.roles.add(unregisteredRole);
      }
    } catch (error) {
      console.error("[Kayıt Sistemi] Yeni üyeye kayıtsız rolü verilemedi:", error);
    }

    const accountAge = Date.now() - member.user.createdTimestamp;
    const isRisky = accountAge < 1000 * 60 * 60 * 24 * 15;
    const securityStatus = isRisky ? "Riskli Olabilir ⚠️" : "Güvenli ✅";

    const welcomeEmbed = new EmbedBuilder()
      .setColor(isRisky ? "Red" : "Green")
      .setTitle(`Sunucuya Yeni Biri Katıldı!`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setDescription(
        `> Sunucumuza hoş geldin ${member}!\n\n` +
        `> Seninle birlikte **${member.guild.memberCount}** kişiyiz.\n\n` +
        `> **Hesap Durumu:** ${securityStatus}\n` +
        `> (Oluşturulma: <t:${parseInt(member.user.createdTimestamp / 1000)}:R>)`
      )
      .setFooter({ text: member.client.user.username, iconURL: member.client.user.displayAvatarURL() });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`normal_register_${member.id}`).setLabel("Kendin Kaydol").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`manual_register_${member.id}`).setLabel("Yetkili Kaydet").setStyle(ButtonStyle.Primary)
    );

    await registrationChannel.send({ content: `${staffRole}, ${member}`, embeds: [welcomeEmbed], components: [buttons] });
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.guild || !interaction.customId) return;

    const registrationSystem = db.get(`registrationSystem_${interaction.guild.id}`);
    if (!registrationSystem) return;

    if (interaction.isButton() && interaction.customId.includes("_register_")) {
      const { staffRoleId } = registrationSystem;
      const customIdParts = interaction.customId.split("_");
      const action = customIdParts[0];
      const targetUserId = customIdParts[2];

      if (action === "normal") {
        if (interaction.user.id !== targetUserId) {
          return interaction.reply({ content: "❌ | Bu butonu sadece kaydı yapılacak kişi kullanabilir!", ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });
        const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
        if (!targetMember) return interaction.editReply({ content: "❌ | Sunucuda böyle bir kullanıcı bulunamadı." });

        const newNickname = `${registrationSystem.tag} ${targetMember.user.username}`;
        await processRegistration(interaction, targetMember, newNickname, interaction.user, registrationSystem, true);
      }

      if (action === "manual") {
        if (!interaction.member.roles.cache.has(staffRoleId) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return interaction.reply({ content: "❌ | Bu butonu yalnızca yetkililer kullanabilir.", ephemeral: true });
        }

        const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
        if (!targetMember) return interaction.reply({ content: "Kullanıcı sunucudan ayrılmış gibi görünüyor.", ephemeral: true });

        const modal = new ModalBuilder().setCustomId(`register_modal_${targetMember.id}`).setTitle("Kullanıcıyı Elle Kaydet");
        const nameInput = new TextInputBuilder().setCustomId("user_name").setLabel("Kullanıcının Adı").setStyle(TextInputStyle.Short).setRequired(true).setValue(targetMember.user.username);
        modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
        await interaction.showModal(modal);
      }
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("register_modal_")) {
      await interaction.deferReply({ ephemeral: true });
      const targetUserId = interaction.customId.split("_")[2];
      const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
      if (!targetMember) return interaction.editReply({ content: "❌ | Kullanıcı bulunamadı!" });

      const name = interaction.fields.getTextInputValue("user_name");
      const newNickname = `${registrationSystem.tag} ${name}`;
      await processRegistration(interaction, targetMember, newNickname, interaction.user, registrationSystem, false);
    }
  });
}

async function processRegistration(interaction, targetMember, newNickname, registrar, config, isNormal) {
  try {
    await targetMember.setNickname(newNickname);
    await targetMember.roles.add(config.registeredRoleId);
    await targetMember.roles.remove(config.unregisteredRoleId);

    await interaction.editReply({ content: `✅ | **${targetMember.user.tag}** başarıyla \`${newNickname}\` ismiyle kaydedildi!` });

    const originalMessage = interaction.message;
    if (originalMessage && originalMessage.components.length > 0) {
      const disabledButtons = new ActionRowBuilder().addComponents(
        ButtonBuilder.from(originalMessage.components[0].components[0]).setDisabled(true),
        ButtonBuilder.from(originalMessage.components[0].components[1]).setDisabled(true)
      );
      await originalMessage.edit({ components: [disabledButtons] });
    }

    if (!isNormal) {
      db.add(`kayit_sayisi_${interaction.guild.id}_${registrar.id}`, 1);
    }

    if (config.logChannelId) {
      const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor("Blurple")
          .setTitle("📝 Yeni Kayıt Logu")
          .setThumbnail(targetMember.user.displayAvatarURL())
          .addFields(
            { name: "Kayıt Olan Üye", value: `${targetMember} (\`${targetMember.id}\`)`, inline: false },
            { name: "Yeni İsim", value: `\`${newNickname}\``, inline: false },
            { name: "Kayıt Yapan", value: isNormal ? `Kendisi Otomatik Kaydoldu` : `${registrar} (\`${registrar.id}\`)`, inline: false }
          )
          .setTimestamp()
          .setFooter({ text: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() });
        await logChannel.send({ embeds: [logEmbed] });
      } else {
        console.warn("[Kayıt Sistemi] Log kanalı bulunamadı.");
      }
    }

    if (config.announcementChannelId) {
      const announcementChannel = interaction.guild.channels.cache.get(config.announcementChannelId);
      if (announcementChannel) {
        const announceEmbed = new EmbedBuilder()
          .setColor("Aqua")
          .setDescription(`🎉 Aramıza yeni biri katıldı! **${targetMember}**, sunucumuza hoş geldin!`);
        await announcementChannel.send({ embeds: [announceEmbed] });
      }
    }
  } catch (error) {
    console.error("Kayıt işleme hatası:", error);
    await interaction.editReply({
      content: "❌ | Kayıt sırasında bir hata oluştu! Botun rolünün, yönettiği rollerden üstte olduğundan ve yetkilerinin tam olduğundan emin ol."
    });
  }
}

module.exports = {
  commands: [
    {
      name: "registration-system",
      description: "Gelişmiş kayıt sistemini kurar.",
      type: 1,
      options: [
        { name: "registration-channel", description: "Kayıt mesajlarının gönderileceği kanal.", type: ChannelType.GuildText, required: true },
        { name: "unregistered-role", description: "Yeni üyelere verilecek kayıtsız rolü.", type: 8, required: true },
        { name: "registered-role", description: "Kayıt olunca verilecek rol.", type: 8, required: true },
        { name: "staff-role", description: "Kayıt yapmaya yetkili rol.", type: 8, required: true },
        { name: "tag", description: "İsimlerin başına eklenecek tag.", type: 3, required: true },
        { name: "log-kanali", description: "Kayıt loglarının gönderileceği kanal.", type: ChannelType.GuildText, required: true },
        { name: "duyuru-kanali", description: "Üye kaydolunca duyurunun yapılacağı sohbet kanalı. (İsteğe Bağlı)", type: ChannelType.GuildText, required: false },
      ],
      run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return interaction.reply({ content: "❌ | Bu komutu kullanmak için **Yönetici** yetkisine ihtiyacınız var.", ephemeral: true });
        }

        const settings = {
          registrationChannelId: interaction.options.getChannel("registration-channel").id,
          unregisteredRoleId: interaction.options.getRole("unregistered-role").id,
          registeredRoleId: interaction.options.getRole("registered-role").id,
          staffRoleId: interaction.options.getRole("staff-role").id,
          tag: interaction.options.getString("tag"),
          logChannelId: interaction.options.getChannel("log-kanali").id,
          announcementChannelId: interaction.options.getChannel("duyuru-kanali")?.id || null,
        };

        db.set(`registrationSystem_${interaction.guild.id}`, settings);
        const successEmbed = new EmbedBuilder()
          .setColor("Green")
          .setTitle("✅ Kayıt Sistemi Başarıyla Kuruldu")
          .setDescription(`Kayıt sistemi başarıyla yapılandırıldı!`);
        return interaction.reply({ embeds: [successEmbed] });
      },
    },
    {
      name: "disable-registration",
      description: "Kayıt sistemini devre dışı bırakır.",
      type: 1,
      run: async (client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return interaction.reply({ content: "❌ | **Yönetici** iznine ihtiyacınız var.", ephemeral: true });
        }
        db.delete(`registrationSystem_${interaction.guild.id}`);
        return interaction.reply({ embeds: [new EmbedBuilder().setColor("Red").setDescription("✅ | Kayıt sistemi devre dışı bırakıldı!")] });
      },
    },
  ],
  initialize,
};
