const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commandsArray = [];

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commandsArray.push(command.data.toJSON());
        console.log(`[📦 ĐÃ TẢI LỆNH] /${command.data.name} (từ file ${file})`);
    }
}

client.once('ready', async () => {
    console.log(`✅ Bot đã online: ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(config.token);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commandsArray });
        console.log('✅ Đã đăng ký thành công các lệnh Slash từ module!');
    } catch (error) {
        console.error('Lỗi đăng ký lệnh:', error);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        // Thực thi lệnh của bạn
        await command.execute(interaction);
    } catch (error) {
        console.error("🔥 LỖI CHI TIẾT:", error);
        
        // Tránh lỗi treo phản hồi bằng cách kiểm tra trạng thái tương tác
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: `❌ Đã xảy ra lỗi khi thực thi lệnh này!`, embeds: [], components: [] }).catch(() => {});
        } else {
            await interaction.reply({ content: `❌ Đã xảy ra lỗi khi thực thi lệnh này!`, flags: 64 }).catch(() => {});
        }
    }
});

client.login(config.token);
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot Discord đang chạy 24/7!');
});

app.listen(PORT, () => {
  console.log(`Web server đang chạy trên cổng ${PORT}`);
});