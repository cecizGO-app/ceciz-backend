import multer from "multer";
import { AppError } from "../../../lib/errors.js";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/** Magic bytes for supported image formats */
const MAGIC_BYTES: Record<string, number[][]> = {
	"image/jpeg": [[0xff, 0xd8, 0xff]],
	"image/png": [[0x89, 0x50, 0x4e, 0x47]],
	"image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF header (partial; full check needs offset 8)
};

export function detectMimeFromBuffer(buf: Buffer): string | null {
	for (const [mime, patterns] of Object.entries(MAGIC_BYTES)) {
		for (const pattern of patterns) {
			if (pattern.every((byte, i) => buf[i] === byte)) {
				// Extra check for WEBP: bytes 8-11 must be "WEBP"
				if (mime === "image/webp") {
					const webpMarker = buf.slice(8, 12).toString("ascii");
					if (webpMarker !== "WEBP") continue;
				}
				return mime;
			}
		}
	}
	return null;
}

export function validateImageMime(file: Express.Multer.File): void {
	const detectedMime = detectMimeFromBuffer(file.buffer);
	if (!detectedMime || !ALLOWED_MIME_TYPES.includes(detectedMime as never)) {
		throw AppError.badRequest(
			"Format file tidak didukung. Harap unggah file JPEG, PNG, atau WEBP.",
		);
	}
}

export const uploadPaymentProof = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_FILE_SIZE },
	fileFilter: (_req, file, cb) => {
		// Quick check by declared mime (deep validation happens after upload)
		if (ALLOWED_MIME_TYPES.includes(file.mimetype as never)) {
			cb(null, true);
		} else {
			cb(
				new Error(
					"Format file tidak didukung. Harap unggah file JPEG, PNG, atau WEBP.",
				),
			);
		}
	},
}).single("proof");
