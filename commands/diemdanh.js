const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const config = require('../config');
const DB_FILE = './database.json';
const CHECKIN_FILE = './checkin.json';

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

function loadCheckins() {
    if (!fs.existsSync(CHECKIN_FILE)) {
        fs.writeFileSync(CHECKIN_FILE, JSON.stringify({}, null, 4));
    }
    try {
        const data = fs.readFileSync(CHECKIN_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// Hàm định dạng tiền tệ Việt Nam chuẩn (nghìn, triệu, tỉ, nghìn tỉ)
function formatVND(amount) {
    if (amount >= 1e12) return (amount / 1e12).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' nghìn tỉ VNĐ';
    if (amount >= 1e9) return (amount / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỉ VNĐ';
    if (amount >= 1e6) return (amount / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' triệu VNĐ';
    if (amount >= 1e3) return (amount / 1e3).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + ' nghìn VNĐ';
    return amount.toLocaleString('vi-VN') + ' VNĐ';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('diemdanh')
        .setDescription('Điểm danh nhận tiền VNĐ miễn phí mỗi ngày!'),
    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: 64 });
        }

        const userId = interaction.user.id;
        const today = new Date().toISOString().split('T')[0];
        const checkins = loadCheckins();
        
        // Kiểm tra nếu không phải là chủ bot thì mới chặn giới hạn 1 lần/ngày
        if (userId !== config.ownerId) {
            if (checkins[userId] === today) {
                return interaction.editReply({ 
                    content: `⏳ Bạn đã điểm danh ngày hôm nay rồi! Vui lòng quay lại vào ngày mai nhé.` 
                });
            }
            // Lưu mốc điểm danh đối với user thường
            checkins[userId] = today;
            fs.writeFileSync(CHECKIN_FILE, JSON.stringify(checkins, null, 4));
        }

        // Lấy số tiền thưởng từ config
        const reward = config.diemdanhReward || 500000;
        
        const db = loadDatabase();
        const currentBalance = db[userId] || 500000;
        const newBalance = currentBalance + reward;
        db[userId] = newBalance;
        
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 4));

        const embed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle(userId === config.ownerId ? '📅 ĐIỂM DANH VÔ HẠN (ADMIN)' : '📅 ĐIỂM DANH THÀNH CÔNG')
            .setDescription(`🎉 Chúc mừng bạn đã nhận thưởng điểm danh!\n🎁 Nhận được: **+${formatVND(reward)}**\n💰 Số dư hiện tại: **${formatVND(newBalance)}**`)
            .setImage('https://giphy.com/gifs/anime-cute-heppy-Hi2BWtqasFXuXRYOUR');

        return interaction.editReply({ embeds: [embed] });
    }
};