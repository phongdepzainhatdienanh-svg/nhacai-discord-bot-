const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const DB_FILE = './database.json';

function loadDatabase() {
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 4));
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

// Tạo bộ bài tiêu chuẩn 52 lá
function createDeck() {
    const suits = ['♠', '♣', '♥', '♦'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let deck = [];
    for (let suit of suits) {
        for (let value of values) {
            deck.push({ value, suit });
        }
    }
    return deck.sort(() => Math.random() - 0.5); // Xào bài ngẫu nhiên
}

// Tính điểm Xì Dách chuẩn
function calculateScore(hand) {
    let score = 0;
    let aceCount = 0;

    for (let card of hand) {
        if (card.value === 'A') {
            aceCount++;
            score += 11;
        } else if (['J', 'Q', 'K', '10'].includes(card.value)) {
            score += 10;
        } else {
            score += parseInt(card.value);
        }
    }

    // Xử lý quân Át (A) linh hoạt tính 1 hoặc 11
    while (score > 21 && aceCount > 0) {
        score -= 10;
        aceCount--;
    }

    return score;
}

function formatHand(hand) {
    return hand.map(c => `[${c.value}${c.suit}]`).join(' ');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xidach')
        .setDescription('Chơi game Xì Dách (Blackjack) đổi thưởng')
        .addIntegerOption(option => option.setName('sotien').setDescription('Số tiền cược').setRequired(true)),
    async execute(interaction) {
        const userId = interaction.user.id;
        const betAmount = interaction.options.getInteger('sotien');
        const db = loadDatabase();
        const currentBalance = db[userId] || 1000;

        if (betAmount <= 0) {
            return interaction.reply({ content: '⚠️ Số tiền cược phải lớn hơn 0!', ephemeral: true });
        }

        if (currentBalance < betAmount) {
            return interaction.reply({ content: `❌ Bạn không đủ tiền để cược! Số dư hiện tại: **${currentBalance.toLocaleString()} VNĐ**.`, ephemeral: true });
        }

        // Trừ tiền cược trước khi ván đấu bắt đầu
        db[userId] = currentBalance - betAmount;
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 4));

        let deck = createDeck();
        let playerHand = [deck.pop(), deck.pop()];
        let dealerHand = [deck.pop(), deck.pop()];

        let playerScore = calculateScore(playerHand);
        let dealerScore = calculateScore(dealerHand);

        // Kiểm tra trường hợp thắng trắng ngay từ đầu (Blackjack)
        if (playerScore === 21) {
            let winAmount = Math.floor(betAmount * 2.5);
            db[userId] += winAmount;
            fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 4));

            const bjEmbed = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('🃏 XÌ DÁCH - BLACKJACK THẮNG TRẮNG!')
                .addFields(
                    { name: '👤 Bài của bạn (21 điểm)', value: `${formatHand(playerHand)}`, inline: false },
                    { name: '🤖 Bài nhà cái', value: `${formatHand(dealerHand)} (Điểm: ${dealerScore})`, inline: false },
                    { name: '🏆 Kết quả', value: `🎉 **BLACKJACK!** Bạn nhận được **+${(winAmount - betAmount).toLocaleString()} VNĐ**`, inline: false },
                    { name: '💰 Số dư mới', value: `**${db[userId].toLocaleString()} VNĐ**`, inline: false }
                );
            return interaction.reply({ embeds: [bjEmbed] });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('hit').setLabel('Rút bài (Hit)').setStyle(ButtonStyle.Primary),
            newButton = new ButtonBuilder().setCustomId('stand').setLabel('Dừng (Stand)').setStyle(ButtonStyle.Success)
        );

        const gameEmbed = new EmbedBuilder()
            .setColor('#FEE75C')
            .setTitle('🃏 BÀN CHƠI XÌ DÁCH')
            .addFields(
                { name: '👤 Bài của bạn', value: `${formatHand(playerHand)} (Điểm: **${playerScore}**)`, inline: false },
                { name: '🤖 Bài nhà cái', value: `[${dealerHand[0].value}${dealerHand[0].suit}] [🎴]`, inline: false },
                { name: '💵 Tiền cược', value: `**${betAmount.toLocaleString()} VNĐ**`, inline: true }
            );

        const response = await interaction.reply({ embeds: [gameEmbed], components: [row], fetchReply: true });

        const collector = response.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: '⚠️ Đây không phải ván bài của bạn!', ephemeral: true });
            }

            if (i.customId === 'hit') {
                playerHand.push(deck.pop());
                playerScore = calculateScore(playerHand);

                if (playerScore > 21) {
                    // Quắc (Bust)
                    collector.stop();
                    const loseEmbed = new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('🃏 XÌ DÁCH - BẠN ĐÃ QUẮC (BUST)!')
                        .addFields(
                            { name: '👤 Bài của bạn', value: `${formatHand(playerHand)} (Điểm: **${playerScore}** - Quắc!)`, inline: false },
                            { name: '🤖 Bài nhà cái', value: `${formatHand(dealerHand)} (Điểm: ${dealerScore})`, inline: false },
                            { name: '🤖 Trạng thái', value: `❌ **QUẮC!** Bạn mất **-${betAmount.toLocaleString()} VNĐ**`, inline: false },
                            { name: '💰 Số dư mới', value: `**${db[userId].toLocaleString()} VNĐ**`, inline: false }
                        );
                    return i.update({ embeds: [loseEmbed], components: [] });
                }

                const updateEmbed = new EmbedBuilder()
                    .setColor('#FEE75C')
                    .setTitle('🃏 BÀN CHƠI XÌ DÁCH')
                    .addFields(
                        { name: '👤 Bài của bạn', value: `${formatHand(playerHand)} (Điểm: **${playerScore}**)`, inline: false },
                        { name: '🤖 Bài nhà cái', value: `[${dealerHand[0].value}${dealerHand[0].suit}] [🎴]`, inline: false },
                        { name: '💵 Tiền cược', value: `**${betAmount.toLocaleString()} VNĐ**`, inline: true }
                    );
                await i.update({ embeds: [updateEmbed], components: [row] });

            } else if (i.customId === 'stand') {
                collector.stop();

                // Nhà cái rút bài nếu dưới 16 điểm
                while (dealerScore < 16) {
                    dealerHand.push(deck.pop());
                    dealerScore = calculateScore(dealerHand);
                }

                let resultText = '';
                let color = '#ED4245';
                let finalBalance = db[userId];

                if (dealerScore > 21 || playerScore > dealerScore) {
                    finalBalance += betAmount * 2;
                    resultText = `🎉 **BẠN THẮNG!** Nhận được **+${betAmount.toLocaleString()} VNĐ**`;
                    color = '#57F287';
                } else if (playerScore === dealerScore) {
                    finalBalance += betAmount; // Hoà tiền
                    resultText = `🤝 **HÒA!** Hoàn lại **${betAmount.toLocaleString()} VNĐ**`;
                    color = '#5865F2';
                } else {
                    resultText = `🤖 **NHÀ CÁI ĂN!** Mất **-${betAmount.toLocaleString()} VNĐ**`;
                }

                db[userId] = finalBalance;
                fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 4));

                const finalEmbed = new EmbedBuilder()
                    .setColor(color)
                    .setTitle('🃏 KẾT QUẢ XÌ DÁCH (ĐÃ DỪNG BÀI)')
                    .addFields(
                        { name: '👤 Bài của bạn', value: `${formatHand(playerHand)} (Điểm: **${playerScore}**)`, inline: false },
                        { name: '🤖 Bài nhà cái', value: `${formatHand(dealerHand)} (Điểm: **${dealerScore}**)`, inline: false },
                        { name: '🏆 Trạng thái', value: resultText, inline: false },
                        { name: '💰 Số dư mới', value: `**${finalBalance.toLocaleString()} VNĐ**`, inline: false }
                    );

                return i.update({ embeds: [finalEmbed], components: [] });
            }
        });

        collector.on('end', async collected => {
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('⏱️ VÁN XÌ DÁCH ĐÃ HẾT HẠN')
                    .setDescription('Bạn đã không đưa ra quyết định kịp thời, hệ thống tự động tính là thua cược.');
                await interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
            }
        });
    }
};