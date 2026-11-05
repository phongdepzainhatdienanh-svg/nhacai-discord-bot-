const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const config = require('../config');
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
        .setName('addmoney')
        .setDescription('Cấp tiền VNĐ cho người chơi (Độc quyền Chủ Bot)')
        .addIntegerOption(option => 
            option.setName('soluong')
                .setDescription('Số tiền VNĐ muốn cấp')
                .setRequired(true)
        )
        .addUserOption(option => 
            option.setName('nguoichoi')
                .setDescription('Chọn người chơi muốn cấp tiền')
                .setRequired(true)
        ),
    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: 64 });
        }

        // Kiểm tra độc quyền thông qua config.ownerId
        if (interaction.user.id !== config.ownerId) {
            return interaction.editReply({ 
                content: `❌ Lệnh này là độc quyền của Chủ Bot! Bạn không có quyền sử dụng.` 
            });
        }

        const amount = interaction.options.getInteger('soluong');
        const targetUser = interaction.options.getUser('nguoichoi');

        if (amount <= 0) {
            return interaction.editReply({ content: '⚠️ Số tiền cấp phải lớn hơn 0 VNĐ!' });
        }

        const db = loadDatabase();
        const targetId = targetUser.id;
        const currentBalance = db[targetId] || 500000;
        const newBalance = currentBalance + amount;
        db[targetId] = newBalance;
        
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 4));

        const embed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('💵 CẤP TIỀN THÀNH CÔNG')
            .setDescription(`✅ Đã cộng thêm **${formatVND(amount)}** cho **${targetUser.username}**!\n💰 Số dư mới: **${formatVND(newBalance)}**`);

        return interaction.editReply({ embeds: [embed] });
    }
};