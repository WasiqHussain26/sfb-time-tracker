const pngToIcoModule = require('png-to-ico');
const pngToIco = pngToIcoModule.default || pngToIcoModule;
const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'public', 'icon_balanced.png');
const outputFile = path.join(__dirname, 'public', 'icon.ico');

async function generate() {
    console.log(`Reading image: ${inputFile}`);

    // 1. Load and Resize to 256x256
    const image = await Jimp.read(inputFile);
    image.resize({ w: 256, h: 256 });

    // 2. Get Buffer
    const buffer = await image.getBuffer("image/png");

    // 3. Convert to ICO
    const icoBuffer = await pngToIco(buffer);

    fs.writeFileSync(outputFile, icoBuffer);
    console.log(`✅ Success! Generated 256x256 icon.ico at: ${outputFile}`);
}

generate().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
