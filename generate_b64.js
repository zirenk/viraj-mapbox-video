const fs = require('fs');
const path = require('path');

const publicPath = path.join(__dirname, 'public', 'viraj_pin.png');
const outputPath = path.join(__dirname, 'src', 'components', 'MapRouteAnimation', 'PinImage.ts');

try {
    const b64 = fs.readFileSync(publicPath, 'base64');
    const content = `export const PIN_IMAGE_DATA = "data:image/png;base64,${b64}";\n`;
    fs.writeFileSync(outputPath, content);
    console.log(`Successfully wrote base64 image to ${outputPath}`);
} catch (error) {
    console.error('Error generating base64 file:', error);
    process.exit(1);
}
