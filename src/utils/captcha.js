const { AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');

function generateCaptcha() {
    const canvas = createCanvas(200, 80);
    const ctx = canvas.getContext('2d');

    const text = Math.random().toString(36).substring(2, 8);

    ctx.fillStyle = '#23272A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = '30px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 50, 50);

    return {
        text,
        image: new AttachmentBuilder(canvas.toBuffer(), { name: 'captcha.png' })
    };
}

module.exports = generateCaptcha;