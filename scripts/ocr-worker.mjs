/**
 * ocr-worker.mjs
 * Place this at: scripts/ocr-worker.mjs  (project root, outside src/app)
 *
 * Called by route.ts via child_process.fork().
 * Receives image data as base64 via IPC, runs Tesseract, sends text back.
 */
import Tesseract from "tesseract.js";

process.on("message", async ({ imageBase64 }) => {
	try {
		const imageBuffer = Buffer.from(imageBase64, "base64");
		const result = await Tesseract.recognize(imageBuffer, "eng");
		process.send({ ok: true, text: result.data.text });
	} catch (err) {
		process.send({ ok: false, error: err.message });
	} finally {
		process.exit(0);
	}
});
