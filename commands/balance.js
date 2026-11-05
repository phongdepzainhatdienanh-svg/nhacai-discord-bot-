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
        .setName('balance')
        .setDescription('Kiểm tra số dư tài khoản của bạn hoặc người khác')
        .addUserOption(option => 
            option.setName('nguoichoi')
                .setDescription('Chọn người chơi muốn xem (để trống nếu xem của chính bạn)')
                .setRequired(false)
        ),
    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: 64 });
        }

        const targetUser = interaction.options.getUser('nguoichoi') || interaction.user;
        const db = loadDatabase();
        const balance = db[targetUser.id] || 500000; 

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('💳 SỐ DƯ TÀI KHOẢN')
            .setDescription(`👤 Tài khoản: **${targetUser.username}**\n💰 Số dư: **${formatVND(balance)}** (\`${balance.toLocaleString('vi-VN')} VNĐ\`)`);

        return interaction.editReply({ embeds: [embed] });
    }
};