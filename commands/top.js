const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const DB_FILE = './database.json';

function loadDatabase() {
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 4));
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('topmoney')
        .setDescription('Xem bảng xếp hạng top tài phú (VNĐ)'),
    async execute(interaction) {
        const db = loadDatabase();
        
        // Chuyển đổi dữ liệu từ object sang array [userId, balance] và sắp xếp giảm dần
        const sortedUsers = Object.entries(db)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10); // Lấy top 10 người giàu nhất

        if (sortedUsers.length === 0) {
            return interaction.reply({ content: '⚠️ Bảng xếp hạng hiện tại chưa có dữ liệu!', ephemeral: true });
        }

        let description = '';
        const medals = ['🥇', '🥈', '🥉'];

        for (let i = 0; i < sortedUsers.length; i++) {
            const [userId, balance] = sortedUsers[i];
            const rankIcon = medals[i] || `**#${i + 1}**`;
            description += `${rankIcon} <@${userId}>: **${balance.toLocaleString()} VNĐ**\n`;
        }

        const leaderboardEmbed = new EmbedBuilder()
            .setColor('#FEE75C')
            .setTitle('🏆 BẢNG XẾP HẠNG TÀI PHÚ')
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: 'Nhà Cái Gaming Bot' });

        return interaction.reply({ embeds: [leaderboardEmbed] });
    }
};