import { createWriteStream, existsSync, statSync } from "fs";
import archiver from "archiver";

const output = createWriteStream("find-on-reddit.zip");
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
    console.log(`Created ZIP: ${archive.pointer()} total bytes`);
});

archive.pipe(output);

const include = [
    "css/",
    "fonts/",
    "js/",
    "manifest.json",
    "Privacy Policy.md",
    // js
    "background.js",
    "chrome.js",
    "options.js",
    "popup.js",
    "query.js",
    "reddit.js",
    "url.js",
    "utils.js",
    // html
    "options.html",
    "popup.html",
    "template.html",
    // icons
    "icon-16.png",
    "icon-48.png",
    "icon-128.png",
    "icon-256.png",
];

// Add each file/folder
include.forEach((item) => {
    if (existsSync(item)) {
        const stat = statSync(item);
        if (stat.isDirectory()) {
            archive.directory(item, item);
        } else {
            archive.file(item, { name: item });
        }
    }
});

archive.finalize();
