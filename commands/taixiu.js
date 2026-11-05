const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const DB_FILE = './database.json';

function loadDatabase() {
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 4));
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

// Hàm chờ (Delay) bằng async/await
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('taixiu')
        .setDescription('Chơi game Tài Xỉu')
        .addStringOption(option => option.setName('cuoc').setDescription('Chọn cửa Tài hoặc Xỉu').setRequired(true)
            .addChoices({ name: 'tài', value: 'tai' }, { name: 'xỉu ', value: 'xiu' }))
        .addIntegerOption(option => option.setName('sotien').setDescription('Số tiền cược').setRequired(true)),
    async execute(interaction) {
        const userChoice = interaction.options.getString('cuoc');
        const betAmount = interaction.options.getInteger('sotien');
        const userId = interaction.user.id;
        const db = loadDatabase();
        const currentBalance = db[userId] || 1000;

        if (betAmount <= 0) {
            return interaction.reply({ content: '⚠️ Số tiền cược phải lớn hơn 0!', ephemeral: true });
        }

        if (currentBalance < betAmount) {
            return interaction.reply({ content: `❌ Bạn không đủ tiền để cược! Số dư hiện tại: **${currentBalance.toLocaleString()} xu**.`, ephemeral: true });
        }

        // Trừ tiền cược trước khi lắc
        db[userId] = currentBalance - betAmount;
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 4));
        await interaction.reply({ 
            content: `🎲 Nhà cái đang lắc xí ngầu... Vui lòng đợi **3 giây** để xem kết quả! ⏳` 
        });
        await wait(3000);

        const rollDice = () => [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
        let dice = rollDice();
        let sum = dice.reduce((a, b) => a + b, 0);
        let actualResult = sum >= 11 && sum <= 17 ? 'tai' : 'xiu';

        // Đổi tỷ lệ thành 60% Bot thắng, 40% Người chơi thắng
        const randomPercent = Math.random() * 100;
        if (randomPercent < 60) {
            let attempts = 0;
            while (actualResult === userChoice && attempts < 10) {
                dice = rollDice();
                sum = dice.reduce((a, b) => a + b, 0);
                actualResult = sum >= 11 && sum <= 17 ? 'tai' : 'xiu';
                attempts++;
            }
            if (actualResult === userChoice) {
                sum = userChoice === 'tai' ? 8 : 12;
                dice = [2, 3, 3];
                actualResult = sum >= 11 ? 'tai' : 'xiu';
            }
        } else {
            let attempts = 0;
            while (actualResult !== userChoice && attempts < 10) {
                dice = rollDice();
                sum = dice.reduce((a, b) => a + b, 0);
                actualResult = sum >= 11 && sum <= 17 ? 'tai' : 'xiu';
                attempts++;
            }
            if (actualResult !== userChoice) {
                sum = userChoice === 'tai' ? 14 : 7;
                dice = userChoice === 'tai' ? [5, 5, 4] : [2, 2, 3];
                actualResult = userChoice;
            }
        }

        const diceEmojis = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };
        const diceString = `${diceEmojis[dice[0]]} - ${diceEmojis[dice[1]]} - ${diceEmojis[dice[2]]}`;

        let resultText = '';
        let color = '#ED4245';
        let updatedBalance = db[userId];

        if (actualResult === userChoice) {
            updatedBalance += betAmount * 2;
            resultText = `🎉 **BẠN THẮNG!** Nhận được **+${betAmount.toLocaleString()} xu**`;
            color = '#57F287';
        } else {
            resultText = `🤖 **NHÀ CÁI ĂN!** Mất **-${betAmount.toLocaleString()} xu**`;
        }

        db[userId] = updatedBalance;
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 4));

        const resultEmbed = new EmbedBuilder()
            .setColor(color)
            .setTitle('🎲 KẾT QUẢ TÀI XỈU (ĐÃ MỞ BÁT)')
            .addFields(
                { name: '👤 Bạn chọn', value: userChoice === 'tai' ? '🔴 TÀI' : '🔵 XỈU', inline: true },
                { name: '💵 Tiền cược', value: `**${betAmount.toLocaleString()} xu**`, inline: true },
                { name: '🎲 Xí ngầu', value: `${diceString} (Tổng: **${sum}**)`, inline: false },
                { name: '💰 Số dư mới', value: `**${updatedBalance.toLocaleString()} xu**`, inline: false },
                { name: '🏆 Trạng thái', value: resultText, inline: false }
            );

        // Chỉnh sửa lại tin nhắn ban đầu thành kết quả chi tiết
        return interaction.editReply({ content: '', embeds: [resultEmbed] });
    }
};