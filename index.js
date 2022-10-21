import cheerio from "cheerio";
import { exec } from "child_process";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import flags from "flags";
import fs from "fs";
import path from "path";
import readline from "readline";

flags.defineBoolean("debug");
flags.parse();

const __filename = fileURLToPath(import.meta.url),
	__dirname = path.dirname(__filename),
	debug = flags.get("debug");

const scrapeHTML = async (url) => {
	if (debug) console.log("Scraping...");

	const response = await fetch(url);

	if (debug) console.log({ response });

	let body = await response.text();

	return body;
};

const removeUnnecessaryParts = (body) => {
	if (debug) console.log("Removing unnecessary parts...");

	const $ = cheerio.load(body);

	$("sup.crossreference").remove();

	const html = $.html(".passage-content.passage-class-0");

	if (debug) console.log({ cheerioHTML: html });

	return html;
};

const addStyling = (body) => {
	return `<html>
            <head>
                <link href="https://www.biblegateway.com/assets/css/passage.min.css?132b483e" media="screen" rel="stylesheet" type="text/css">
                <link href="https://www.biblegateway.com/assets/css/passage.min.css?132b483e" media="print" rel="stylesheet" type="text/css">
                <link href="https://www.biblegateway.com/assets/css/printer.min.css?132b483e" media="screen" rel="stylesheet" type="text/css">
                <link href="https://www.biblegateway.com/assets/css/printer.min.css?132b483e" media="print" rel="stylesheet" type="text/css">

                <link rel="stylesheet" href="../styles.css" />
            </head>
            <body>
                ${body}
            </body>
        </html>`;
};

const writeFile = (body) => {
	const filePath = path.resolve(__dirname, "html", `${Date.now()}.html`);

	if (debug) console.log(`Writing to ${filePath}`);

	fs.writeFileSync(filePath, body, {
		encoding: "utf-8",
	});

	return filePath;
};

const getPage = async (reference, version = "ESV") => {
	if (debug) console.log({ version });

	if (debug)
		console.log(
			`https://www.biblegateway.com/passage/?search=${encodeURIComponent(
				reference
			)}&version=${encodeURIComponent(version)}&interface=print`
		);

	let body = await scrapeHTML(
		`https://www.biblegateway.com/passage/?search=${encodeURIComponent(
			reference
		)}&version=${encodeURIComponent(version)}&interface=print`
	);

	body = addStyling(removeUnnecessaryParts(body));

	if (debug) console.log({ finalHTMLBody: body });

	const filePath = writeFile(body);

	exec(`open ${filePath}`);
};

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

rl.question("Enter reference (e.g. Psalm 42) ... ", function (reference) {
	rl.question("Enter version (or blank for ESV) ... ", function (version) {
		(async function () {
			await getPage(reference, version || undefined);
			rl.close();
		})();
	});
});

rl.on("close", function () {
	process.exit(0);
});
