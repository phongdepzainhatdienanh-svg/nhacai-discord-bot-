const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const DB_FILE = './database.json';

function loadDatabase() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 4));
    }
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

function formatVND(amount) {
    if (amount >= 1e12) return (amount / 1e12).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' nghìn tỉ VNĐ';
    if (amount >= 1e9) return (amount / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỉ VNĐ';
    if (amount >= 1e6) return (amount / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' triệu VNĐ';
    if (amount >= 1e3) return (amount / 1e3).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + ' nghìn VNĐ';
    return amount.toLocaleString('vi-VN') + ' VNĐ';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Chuyển tiền VNĐ cho người chơi khác')
        .addUserOption(option => 
            option.setName('nguoinhan')
                .setDescription('Chọn người nhận tiền')
                .setRequired(true)
        )
        .addIntegerOption(option => 
            option.setName('sotien')
                .setDescription('Số tiền VNĐ muốn chuyển')
                .setRequired(true)
        ),
    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: 64 });
        }

        const sender = interaction.user;
        const receiver = interaction.options.getUser('nguoinhan');
        const amount = interaction.options.getInteger('sotien');

        if (sender.id === receiver.id) {
            return interaction.editReply({ content: '⚠️ Bạn không thể tự chuyển tiền cho chính mình được!' });
        }

        if (amount <= 0) {
            return interaction.editReply({ content: '⚠️ Số tiền chuyển phải lớn hơn 0 VNĐ!' });
        }

        const db = loadDatabase();
        const senderBalance = db[sender.id] || 1000000;

        if (senderBalance < amount) {
            return interaction.editReply({ 
                content: `❌ Số dư của bạn không đủ để chuyển! Số dư hiện tại: **${formatVND(senderBalance)}**.` 
            });
        }

        const receiverBalance = db[receiver.id] || 500000;

        db[sender.id] = senderBalance - amount;
        db[receiver.id] = receiverBalance + amount;

        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 4));

        const embed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('💸 GIAO DỊCH CHUYỂN KHOẢN THÀNH CÔNG')
            .setDescription(`✅ **${sender.username}** đã chuyển thành công **${formatVND(amount)}** cho **${receiver.username}**!`)
            .addFields(
                { name: '💰 Số dư mới của bạn', value: `**${formatVND(db[sender.id])}**`, inline: true },
                { name: '📥 Số dư người nhận', value: `**${formatVND(db[receiver.id])}**`, inline: true }
            );

        return interaction.editReply({ embeds: [embed] });
    }
};