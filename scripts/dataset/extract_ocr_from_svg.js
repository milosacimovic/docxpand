const puppeteer = require('puppeteer');
const fs = require('fs');
const process = require('process');


async function extractWordBoundingBoxes(svgFilePath) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Load the SVG content from file
    const svgContent = fs.readFileSync(svgFilePath, 'utf8');

    // Create a minimal HTML page with the SVG content embedded directly
    await page.setContent(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SVG Text Bounding Boxes</title>
      </head>
      <body>
        <div id="svgContainer">${svgContent}</div>
      </body>
    </html>
  `);

    // Wait for the SVG container to load
    await page.waitForSelector('#svgContainer');

    // Extract the text elements and calculate bounding boxes for each word
    const [wordBoundingBoxes, pageX, pageY, pageW, pageH, style] = await page.evaluate(() => {
        const pagerect = document.getElementById('BG').getBoundingClientRect();
        pageX = pagerect.x
        pageY = pagerect.y
        pageW = pagerect.width
        pageH = pagerect.height

        const svg = document.getElementById('Texte') || document.getElementById('Textes');
        console.log(svg);
        if (!svg) {
            console.log('SVG element not found');
            return [];
        }

        // Extract text elements
        const textElements = svg.querySelectorAll('text');
        const style = textElements[0].getAttribute('style');
        // console log each element
        let wordBboxes = [];

        textElements.forEach(textElem => {

            // if textElement has "signature" in its id then skip it
            if (textElem.id.includes("signature")) {
                return;
            }

            lineRect = textElem.getBoundingClientRect()
            line_x = lineRect.x
            line_y = lineRect.y
            line_width = lineRect.width
            line_height = lineRect.height

            textStyle = textElem.getAttribute('style')

            // run this for each tspan
            const tspans = textElem.querySelectorAll('tspan');

            tspans.forEach(tspan => {

                tspanRect = tspan.getBoundingClientRect()
                tspan_x = tspanRect.x
                tspan_y = tspanRect.y
                tspan_width = tspanRect.width
                tspan_height = tspanRect.height

                // if line is composed of multiple words then split them
                const text = tspan.textContent.trim();
                const words = text.split(/\s+/);  // Split text content into words
                const num_spaces = words.length - 1

                function overrideStyles(str1, str2) {
                    // Helper function to convert a style string into an object
                    function styleStringToObject(styleStr) {
                      return styleStr.split(';').reduce((acc, rule) => {
                        let [key, value] = rule.split(':').map(part => part.trim());
                        if (key) acc[key] = value;
                        return acc;
                      }, {});
                    }
                  
                    // Helper function to convert an object back into a style string
                    function objectToStyleString(styleObj) {
                      return Object.entries(styleObj)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join('; ') + ';';
                    }
                  
                    // Convert both style strings to objects
                    let styleObj1 = styleStringToObject(str1);
                    let styleObj2 = styleStringToObject(str2);
                  
                    // Override the styles from str1 with those from str2
                    let mergedStyles = { ...styleObj1, ...styleObj2 };
                  
                    // Convert the merged object back into a style string
                    return objectToStyleString(mergedStyles);
                  }

                let style = tspan.getAttribute('style');
                let cls = tspan.getAttribute('class');
                // if style is defined then override those of tspan by parsing the style
                if (style == null) {
                    style = textStyle
                } else if (textStyle != null) {
                    style = overrideStyles(textStyle, style)
                }

                let tempWordBboxes = [];

                function createTempTSpanElement(word, style, cls, textElem) {
                    const tempText = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                    tempText.textContent = word;

                    // Copy attributes from the original text element
                    tempText.setAttribute('class', cls);
                    tempText.setAttribute('style', style);

                    // Append the temporary text element to the SVG
                    textElem.appendChild(tempText);

                    // Get the bounding box of the word
                    const boundingBox = tempText.getBoundingClientRect();
                    // Add the blockType to the bounding box
                    textElem.removeChild(tempText);

                    return boundingBox;
                }



                // Create a temporary <text> element for each word to calculate its bounding box
                words.forEach((word, index) => {
                    const boundingBox = createTempTSpanElement(word, style, cls, textElem);

                    tempWordBboxes.push({
                        word: word,
                        x: 0,
                        y: 0,
                        blockType: 'WORD',
                        width: boundingBox.width,
                        height: boundingBox.height
                    });

                });
                
                // get the bounding box of a whitespace character
                const totalWordsWidth = tempWordBboxes.reduce((acc, wordBbox) => acc + wordBbox.width, 0);
                const whitespaceWidth = (tspan_width - totalWordsWidth) / num_spaces

                // calculate the x and y of each word
                let word_x = tspan_x
                let word_y = tspan_y
                tempWordBboxes.forEach((wordBbox, index) => {
                    wordBbox.x = word_x
                    wordBbox.y = word_y

                    word_x += wordBbox.width + whitespaceWidth

                    wordBboxes.push(wordBbox);
                });
            });
        });

        return [wordBboxes, pageX, pageY, pageW, pageH, style];
    });

    console.log("word BBoxes", wordBoundingBoxes)
    //console.log(pageX);
    await browser.close();

    return [wordBoundingBoxes, pageX, pageY, pageW, pageH];
}


// Get the input SVG path and output JSON path from command-line arguments
const [inputSvgPath, outputJsonPath] = process.argv.slice(2);

// Example usage
extractWordBoundingBoxes(inputSvgPath).then((ret) => {
    const [boundingBoxes, pageX, pageY, pageW, pageH] = ret;
    console.log('Extracted word bounding boxes:', boundingBoxes);
    console.log('PageX:', pageX);
    console.log('PageY:', pageY);
    console.log('PageW:', pageW);
    console.log('PageH:', pageH);
    // Add the Page bounding box to the boundingBoxes
    boundingBoxes.push({
        blockType: 'PAGE',
        x: pageX,
        y: pageY,
        width: pageW,
        height: pageH
    });
    // Store the bounding boxes in a JSON file
    fs.writeFileSync(outputJsonPath, JSON.stringify(boundingBoxes, null, 2));
});
