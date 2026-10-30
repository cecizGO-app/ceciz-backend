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
		{
			name: "Admin - Payments",
			description:
				"Operasi verifikasi, penolakan, pencatatan manual, dan statistik pembayaran (Khusus role OWNER & STAFF)",
		},
		{
			name: "Storage & Upload",
			description: "Unggah file dan gambar ke Cloudflare R2 storage",
		},
		{
			name: "Buyer - Batches",
			description: "Katalog batch pesanan yang dibuka untuk buyer",
		},
		{
			name: "Buyer - Orders",
			description: "Pemesanan item batch dan riwayat order buyer",
		},
		{
			name: "Buyer - Invoices",
			description: "Daftar dan rincian tagihan invoice pemesanan buyer",
		},
		{
			name: "Buyer - Payments",
			description: "Unggah bukti bayar dan riwayat pembayaran invoice batch",
		},
		{
			name: "Buyer - Tax",
			description:
				"Tagihan pajak (tax invoice) dan konfirmasi pembayaran pajak",
		},
		{
			name: "Buyer - Tracking",
			description: "Status pelacakan logistik batch pesanan buyer",
		},
		{
			name: "Buyer - Notifications",
			description: "Daftar notifikasi, status dibaca, dan hitungan unread",
		},
		{
			name: "Buyer - Push Notifications",
			description: "Pengelolaan langganan Web Push notification (VAPID)",
		},
		{
			name: "Buyer - History",
			description: "Riwayat batch yang telah lunas dan pembayaran yang disetujui",
		},
		{
			name: "Buyer - Profile",
			description: "Profil data diri dan status onboarding buyer",
		},
		{
			name: "Content",
			description: "Konten publik, bantuan FAQ, dan kontak Customer Service",
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
			PaymentMethod: {
				type: "string",
				enum: ["BCA", "QRIS", "SEABANK", "SPAY", "CASH"],
				description: "Metode transfer pembayaran",
			},
			VerificationStatus: {
				type: "string",
				enum: ["PENDING", "APPROVED", "REJECTED"],
				description: "Status verifikasi pembayaran",
			},
			VerifyPaymentRequest: {
				type: "object",
				required: ["status"],
				properties: {
					status: {
						type: "string",
						enum: ["APPROVED", "REJECTED"],
						description: "Status persetujuan verifikasi",
					},
					rejectReason: {
						type: "string",
						description: "Alasan penolakan (wajib jika status REJECTED)",
						example: "Bukti transfer buram / nominal tidak sesuai",
					},
				},
			},
			BulkVerifyPaymentRequest: {
				type: "object",
				required: ["paymentIds", "status"],
				properties: {
					paymentIds: {
						type: "array",
						items: { type: "string" },
						description: "Daftar ID pembayaran yang dipilih",
					},
					status: {
						type: "string",
						enum: ["APPROVED", "REJECTED"],
					},
					rejectReason: {
						type: "string",
						description: "Alasan jika ditolak",
					},
				},
			},
			CreatePaymentRequest: {
				type: "object",
				required: ["invoiceId", "buyerId", "amount", "paymentMethod"],
				properties: {
					invoiceId: { type: "string", example: "inv_123abc" },
					buyerId: { type: "string", example: "usr_456def" },
					amount: { type: "number", example: 685000 },
					paymentMethod: { $ref: "#/components/schemas/PaymentMethod" },
					paymentDate: { type: "string", format: "date-time" },
					paymentProofUrl: {
						type: "string",
						example: "https://r2.ceciz.com/proof.jpg",
					},
					notes: { type: "string", example: "Pelunasan 3 pcs PC" },
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
			OrderStatus: {
				type: "string",
				enum: ["PENDING", "CONFIRMED", "PROCESSING", "COMPLETED", "CANCELLED"],
				description: "Status lifecycle pemesanan order buyer",
			},
			InvoiceStatus: {
				type: "string",
				enum: [
					"UNPAID",
					"AWAITING_VERIFICATION",
					"PAID",
					"OVERDUE",
					"CANCELLED",
				],
				description: "Status tagihan invoice batch",
			},
			TaxInvoiceStatus: {
				type: "string",
				enum: [
					"UNPAID",
					"AWAITING_VERIFICATION",
					"PAID",
					"OVERDUE",
					"CANCELLED",
				],
				description: "Status tagihan pajak (tax invoice)",
			},
			CreateOrderRequest: {
				type: "object",
				required: ["batch_id", "item_qty"],
				properties: {
					batch_id: {
						type: "string",
						description: "ID batch yang ingin dipesan",
						example: "clx123abc",
					},
					item_qty: {
						type: "integer",
						minimum: 1,
						description: "Jumlah item yang dipesan",
						example: 2,
					},
				},
			},
			UploadBuyerPaymentRequest: {
				type: "object",
				required: ["proof", "amount", "payment_method", "payment_date"],
				properties: {
					proof: {
						type: "string",
						format: "binary",
						description:
							"File gambar bukti transfer (JPEG, PNG, atau WEBP, maks 5MB)",
					},
					amount: {
						type: "number",
						description: "Nominal pembayaran dalam integer Rupiah",
						example: 150000,
					},
					payment_method: {
						type: "string",
						enum: ["BCA", "QRIS", "SEABANK", "SPAY"],
						description: "Metode transfer",
						example: "BCA",
					},
					payment_date: {
						type: "string",
						format: "date-time",
						description:
							"Tanggal dan jam transfer dilakukan (tidak boleh masa depan)",
						example: "2026-10-21T10:00:00.000Z",
					},
				},
			},
			UpdateProfileRequest: {
				type: "object",
				properties: {
					name: {
						type: "string",
						description: "Nama lengkap pembeli",
						example: "Yudha Pratama",
					},
					contact: {
						type: "string",
						description: "Nomor WhatsApp atau nomor telepon",
						example: "081234567890",
					},
					idLine: {
						type: "string",
						description: "ID LINE pembeli",
						example: "yudha_line",
					},
					address: {
						type: "string",
						description: "Alamat lengkap pengiriman",
						example: "Jl. Sudirman No. 45, Jakarta Selatan",
					},
				},
			},
			SubscribePushRequest: {
				type: "object",
				required: ["endpoint", "p256dh", "auth"],
				properties: {
					endpoint: {
						type: "string",
						format: "uri",
						description: "Web Push subscription endpoint URL",
						example: "https://fcm.googleapis.com/fcm/send/abc123",
					},
					p256dh: {
						type: "string",
						description: "Kunci publik enkripsi P-256 client",
						example: "BNcR...",
					},
					auth: {
						type: "string",
						description: "Authentication secret client",
						example: "tBHZ...",
					},
					user_agent: {
						type: "string",
						description: "Informasi user agent / browser",
						example: "Mozilla/5.0...",
					},
				},
			},
			UnsubscribePushRequest: {
				type: "object",
				required: ["endpoint"],
				properties: {
					endpoint: {
						type: "string",
						format: "uri",
						description: "Web Push subscription endpoint yang ingin dihapus",
						example: "https://fcm.googleapis.com/fcm/send/abc123",
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
		"/api/v1/upload": {
			post: {
				tags: ["Storage & Upload"],
				summary: "Unggah File Gambar ke Cloudflare R2",
				description:
					"Mengunggah file gambar (bukti transfer, foto merch) ke Cloudflare R2 bucket. Format multipart/form-data dengan field 'file'.",
				security: [{ cookieAuth: [] }],
				requestBody: {
					required: true,
					content: {
						"multipart/form-data": {
							schema: {
								type: "object",
								properties: {
									file: {
										type: "string",
										format: "binary",
										description:
											"File gambar yang akan diunggah (JPG, PNG, WEBP)",
									},
								},
							},
						},
					},
				},
				responses: {
					"200": {
						description: "File berhasil diunggah",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										success: { type: "boolean", example: true },
										message: {
											type: "string",
											example: "Bukti pembayaran berhasil diunggah",
										},
										data: {
											type: "object",
											properties: {
												url: {
													type: "string",
													example:
														"https://r2.ceciz.com/payments/123-bukti.jpg",
												},
												fileName: { type: "string", example: "bukti.jpg" },
												size: { type: "integer", example: 204800 },
												mimeType: { type: "string", example: "image/jpeg" },
											},
										},
									},
								},
							},
						},
					},
					"400": {
						description: "File tidak disertakan atau format tidak didukung",
					},
					"500": { description: "Gagal mengunggah file ke Cloudflare R2" },
				},
			},
		},
		"/api/v1/admin/payments/stats": {
			get: {
				tags: ["Admin - Payments"],
				summary: "Statistik Verifikasi Pembayaran",
				description:
					"Mengambil ringkasan metrik verifikasi: Menunggu Verifikasi (+hari ini), Disetujui Hari Ini (count & total nominal), Ditolak Hari Ini, Total Terverifikasi Bulan Ini, dan counter tab status. Khusus role OWNER atau STAFF.",
				security: [{ cookieAuth: [] }],
				responses: {
					"200": {
						description: "Berhasil mengambil statistik pembayaran",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										success: { type: "boolean", example: true },
										message: {
											type: "string",
											example: "Berhasil mengambil statistik pembayaran",
										},
										data: {
											type: "object",
											properties: {
												menungguVerifikasi: {
													type: "object",
													properties: {
														count: { type: "integer", example: 11 },
														diunggahHariIni: { type: "integer", example: 5 },
													},
												},
												disetujuiHariIni: {
													type: "object",
													properties: {
														count: { type: "integer", example: 18 },
														totalNominal: { type: "number", example: 8450000 },
													},
												},
												ditolakHariIni: {
													type: "object",
													properties: {
														count: { type: "integer", example: 2 },
													},
												},
												totalTerverifikasiBulanIni: {
													type: "object",
													properties: {
														totalNominal: { type: "number", example: 24840000 },
														labelBulan: {
															type: "string",
															example: "Bulan Oktober 2026",
														},
													},
												},
												tabCounts: {
													type: "object",
													properties: {
														pending: { type: "integer", example: 11 },
														approved: { type: "integer", example: 2 },
														rejected: { type: "integer", example: 1 },
														all: { type: "integer", example: 14 },
													},
												},
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
		"/api/v1/admin/payments": {
			get: {
				tags: ["Admin - Payments"],
				summary: "Daftar Pembayaran (Verifikasi Admin)",
				description:
					"Mengambil daftar pembayaran dengan filter status verifikasi (PENDING, APPROVED, REJECTED), metode pembayaran, batch, rentang waktu, dan pencarian teks.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "status",
						in: "query",
						required: false,
						schema: { $ref: "#/components/schemas/VerificationStatus" },
						description: "Filter status verifikasi",
					},
					{
						name: "paymentMethod",
						in: "query",
						required: false,
						schema: { $ref: "#/components/schemas/PaymentMethod" },
						description: "Filter metode pembayaran",
					},
					{
						name: "batchId",
						in: "query",
						required: false,
						schema: { type: "string" },
						description: "Filter ID batch tertentu",
					},
					{
						name: "search",
						in: "query",
						required: false,
						schema: { type: "string" },
						description: "Pencarian nama buyer, kontak, batch, atau nominal",
					},
					{
						name: "timeRange",
						in: "query",
						required: false,
						schema: {
							type: "string",
							enum: ["today", "this_week", "this_month", "all"],
						},
						description: "Filter dropdown Semua Waktu",
					},
					{
						name: "page",
						in: "query",
						required: false,
						schema: { type: "integer" },
					},
					{
						name: "limit",
						in: "query",
						required: false,
						schema: { type: "integer" },
					},
				],
				responses: {
					"200": {
						description: "Berhasil mengambil daftar pembayaran",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/StandardResponse" },
							},
						},
					},
					"401": { description: "Tidak terautentikasi" },
					"403": { description: "Role tidak diizinkan" },
				},
			},
			post: {
				tags: ["Admin - Payments"],
				summary: "Catat Pembayaran Manual",
				description:
					"Menambahkan transaksi pembayaran manual oleh admin/owner (Tombol '+ Tambah Pembayaran'). Status langsung disetujui (APPROVED) dan mengecek pelunasan invoice.",
				security: [{ cookieAuth: [] }],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/CreatePaymentRequest" },
						},
					},
				},
				responses: {
					"201": { description: "Pembayaran manual berhasil dicatat" },
					"400": { description: "Validasi data gagal" },
					"404": { description: "Invoice tidak ditemukan" },
				},
			},
		},
		"/api/v1/admin/payments/{id}": {
			get: {
				tags: ["Admin - Payments"],
				summary: "Detail Bukti Pembayaran Berdasarkan ID",
				description:
					"Mengambil data lengkap pembayaran, buyer, invoice, dan bukti transfer URL untuk drawer modal 'Lihat Bukti'.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "ID pembayaran (CUID)",
					},
				],
				responses: {
					"200": { description: "Berhasil mengambil detail pembayaran" },
					"404": { description: "Pembayaran tidak ditemukan" },
				},
			},
		},
		"/api/v1/admin/payments/{id}/verify": {
			patch: {
				tags: ["Admin - Payments"],
				summary: "Verifikasi Pembayaran (Setujui / Tolak)",
				description:
					"Menyetujui (APPROVED) atau menolak (REJECTED) bukti pembayaran. Jika disetujui dan invoice lunas, status invoice otomatis berubah menjadi PAID. Jika ditolak, rejectReason wajib diisi.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "ID pembayaran",
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/VerifyPaymentRequest" },
						},
					},
				},
				responses: {
					"200": { description: "Pembayaran berhasil diverifikasi" },
					"400": { description: "Validasi data gagal" },
					"404": { description: "Pembayaran tidak ditemukan" },
				},
			},
		},
		"/api/v1/admin/payments/bulk-verify": {
			post: {
				tags: ["Admin - Payments"],
				summary: "Verifikasi Massal (Bulk Verify)",
				description:
					"Menyetujui atau menolak beberapa pembayaran sekaligus berdasarkan checkbox baris tabel.",
				security: [{ cookieAuth: [] }],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/BulkVerifyPaymentRequest" },
						},
					},
				},
				responses: {
					"200": { description: "Pembayaran berhasil diperbarui" },
					"400": { description: "Validasi data gagal" },
				},
			},
		},
		"/api/v1/buyer/batches": {
			get: {
				tags: ["Buyer - Batches"],
				summary: "Katalog Batch Tersedia untuk Buyer",
				description:
					"Mendapatkan daftar batch yang sedang dibuka (OPEN) untuk dipesan oleh buyer. Mendukung filter negara dan paginasi.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "page",
						in: "query",
						required: false,
						schema: { type: "integer", default: 1 },
						description: "Halaman data",
					},
					{
						name: "limit",
						in: "query",
						required: false,
						schema: { type: "integer", default: 20 },
						description: "Jumlah data per halaman",
					},
					{
						name: "country_code",
						in: "query",
						required: false,
						schema: { $ref: "#/components/schemas/CountryCode" },
						description: "Filter batch berdasarkan kode negara",
					},
				],
				responses: {
					"200": { description: "Berhasil mengambil daftar batch untuk buyer" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
				},
			},
		},
		"/api/v1/buyer/batches/{id}": {
			get: {
				tags: ["Buyer - Batches"],
				summary: "Detail Batch untuk Buyer",
				description:
					"Mengambil data detail batch, status, kurs harian, dan estimasi waktu.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "ID batch",
					},
				],
				responses: {
					"200": { description: "Berhasil mengambil detail batch" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
					"404": { description: "Batch tidak ditemukan" },
				},
			},
		},
		"/api/v1/buyer/orders": {
			post: {
				tags: ["Buyer - Orders"],
				summary: "Pesan Item Batch (Buat / Update Order)",
				description:
					"Membuat pesanan baru atau memperbarui jumlah item yang dipesan pada batch tertentu. Secara otomatis membuat atau memperbarui tagihan invoice.",
				security: [{ cookieAuth: [] }],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/CreateOrderRequest" },
						},
					},
				},
				responses: {
					"201": {
						description: "Order dan invoice berhasil dibuat/diperbarui",
					},
					"400": { description: "Validasi data gagal" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
					"409": {
						description:
							"Pembayaran invoice sudah disetujui, order tidak dapat diubah",
					},
				},
			},
			get: {
				tags: ["Buyer - Orders"],
				summary: "Daftar Riwayat Pesanan Buyer",
				description:
					"Mendapatkan riwayat pesanan milik buyer yang sedang login dengan filter status dan paginasi.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "page",
						in: "query",
						required: false,
						schema: { type: "integer", default: 1 },
					},
					{
						name: "limit",
						in: "query",
						required: false,
						schema: { type: "integer", default: 20 },
					},
					{
						name: "status",
						in: "query",
						required: false,
						schema: { $ref: "#/components/schemas/OrderStatus" },
					},
				],
				responses: {
					"200": { description: "Berhasil mengambil riwayat order" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
				},
			},
		},
		"/api/v1/buyer/orders/{id}": {
			get: {
				tags: ["Buyer - Orders"],
				summary: "Detail Pesanan Buyer Berdasarkan ID",
				description: "Mengambil detail pesanan spesifik milik buyer.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "ID order",
					},
				],
				responses: {
					"200": { description: "Berhasil mengambil detail order" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
					"404": { description: "Order tidak ditemukan" },
				},
			},
		},
		"/api/v1/buyer/invoices": {
			get: {
				tags: ["Buyer - Invoices"],
				summary: "Daftar Tagihan (Invoices) Buyer",
				description:
					"Mendapatkan daftar invoice pesanan batch milik buyer beserta status pelunasan dan kalkulasi denda jika melewati deadline.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "page",
						in: "query",
						required: false,
						schema: { type: "integer", default: 1 },
					},
					{
						name: "limit",
						in: "query",
						required: false,
						schema: { type: "integer", default: 20 },
					},
					{
						name: "status",
						in: "query",
						required: false,
						schema: { $ref: "#/components/schemas/InvoiceStatus" },
					},
					{
						name: "batch_id",
						in: "query",
						required: false,
						schema: { type: "string" },
					},
				],
				responses: {
					"200": { description: "Berhasil mengambil daftar tagihan invoice" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
				},
			},
		},
		"/api/v1/buyer/invoices/{id}": {
			get: {
				tags: ["Buyer - Invoices"],
				summary: "Detail Tagihan Invoice Buyer",
				description:
					"Mengambil rincian invoice, item pesanan, batas waktu (deadline), denda keterlambatan (jika ada), dan status pembayaran.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "ID invoice",
					},
				],
				responses: {
					"200": { description: "Berhasil mengambil detail invoice" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
					"404": { description: "Invoice tidak ditemukan" },
				},
			},
		},
		"/api/v1/buyer/invoices/{id}/payments": {
			post: {
				tags: ["Buyer - Payments"],
				summary: "Unggah Bukti Bayar Tagihan Invoice",
				description:
					"Mengunggah foto bukti transfer untuk invoice pesanan batch. File gambar (JPG, PNG, WEBP, maks 5MB) diunggah via form-data. Status tagihan otomatis menjadi AWAITING_VERIFICATION.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "ID invoice",
					},
				],
				requestBody: {
					required: true,
					content: {
						"multipart/form-data": {
							schema: {
								$ref: "#/components/schemas/UploadBuyerPaymentRequest",
							},
						},
					},
				},
				responses: {
					"201": { description: "Bukti bayar berhasil diunggah" },
					"400": { description: "Validasi file atau data transfer gagal" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
					"404": { description: "Invoice tidak ditemukan" },
					"409": {
						description:
							"Sudah ada pembayaran yang menunggu verifikasi atau sudah lunas",
					},
				},
			},
			get: {
				tags: ["Buyer - Payments"],
				summary: "Riwayat Bukti Pembayaran Invoice",
				description:
					"Melihat riwayat pembayaran yang telah diunggah untuk invoice tertentu beserta status verifikasinya oleh admin.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "ID invoice",
					},
				],
				responses: {
					"200": { description: "Berhasil mengambil riwayat pembayaran" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
					"404": { description: "Invoice tidak ditemukan" },
				},
			},
		},
		"/api/v1/buyer/taxes": {
			get: {
				tags: ["Buyer - Tax"],
				summary: "Daftar Tagihan Pajak (Tax Invoices)",
				description:
					"Mendapatkan daftar tagihan pajak untuk batch yang diikuti buyer setelah paket tiba di warehouse Indonesia.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "page",
						in: "query",
						required: false,
						schema: { type: "integer", default: 1 },
					},
					{
						name: "limit",
						in: "query",
						required: false,
						schema: { type: "integer", default: 20 },
					},
					{
						name: "status",
						in: "query",
						required: false,
						schema: { $ref: "#/components/schemas/TaxInvoiceStatus" },
					},
				],
				responses: {
					"200": { description: "Berhasil mengambil daftar tagihan pajak" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
				},
			},
		},
		"/api/v1/buyer/taxes/{id}": {
			get: {
				tags: ["Buyer - Tax"],
				summary: "Detail Tagihan Pajak",
				description:
					"Mengambil rincian tagihan pajak, rincian item, batas waktu, dan status pembayaran.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "ID tagihan pajak (Tax Invoice ID)",
					},
				],
				responses: {
					"200": { description: "Berhasil mengambil detail tagihan pajak" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
					"404": { description: "Tagihan pajak tidak ditemukan" },
				},
			},
		},
		"/api/v1/buyer/taxes/{id}/payments": {
			post: {
				tags: ["Buyer - Tax"],
				summary: "Unggah Bukti Bayar Tagihan Pajak",
				description:
					"Mengunggah file foto bukti transfer untuk tagihan pajak batch. Status otomatis berubah ke AWAITING_VERIFICATION.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "ID tagihan pajak (Tax Invoice ID)",
					},
				],
				requestBody: {
					required: true,
					content: {
						"multipart/form-data": {
							schema: {
								$ref: "#/components/schemas/UploadBuyerPaymentRequest",
							},
						},
					},
				},
				responses: {
					"201": { description: "Bukti bayar pajak berhasil diunggah" },
					"400": { description: "Validasi data gagal" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
					"404": { description: "Tagihan pajak tidak ditemukan" },
					"409": {
						description: "Sudah ada pembayaran pajak yang menunggu verifikasi",
					},
				},
			},
			get: {
				tags: ["Buyer - Tax"],
				summary: "Riwayat Pembayaran Tagihan Pajak",
				description:
					"Melihat riwayat pembayaran dan status persetujuan bukti bayar tagihan pajak tertentu.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "ID tagihan pajak",
					},
				],
				responses: {
					"200": { description: "Berhasil mengambil riwayat pembayaran pajak" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
					"404": { description: "Tagihan pajak tidak ditemukan" },
				},
			},
		},
		"/api/v1/buyer/me": {
			get: {
				tags: ["Buyer - Profile"],
				summary: "Profil Akun Buyer Saat Ini",
				description:
					"Mengambil data profil buyer termasuk status onboarding, nomor kontak, ID Line, dan alamat.",
				security: [{ cookieAuth: [] }],
				responses: {
					"200": { description: "Berhasil mengambil data profil buyer" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
				},
			},
			patch: {
				tags: ["Buyer - Profile"],
				summary: "Perbarui Data Profil Buyer",
				description:
					"Memperbarui nama, kontak WhatsApp, ID Line, dan alamat pengiriman milik buyer.",
				security: [{ cookieAuth: [] }],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/UpdateProfileRequest" },
						},
					},
				},
				responses: {
					"200": { description: "Profil berhasil diperbarui" },
					"400": { description: "Validasi data gagal" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
				},
			},
		},
		"/api/v1/buyer/me/onboarding": {
			patch: {
				tags: ["Buyer - Profile"],
				summary: "Selesaikan Alur Onboarding",
				description:
					"Menandai status bahwa buyer telah menyelesaikan tur/panduan onboarding aplikasi.",
				security: [{ cookieAuth: [] }],
				responses: {
					"200": { description: "Status onboarding berhasil disimpan" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
				},
			},
		},
		"/api/v1/buyer/tracking": {
			get: {
				tags: ["Buyer - Tracking"],
				summary: "Daftar Tracking Pengiriman Milik Buyer",
				description:
					"Mendapatkan daftar status pelacakan pengiriman logistik untuk batch yang dipesan oleh buyer (berdasarkan relasi invoice).",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "page",
						in: "query",
						required: false,
						schema: { type: "integer", default: 1 },
						description: "Halaman data",
					},
					{
						name: "limit",
						in: "query",
						required: false,
						schema: { type: "integer", default: 20 },
						description: "Jumlah data per halaman",
					},
				],
				responses: {
					"200": { description: "Berhasil mengambil daftar tracking buyer" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
				},
			},
		},
		"/api/v1/buyer/tracking/{id}": {
			get: {
				tags: ["Buyer - Tracking"],
				summary: "Detail Tracking Pengiriman",
				description:
					"Mengambil detail status pelacakan logistik batch spesifik milik buyer berdasarkan tracking ID.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "ID tracking",
					},
				],
				responses: {
					"200": { description: "Berhasil mengambil detail tracking" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
					"404": { description: "Tracking tidak ditemukan" },
				},
			},
		},
		"/api/v1/buyer/notifications": {
			get: {
				tags: ["Buyer - Notifications"],
				summary: "Daftar Notifikasi Buyer",
				description:
					"Mendapatkan riwayat notifikasi in-app untuk buyer yang sedang login. Mendukung filter status dibaca (is_read) dan paginasi.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "page",
						in: "query",
						required: false,
						schema: { type: "integer", default: 1 },
					},
					{
						name: "limit",
						in: "query",
						required: false,
						schema: { type: "integer", default: 20 },
					},
					{
						name: "is_read",
						in: "query",
						required: false,
						schema: { type: "string", enum: ["true", "false"] },
						description: "Filter berdasarkan status sudah dibaca atau belum",
					},
				],
				responses: {
					"200": { description: "Berhasil mengambil daftar notifikasi" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
				},
			},
		},
		"/api/v1/buyer/notifications/unread-count": {
			get: {
				tags: ["Buyer - Notifications"],
				summary: "Hitung Jumlah Notifikasi Belum Dibaca",
				description:
					"Mendapatkan jumlah (count) notifikasi yang belum dibaca (unread_count) oleh buyer.",
				security: [{ cookieAuth: [] }],
				responses: {
					"200": {
						description: "Berhasil mengambil jumlah notifikasi belum dibaca",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										success: { type: "boolean", example: true },
										data: {
											type: "object",
											properties: {
												unread_count: { type: "integer", example: 3 },
											},
										},
									},
								},
							},
						},
					},
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
				},
			},
		},
		"/api/v1/buyer/notifications/{id}/read": {
			patch: {
				tags: ["Buyer - Notifications"],
				summary: "Tandai Notifikasi Tertentu Sudah Dibaca",
				description:
					"Mengubah status isRead notifikasi menjadi true berdasarkan ID notifikasi.",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "ID notifikasi",
					},
				],
				responses: {
					"200": { description: "Notifikasi berhasil ditandai sudah dibaca" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
					"404": { description: "Notifikasi tidak ditemukan" },
				},
			},
		},
		"/api/v1/buyer/notifications/read-all": {
			patch: {
				tags: ["Buyer - Notifications"],
				summary: "Tandai Semua Notifikasi Sudah Dibaca",
				description:
					"Mengubah seluruh notifikasi buyer yang belum dibaca menjadi sudah dibaca sekaligus.",
				security: [{ cookieAuth: [] }],
				responses: {
					"200": { description: "Semua notifikasi berhasil ditandai sudah dibaca" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
				},
			},
		},
		"/api/v1/buyer/push/vapid-public-key": {
			get: {
				tags: ["Buyer - Push Notifications"],
				summary: "Ambil VAPID Public Key",
				description:
					"Mengambil VAPID Public Key untuk konfigurasi registrasi Service Worker Web Push pada browser pembeli (tanpa login).",
				responses: {
					"200": {
						description: "Berhasil mengambil VAPID Public Key",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										success: { type: "boolean", example: true },
										data: {
											type: "object",
											properties: {
												vapid_public_key: {
													type: "string",
													example: "BNcR...",
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
		"/api/v1/buyer/push/subscribe": {
			post: {
				tags: ["Buyer - Push Notifications"],
				summary: "Daftar Langganan Web Push (Subscribe)",
				description:
					"Mendaftarkan atau memperbarui token langganan Web Push Notification (endpoint, auth, p256dh) untuk perangkat buyer.",
				security: [{ cookieAuth: [] }],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/SubscribePushRequest" },
						},
					},
				},
				responses: {
					"201": { description: "Langganan push berhasil didaftarkan" },
					"400": { description: "Validasi payload gagal" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
				},
			},
			delete: {
				tags: ["Buyer - Push Notifications"],
				summary: "Hapus Langganan Web Push (Unsubscribe)",
				description:
					"Menghapus registrasi endpoint Web Push notification milik buyer yang sedang login.",
				security: [{ cookieAuth: [] }],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/UnsubscribePushRequest" },
						},
					},
				},
				responses: {
					"200": { description: "Langganan push berhasil dihapus" },
					"400": { description: "Validasi payload gagal" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
					"404": { description: "Push subscription tidak ditemukan" },
				},
			},
		},
		"/api/v1/buyer/history/batches": {
			get: {
				tags: ["Buyer - History"],
				summary: "Riwayat Batch yang Telah Lunas",
				description:
					"Mengambil daftar riwayat batch pesanan milik buyer yang status invoice-nya sudah lunas (PAID).",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "page",
						in: "query",
						required: false,
						schema: { type: "integer", default: 1 },
					},
					{
						name: "limit",
						in: "query",
						required: false,
						schema: { type: "integer", default: 20 },
					},
				],
				responses: {
					"200": { description: "Berhasil mengambil riwayat batch" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
				},
			},
		},
		"/api/v1/buyer/history/payments": {
			get: {
				tags: ["Buyer - History"],
				summary: "Riwayat Pembayaran yang Disetujui",
				description:
					"Mengambil daftar riwayat seluruh transaksi pembayaran milik buyer yang status verifikasinya telah disetujui (APPROVED).",
				security: [{ cookieAuth: [] }],
				parameters: [
					{
						name: "page",
						in: "query",
						required: false,
						schema: { type: "integer", default: 1 },
					},
					{
						name: "limit",
						in: "query",
						required: false,
						schema: { type: "integer", default: 20 },
					},
				],
				responses: {
					"200": { description: "Berhasil mengambil riwayat pembayaran" },
					"401": { description: "Unauthorized" },
					"403": { description: "Forbidden" },
				},
			},
		},
		"/api/v1/content/cs-contact": {
			get: {
				tags: ["Content"],
				summary: "Kontak Customer Service",
				description:
					"Mendapatkan tautan atau nomor kontak Customer Service resmi dari database setting tanpa perlu autentikasi.",
				responses: {
					"200": { description: "Berhasil mengambil kontak CS" },
				},
			},
		},
		"/api/v1/content/faq": {
			get: {
				tags: ["Content"],
				summary: "Daftar Pertanyaan Umum (FAQ)",
				description:
					"Mengambil daftar FAQ seputar cara order, pembayaran, tracking, tagihan pajak, dan checkout Shopee.",
				responses: {
					"200": { description: "Berhasil mengambil daftar FAQ" },
				},
			},
		},
	},
};
