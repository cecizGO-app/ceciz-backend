import multer from "multer";

const storage = multer.memoryStorage();

export const uploadImage = multer({
	storage,
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB
	},
	fileFilter: (_req, file, cb) => {
		if (file.mimetype.startsWith("image/")) {
			cb(null, true);
		} else {
			cb(
				new Error(
					"Format file tidak didukung. Harap unggah file gambar (JPG, PNG, WEBP)",
				),
			);
		}
	},
});
