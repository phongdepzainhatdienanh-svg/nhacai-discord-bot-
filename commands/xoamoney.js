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
        .setName('xoamoney')
        .setDescription('Xóa hoặc trừ bớt tiền VNĐ của người chơi (Độc quyền Chủ Bot)')
        .addUserOption(option => 
            option.setName('nguoichoi')
                .setDescription('Chọn người chơi muốn xử lý tiền')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('hinhthuc')
                .setDescription('Chọn hình thức: Trừ theo số lượng hoặc Xóa sạch (all)')
                .setRequired(true)
                .addChoices(
                    { name: 'Trừ số lượng tự chọn', value: 'custom' },
                    { name: 'Xóa sạch toàn bộ (All Money)', value: 'all' }
                )
        )
        .addIntegerOption(option => 
            option.setName('soluong')
                .setDescription('Số tiền VNĐ muốn trừ (Bắt buộc nếu chọn Trừ tự chọn)')
                .setRequired(false)
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

        const targetUser = interaction.options.getUser('nguoichoi');
        const hinhthuc = interaction.options.getString('hinhthuc');
        const amount = interaction.options.getInteger('soluong') || 0;

        const db = loadDatabase();
        const targetId = targetUser.id;
        const currentBalance = db[targetId] || 500000;
        let newBalance = currentBalance;
        let descriptionText = '';

        if (hinhthuc === 'all') {
            newBalance = 0;
            db[targetId] = newBalance;
            descriptionText = `🗑️ Đã **XÓA SẠCH TOÀN BỘ** tiền của **${targetUser.username}**!\n💰 Số dư hiện tại: **0 VNĐ**`;
        } else {
            if (amount <= 0) {
                return interaction.editReply({ content: '⚠️ Vui lòng nhập số tiền muốn trừ lớn hơn 0 VNĐ!' });
            }
            newBalance = Math.max(0, currentBalance - amount);
            db[targetId] = newBalance;
            descriptionText = `🗑️ Đã trừ bớt **${formatVND(amount)}** của **${targetUser.username}**!\n💰 Số dư còn lại: **${formatVND(newBalance)}**`;
        }

        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 4));

        const embed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('⚠️ QUẢN LÝ TIỀN TỆ - XOAMONEY')
            .setDescription(descriptionText);

        return interaction.editReply({ embeds: [embed] });
    }
};