const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate MLA Citation Guide PDF
 * @param {string} outputPath - Full path where the PDF should be saved
 * @param {string} logoPath - Optional path to logo image
 * @returns {Promise<string>} Path to the generated PDF
 */
const generateMLACitationGuidePDF = async (outputPath, logoPath = null) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                margin: 72, // 1 inch margins
                size: 'LETTER',
            });

            // Create write stream
            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);

            // Add logo if provided and exists
            if (logoPath && fs.existsSync(logoPath)) {
                try {
                    doc.image(logoPath, {
                        fit: [150, 50],
                        align: 'center',
                    });
                    doc.moveDown(1);
                } catch (error) {
                    console.error('[generateMLACitationGuidePDF] Error adding logo:', error.message);
                }
            }

            // Title
            doc.fontSize(24)
                .font('Helvetica-Bold')
                .text('MLA Citation Guide', {
                    align: 'center',
                })
                .moveDown(0.5);

            // Subtitle
            doc.fontSize(12)
                .font('Helvetica')
                .text('A quick reference for properly citing sources in MLA 9th Edition format for your essays.', {
                    align: 'center',
                })
                .moveDown(2);

            // Part 1: The Works Cited Page
            doc.fontSize(18)
                .font('Helvetica-Bold')
                .text('Part 1: The Works Cited Page', {
                    underline: true,
                })
                .moveDown(0.5);

            doc.fontSize(11)
                .font('Helvetica')
                .text('Your Works Cited page is an alphabetized list of all the sources you referenced in your paper. It should be on its own page at the end of your document.')
                .moveDown(1);

            doc.fontSize(12)
                .font('Helvetica-Bold')
                .text('Key Formatting Rules:')
                .moveDown(0.5);

            const rules = [
                'Title: The page should be titled "Works Cited", centered at the top.',
                'Spacing: The entire page should be double-spaced (no extra spaces between entries).',
                'Alphabetical: Entries must be in alphabetical order based on the author\'s last name (or the title, if there is no author).',
                'Indentation: All entries must use a hanging indent. This means the first line of the citation is on the left margin, and every line after it is indented by 0.5 inches.',
            ];

            doc.fontSize(11).font('Helvetica');
            rules.forEach((rule, index) => {
                doc.text(`• ${rule}`, { indent: 20 });
                if (index < rules.length - 1) doc.moveDown(0.3);
            });
            doc.moveDown(1.5);

            // Part 2: How to Build Your Citations
            doc.fontSize(18)
                .font('Helvetica-Bold')
                .text('Part 2: How to Build Your Citations', {
                    underline: true,
                })
                .moveDown(0.5);

            doc.fontSize(11)
                .font('Helvetica')
                .text('MLA uses a "container" system. The source (e.g., an article) is in a container (e.g., a journal or a website). Follow this order, skip any element you don\'t have, and end with a period.')
                .moveDown(1);

            const citationElements = [
                'Author.',
                '"Title of source."',
                'Title of container,',
                'Other contributors,',
                'Version,',
                'Number,',
                'Publisher,',
                'Publication date,',
                'Location.',
            ];

            doc.fontSize(11).font('Helvetica');
            citationElements.forEach((element, index) => {
                doc.text(`${index + 1}. ${element}`, { indent: 20 });
                if (index < citationElements.length - 1) doc.moveDown(0.2);
            });
            doc.moveDown(1);

            doc.fontSize(12)
                .font('Helvetica-Bold')
                .text('Common Examples:')
                .moveDown(0.5);

            // Book Example
            doc.fontSize(11)
                .font('Helvetica-Bold')
                .text('Book (Print)')
                .moveDown(0.3);

            doc.fontSize(10)
                .font('Helvetica')
                .text('Author\'s Last Name, First Name. Title of Book. Publisher, Publication Year.')
                .moveDown(0.5);

            doc.fontSize(10)
                .font('Helvetica-Bold')
                .text('Example:')
                .moveDown(0.3);

            doc.fontSize(10)
                .font('Helvetica')
                .text('Orwell, George. 1984. Signet Classics, 1950.')
                .moveDown(1);

            // Website Example
            doc.fontSize(11)
                .font('Helvetica-Bold')
                .text('Website or Webpage')
                .moveDown(0.3);

            doc.fontSize(10)
                .font('Helvetica')
                .text('Author\'s Last Name, First Name. "Title of the Page or Article." Title of the Website, Publication Date, URL.')
                .moveDown(0.5);

            doc.fontSize(10)
                .font('Helvetica-Bold')
                .text('Example:')
                .moveDown(0.3);

            doc.fontSize(10)
                .font('Helvetica')
                .text('DiGiacomo, Lilia. "The Dangers of Drowsy Driving." National Safety Council, 19 Aug. 2024, www.nsc.org/drowsy-driving-dangers.')
                .moveDown(1);

            // Journal Article Example
            doc.fontSize(11)
                .font('Helvetica-Bold')
                .text('Online Journal Article (from a Database)')
                .moveDown(0.3);

            doc.fontSize(10)
                .font('Helvetica')
                .text('Author\'s Last Name, First Name. "Title of Article." Title of Journal, vol. #, no. #, Publication Date, pp. #-#. Name of Database, DOI or URL.')
                .moveDown(0.5);

            doc.fontSize(10)
                .font('Helvetica-Bold')
                .text('Example:')
                .moveDown(0.3);

            doc.fontSize(9)
                .font('Helvetica')
                .text('Goldman, Anne. "Questions of Transport: Reading, Writing, and River-Going in Huckleberry Finn." Nineteenth-Century Literature, vol. 68, no. 4, Mar. 2014, pp. 499-523. JSTOR, doi:10.1525/ncl.2014.68.4.499.')
                .moveDown(2);

            // Part 3: In-Text Citations
            doc.fontSize(18)
                .font('Helvetica-Bold')
                .text('Part 3: In-Text (Parenthetical) Citations', {
                    underline: true,
                })
                .moveDown(0.5);

            doc.fontSize(11)
                .font('Helvetica')
                .text('In-text citations point your reader from a quote or paraphrase in your essay to the full citation on your Works Cited page.')
                .moveDown(1);

            doc.fontSize(12)
                .font('Helvetica-Bold')
                .text('The Basic Rule (Author-Page):')
                .moveDown(0.5);

            doc.fontSize(11)
                .font('Helvetica')
                .text('(Author\'s Last Name Page Number)')
                .moveDown(0.5);

            doc.fontSize(10)
                .font('Helvetica-Bold')
                .text('Example:')
                .moveDown(0.3);

            doc.fontSize(10)
                .font('Helvetica')
                .text('The main character\'s isolation is a key theme (Orwell 74).')
                .moveDown(1);

            doc.fontSize(12)
                .font('Helvetica-Bold')
                .text('Common Scenarios:')
                .moveDown(0.5);

            // Author Named in Sentence
            doc.fontSize(11)
                .font('Helvetica-Bold')
                .text('• Author Named in Sentence:')
                .moveDown(0.3);

            doc.fontSize(10)
                .font('Helvetica')
                .text('If you use the author\'s name in your sentence, you only need to put the page number in the parentheses.')
                .moveDown(0.3);

            doc.fontSize(10)
                .font('Helvetica-Bold')
                .text('Example:')
                .moveDown(0.3);

            doc.fontSize(10)
                .font('Helvetica')
                .text('According to Orwell, the Party\'s main goal is control (74).')
                .moveDown(1);

            // No Author
            doc.fontSize(11)
                .font('Helvetica-Bold')
                .text('• No Author:')
                .moveDown(0.3);

            doc.fontSize(10)
                .font('Helvetica')
                .text('If there is no author, use a shortened version of the title (the first one or two words) in quotation marks.')
                .moveDown(0.3);

            doc.fontSize(10)
                .font('Helvetica-Bold')
                .text('Example:')
                .moveDown(0.3);

            doc.fontSize(10)
                .font('Helvetica')
                .text('Drowsy driving is compared to drunk driving in its level of impairment ("The Dangers").')
                .moveDown(1);

            // No Page Number
            doc.fontSize(11)
                .font('Helvetica-Bold')
                .text('• No Page Number (e.g., Websites):')
                .moveDown(0.3);

            doc.fontSize(10)
                .font('Helvetica')
                .text('If the source has no page numbers, just use the author\'s name (or shortened title). Do not use paragraph numbers unless the source explicitly numbers them.')
                .moveDown(0.3);

            doc.fontSize(10)
                .font('Helvetica-Bold')
                .text('Example:')
                .moveDown(0.3);

            doc.fontSize(10)
                .font('Helvetica')
                .text('The NSC warns that this is a major problem (DiGiacomo).')
                .moveDown(1);

            // Two Authors
            doc.fontSize(11)
                .font('Helvetica-Bold')
                .text('• Two Authors:')
                .moveDown(0.3);

            doc.fontSize(10)
                .font('Helvetica')
                .text('(Last Name & Last Name Page)')
                .moveDown(0.3);

            doc.fontSize(10)
                .font('Helvetica-Bold')
                .text('Example:')
                .moveDown(0.3);

            doc.fontSize(10)
                .font('Helvetica')
                .text('(Smith and Jones 22)')
                .moveDown(1);

            // Three or More Authors
            doc.fontSize(11)
                .font('Helvetica-Bold')
                .text('• Three or More Authors:')
                .moveDown(0.3);

            doc.fontSize(10)
                .font('Helvetica')
                .text('(First Author\'s Last Name et al. Page)')
                .moveDown(0.3);

            doc.fontSize(10)
                .font('Helvetica-Bold')
                .text('Example:')
                .moveDown(0.3);

            doc.fontSize(10)
                .font('Helvetica')
                .text('(Johnson et al. 15)')
                .moveDown(2);

            // Footer
            doc.fontSize(8)
                .font('Helvetica')
                .fillColor('gray')
                .text('StartRight Tutoring - MLA 9th Edition Citation Guide', {
                    align: 'center',
                });

            // Finalize PDF
            doc.end();

            stream.on('finish', () => {
                resolve(outputPath);
            });

            stream.on('error', (error) => {
                reject(error);
            });
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = {
    generateMLACitationGuidePDF,
};

