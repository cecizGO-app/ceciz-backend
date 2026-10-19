export const openApiSpec = {
	openapi: "3.1.0",
	info: {
		title: "Ceciz GO - Backend API",
		version: "1.0.0",
		description:
			"Dokumentasi resmi Ceciz GO Backend API menggunakan Scalar. Berisi endpoint administrasi batch pesanan, tracking logistik, dan autentikasi.",
		contact: {
			name: "Ceciz GO Development Team",
		},
	},
	servers: [
		{
			url: "http://localhost:3005",
			description: "Local Development Server",
		},
	],
	tags: [
		{
			name: "Authentication",
			description: "Endpoint autentikasi dan manajemen sesi (Better Auth)",
		},
		{
			name: "Admin - Batches",
			description: "Operasi CRUD batch pesanan (Khusus role OWNER & STAFF)",
		},
		{
			name: "Admin - Tracking",
			description:
				"Operasi status tracking dan logistik batch (Khusus role OWNER & STAFF)",
		},
	],
	components: {
		securitySchemes: {
			cookieAuth: {
				type: "apiKey",
				in: "cookie",
				name: "better-auth.session_token",
				description: "Cookie sesi login dari Better Auth",
			},
		},
		schemas: {
			CountryCode: {
				type: "string",
				enum: ["CH", "KR", "TH", "JP", "INA"],
				description: "Kode negara batch",
			},
			BatchStatus: {
				type: "string",
				enum: ["OPEN", "CLOSED", "ARCHIVED"],
				description: "Status lifecycle batch",
			},
			TrackingStatus: {
				type: "string",
				enum: ["PO", "OTW_WH", "AT_WH", "OTW_INA", "ARRIVED", "DISTRIBUTED"],
				description: "Status pelacakan logistik",
			},
			BatchItemInput: {
				type: "object",
				required: ["buyerId", "description", "hargaAsli"],
				properties: {
					buyerId: {
						type: "string",
						description: "ID user pembeli",
						example: "usr_123abc",
					},
					buyerName: {
						type: "string",
						description: "Nama pembeli (opsional)",
						example: "Yudha",
					},
					description: {
						type: "string",
						description: "Nama atau varian merchandise",
						example: "Album Photobook Ver. A",
					},
					hargaAsli: {
						type: "number",
						description: "Harga asli dalam mata uang negara asal",
						example: 25000,
					},
					pcs: {
						type: "integer",
						default: 1,
						description: "Jumlah item",
						example: 2,
					},
					feeNyelem: {
						type: "number",
						description: "Biaya nyelem override per item (IDR)",
						example: 5000,
					},
					hargaPerBuyer: {
						type: "number",
						description: "Harga kalkulasi dalam IDR",
						example: 320000,
					},
					hargaJualPerBuyer: {
						type: "number",
						description: "Harga jual akhir ke buyer (IDR)",
						example: 350000,
					},
				},
			},
			CreateBatchRequest: {
				type: "object",
				required: ["countryCode", "batchNumber", "batchDate", "title"],
				properties: {
					countryCode: { $ref: "#/components/schemas/CountryCode" },
					batchNumber: {
						type: "integer",
						description: "Nomor urut batch untuk negara tersebut",
						example: 10,
					},
					batchDate: {
						type: "string",
						format: "date",
						description: "Tanggal batch dibuat (YYYY-MM-DD)",
						example: "2026-10-18",
					},
					title: {
						type: "string",
						maxLength: 50,
						description: "Judul singkat batch",
						example: "Batch PO Album Comeback Oktober",
					},
					description: {
						type: "string",
						maxLength: 250,
						description: "Deskripsi detail batch (opsional)",
						example: "Pengiriman via laut, estimasi 3-4 minggu",
					},
					shippingFee: {
						type: "number",
						description: "Ongkos kirim internasional",
						example: 150000,
					},
					feeGo: {
						type: "number",
						default: 0,
						description: "Biaya jasa group order (IDR)",
						example: 10000,
					},
					feeRekap: {
						type: "number",
						default: 0,
						description: "Biaya admin rekap pesanan (IDR)",
						example: 5000,
					},
					feeNyelem: {
						type: "number",
						default: 0,
						description: "Biaya checkout nyelem (IDR)",
						example: 0,
					},
					rateHarian: {
						type: "number",
						description:
							"Kurs tukar mata uang hari ini (IDR per mata uang asing)",
						example: 12.5,
					},
					feeWh: {
						type: "number",
						description: "Biaya warehouse luar negeri",
						example: 20000,
					},
					feeProxy: {
						type: "number",
						description: "Biaya proxy luar negeri",
						example: 15000,
					},
					adminNyelemId: {
						type: "string",
						description: "User ID admin yang mengurus checkout",
					},
					proxyCoName: {
						type: "string",
						description: "Nama penyedia jasa proxy checkout",
					},
					items: {
						type: "array",
						items: { $ref: "#/components/schemas/BatchItemInput" },
					},
				},
			},
			UpdateBatchRequest: {
				type: "object",
				properties: {
					countryCode: { $ref: "#/components/schemas/CountryCode" },
					batchNumber: { type: "integer" },
					batchDate: { type: "string", format: "date" },
					title: { type: "string", maxLength: 50 },
					description: { type: "string", maxLength: 250 },
					shippingFee: { type: "number" },
					feeGo: { type: "number" },
					feeRekap: { type: "number" },
					feeNyelem: { type: "number" },
					rateHarian: { type: "number" },
					feeWh: { type: "number" },
					feeProxy: { type: "number" },
					adminNyelemId: { type: "string" },
					proxyCoName: { type: "string" },
					status: { $ref: "#/components/schemas/BatchStatus" },
					hargaTotal: {
						type: "number",
						description: "Total harga kotor batch (IDR)",
						example: 3200000,
					},
					hargaTfSeller: {
						type: "number",
						description: "Total transfer ke seller (IDR)",
						example: 2800000,
					},
					selisihHarga: {
						type: "number",
						description: "Selisih harga (IDR)",
						example: 400000,
					},
					labaBersih: {
						type: "number",
						description: "Laba bersih akhir batch (IDR)",
						example: 350000,
					},
				},
			},
			UpdateTrackingRequest: {
				type: "object",
				properties: {
					trackingStatus: { $ref: "#/components/schemas/TrackingStatus" },
					resiNumber: {
						type: "array",
						items: { type: "string" },
						description: "Daftar nomor resi pengiriman",
						example: ["SPXID0123456789", "JP987654321"],
					},
					whName: {
						type: "string",
						description: "Nama warehouse logistik",
						example: "Gudang Seoul Hub A",
					},
					boxNo: {
						type: "string",
						description: "Nomor box / koli paket",
						example: "BOX-04",
					},
					description: {
						type: "string",
						description: "Keterangan isi / progres paket",
					},
					checkedOut: {
						type: "boolean",
						description: "Apakah seluruh barang sudah selesai dicheckout",
					},
					uploadedToAlbum: {
						type: "boolean",
						description: "Apakah foto barang sudah diunggah ke album foto",
					},
					notes: {
						type: "string",
						description: "Catatan khusus tracking",
					},
				},
			},
			StandardResponse: {
				type: "object",
				properties: {
					success: { type: "boolean", example: true },
					message: { type: "string", example: "Operasi berhasil" },
					data: { type: "object" },
				},
			},
			ErrorResponse: {
				type: "object",
				properties: {
					success: { type: "boolean", example: false },
					message: { type: "string", example: "Pesan error" },
					errors: {
						type: "array",
						items: {
							type: "object",
							properties: {
								field: { type: "string", example: "title" },
								message: { type: "string", example: "Judul batch wajib diisi" },
							},
						},
					},
				},
			},
		},
	},
	paths: {
		"/api/auth/sign-in/email": {
			post: {
				tags: ["Authentication"],
				summary: "Login Akun Email",
				description: "Login menggunakan email dan password via Better Auth.",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								required: ["email", "password"],
								properties: {
									email: {
										type: "string",
										format: "email",
										example: "admin@ceciz.com",
									},
									password: { type: "string", example: "secretPassword123" },
								},
							},
						},
					},
				},
				responses: {
					"200": { description: "Login berhasil, session cookie diset." },
					"400": { description: "Email atau password salah." },
				},
			},
		},
		"/api/auth/get-session": {
			get: {
				tags: ["Authentication"],
				summary: "Cek Sesi Login Saat Ini",
				security: [{ cookieAuth: [] }],
				responses: {
					"200": { description: "Sesi valid, mengembalikan data user." },
					"401": { description: "Belum login / sesi kedaluwarsa." },
				},
			},
		},
		"/api/auth/sign-out": {
			post: {
				tags: ["Authentication"],
				summary: "Logout Akun",
				security: [{ cookieAuth: [] }],
				responses: {
					"200": { description: "Logout berhasil, cookie dihapus." },
				},
			},
		},
		"/api/v1/admin/batches": {
			post: {
				tags: ["Admin - Batches"],
				summary: "Membuat Batch Baru",
				description:
					"Membuat batch impor baru beserta daftar items awal (Opsional). Khusus role OWNER atau STAFF.",
				security: [{ cookieAuth: [] }],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/CreateBatchRequest" },
						},
					},
				},
				responses: {
					"201": {
						description: "Batch berhasil dibuat",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/StandardResponse" },
							},
						},
					},
					"400": {
						description: "Validasi data gagal",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ErrorResponse" },
							},
						},
					},
					"401": { description: "Tidak terautentikasi" },
					"403": { description: "Role tidak diizinkan" },
					"409": {
						description: "Batch dengan nomor dan negara tersebut sudah ada",
					},
				},
			},
			get: {
				tags: ["Admin - Batches"],
				summary: "Daftar Semua Batch",
				description:
					"Mengambil daftar batch dengan filter countryCode dan status. Khusus role OWNER atau STAFF.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "countryCode",
						in: "query",
						required: false,
						schema: { $ref: "#/components/schemas/CountryCode" },
						description: "Filter berdasarkan negara (CH, KR, TH, JP, INA)",
					},
					{
						name: "status",
						in: "query",
						required: false,
						schema: { $ref: "#/components/schemas/BatchStatus" },
						description:
							"Filter berdasarkan status batch (OPEN, CLOSED, ARCHIVED)",
					},
					{
						name: "search",
						in: "query",
						required: false,
						schema: { type: "string" },
						description:
							"Cari berdasarkan judul, nomor batch, warehouse, atau proxy",
					},
					{
						name: "whName",
						in: "query",
						required: false,
						schema: { type: "string" },
						description: "Filter berdasarkan nama warehouse logistik",
					},
					{
						name: "includeArchived",
						in: "query",
						required: false,
						schema: { type: "boolean" },
						description: "Tampilkan batch yang diarsipkan (true/false)",
					},
					{
						name: "page",
						in: "query",
						required: false,
						schema: { type: "integer" },
						description: "Halaman pagination",
					},
					{
						name: "limit",
						in: "query",
						required: false,
						schema: { type: "integer" },
						description: "Jumlah data per halaman",
					},
				],
				responses: {
					"200": {
						description: "Berhasil mengambil daftar batch",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/StandardResponse" },
							},
						},
					},
					"400": { description: "Query parameter tidak valid" },
					"401": { description: "Tidak terautentikasi" },
					"403": { description: "Role tidak diizinkan" },
				},
			},
		},
		"/api/v1/admin/batches/stats": {
			get: {
				tags: ["Admin - Batches"],
				summary: "Statistik & Ringkasan Batch",
				description:
					"Mengambil ringkasan metrik batch: total batch aktif, total PC berjalan, batch menunggu kalkulasi laba, dan batch diarsipkan. Khusus role OWNER atau STAFF.",
				security: [{ cookieAuth: [] }],
				responses: {
					"200": {
						description: "Berhasil mengambil statistik batch",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										success: { type: "boolean", example: true },
										message: {
											type: "string",
											example: "Berhasil mengambil statistik batch",
										},
										data: {
											type: "object",
											properties: {
												totalBatchAktif: { type: "integer", example: 5 },
												totalPcDiproses: { type: "integer", example: 42 },
												menungguKalkulasiLaba: { type: "integer", example: 2 },
												batchDiarsipkan: { type: "integer", example: 10 },
											},
										},
									},
								},
							},
						},
					},
					"401": { description: "Tidak terautentikasi" },
					"403": { description: "Role tidak diizinkan" },
				},
			},
		},
		"/api/v1/admin/batches/{id}": {
			get: {
				tags: ["Admin - Batches"],
				summary: "Detail Batch Berdasarkan ID",
				description:
					"Mengambil detail lengkap batch termasuk items, admin nyelem, dan tracking. Khusus role OWNER atau STAFF.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "ID unik batch (CUID)",
					},
				],
				responses: {
					"200": { description: "Berhasil mengambil detail batch" },
					"404": { description: "Batch tidak ditemukan" },
					"401": { description: "Tidak terautentikasi" },
					"403": { description: "Role tidak diizinkan" },
				},
			},
			patch: {
				tags: ["Admin - Batches"],
				summary: "Update Data Batch",
				description: "Memperbarui kolom pada batch tertentu berdasarkan ID.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "ID unik batch (CUID)",
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/UpdateBatchRequest" },
						},
					},
				},
				responses: {
					"200": { description: "Update batch berhasil" },
					"400": { description: "Validasi data gagal" },
					"404": { description: "Batch dengan ID tersebut tidak ditemukan" },
					"409": {
						description: "Nomor batch untuk negara tersebut sudah terpakai",
					},
				},
			},
			delete: {
				tags: ["Admin - Batches"],
				summary: "Hapus Batch",
				description:
					"Menghapus batch jika belum memiliki items atau transaksi order.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "ID unik batch (CUID)",
					},
				],
				responses: {
					"200": { description: "Batch berhasil dihapus" },
					"400": {
						description:
							"Batch tidak dapat dihapus karena masih memiliki relasi data",
					},
					"404": { description: "Batch tidak ditemukan" },
				},
			},
		},
		"/api/v1/admin/tracking": {
			get: {
				tags: ["Admin - Tracking"],
				summary: "Daftar Semua Tracking Logistik",
				description:
					"Mengambil daftar pelacakan logistik batch dengan filter negara, status, warehouse, atau pencarian umum.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "countryCode",
						in: "query",
						required: false,
						schema: { $ref: "#/components/schemas/CountryCode" },
					},
					{
						name: "trackingStatus",
						in: "query",
						required: false,
						schema: { $ref: "#/components/schemas/TrackingStatus" },
					},
					{
						name: "whName",
						in: "query",
						required: false,
						schema: { type: "string" },
						description: "Filter nama warehouse (case-insensitive)",
					},
					{
						name: "search",
						in: "query",
						required: false,
						schema: { type: "string" },
						description:
							"Cari nomor resi, nomor box, nama buyer, deskripsi merch, dsb.",
					},
				],
				responses: {
					"200": { description: "Berhasil mengambil data tracking logistik" },
					"400": { description: "Query parameter tidak valid" },
				},
			},
		},
		"/api/v1/admin/tracking/{batchId}": {
			get: {
				tags: ["Admin - Tracking"],
				summary: "Detail Tracking Berdasarkan Batch ID",
				description:
					"Mengambil data tracking batch. Jika data tracking belum ada, endpoint akan otomatis menginisialisasi tracking baru dengan status awal PO.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "batchId",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "ID batch",
					},
				],
				responses: {
					"200": { description: "Berhasil mengambil detail tracking batch" },
					"404": { description: "Batch tidak ditemukan" },
				},
			},
			patch: {
				tags: ["Admin - Tracking"],
				summary: "Update Status Tracking",
				description:
					"Memperbarui status logistik, nomor resi, nomor box, gudang, dan catatan untuk batch tertentu.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "batchId",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "ID batch",
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/UpdateTrackingRequest" },
						},
					},
				},
				responses: {
					"200": { description: "Data tracking berhasil diperbarui" },
					"400": { description: "Validasi data tracking gagal" },
					"404": { description: "Batch tidak ditemukan" },
				},
			},
		},
	},
};
