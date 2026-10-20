import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "ceciz-storage";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

export const s3Client = new S3Client({
	region: "auto",
	...(R2_ACCOUNT_ID && {
		endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	}),
	credentials: {
		accessKeyId: R2_ACCESS_KEY_ID || "",
		secretAccessKey: R2_SECRET_ACCESS_KEY || "",
	},
});

export const isR2Configured = Boolean(
	R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY,
);

export interface UploadOptions {
	fileBuffer: Buffer;
	fileName: string;
	mimeType: string;
	folder?: string;
}

export async function uploadToR2({
	fileBuffer,
	fileName,
	mimeType,
	folder = "payments",
}: UploadOptions): Promise<string> {
	if (!isR2Configured) {
		throw new Error(
			"Cloudflare R2 belum dikonfigurasi. Mohon isi R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, dan R2_SECRET_ACCESS_KEY di file .env",
		);
	}

	const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
	const key = `${folder}/${Date.now()}-${cleanFileName}`;

	await s3Client.send(
		new PutObjectCommand({
			Bucket: R2_BUCKET_NAME,
			Key: key,
			Body: fileBuffer,
			ContentType: mimeType,
		}),
	);

	if (R2_PUBLIC_URL) {
		const baseUrl = R2_PUBLIC_URL.replace(/\/$/, "");
		return `${baseUrl}/${key}`;
	}

	return `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
}
