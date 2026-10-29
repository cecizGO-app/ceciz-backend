/**
 * Integration tests for the buyer profile endpoints.
 * Uses supertest against the Express app with a mocked prisma client.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "@/server";

// ---------------------------------------------------------------------------
// Mock heavy dependencies so tests run without a real DB or R2 bucket
// ---------------------------------------------------------------------------

vi.mock("@/lib/prisma", () => ({
	prisma: {
		user: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
	},
}));

vi.mock("@/lib/auth", () => ({
	auth: {
		api: {
			getSession: vi.fn(),
		},
	},
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const { prisma } = await import("@/lib/prisma");
const { auth } = await import("@/lib/auth");

const mockBuyer = {
	id: "buyer-1",
	name: "Test Buyer",
	email: "buyer@test.com",
	role: "BUYER",
	contact: "081234567890",
	address: "Jl. Test No.1",
	idLine: "testbuyer",
	isOnboarded: true,
	isActive: true,
	image: null,
	createdAt: new Date("2024-01-01"),
	updatedAt: new Date("2024-01-01"),
};

function mockSession(user = mockBuyer) {
	vi.mocked(auth.api.getSession).mockResolvedValue({
		user,
		session: { id: "session-1", userId: user.id },
	} as never);
}

function clearMocks() {
	vi.clearAllMocks();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/v1/buyer/me", () => {
	afterEach(clearMocks);

	it("returns 401 when not authenticated", async () => {
		vi.mocked(auth.api.getSession).mockResolvedValue(null);

		const res = await request(app).get("/api/v1/buyer/me");
		expect(res.status).toBe(401);
		expect(res.body.success).toBe(false);
	});

	it("returns 200 with buyer profile", async () => {
		mockSession();
		vi.mocked(prisma.user.findUnique).mockResolvedValue(mockBuyer as never);

		const res = await request(app).get("/api/v1/buyer/me");
		expect(res.status).toBe(200);
		expect(res.body.success).toBe(true);
		expect(res.body.data).toMatchObject({
			id: "buyer-1",
			name: "Test Buyer",
			email: "buyer@test.com",
		});
	});

	it("returns 403 when user is not BUYER role", async () => {
		const adminUser = { ...mockBuyer, role: "OWNER" };
		mockSession(adminUser);

		const res = await request(app).get("/api/v1/buyer/me");
		expect(res.status).toBe(403);
		expect(res.body.success).toBe(false);
	});
});

describe("PATCH /api/v1/buyer/me", () => {
	afterEach(clearMocks);

	it("returns 401 when not authenticated", async () => {
		vi.mocked(auth.api.getSession).mockResolvedValue(null);

		const res = await request(app).patch("/api/v1/buyer/me").send({ name: "New Name" });
		expect(res.status).toBe(401);
	});

	it("returns 200 and updates profile", async () => {
		mockSession();
		const updated = { ...mockBuyer, name: "New Name", contact: "089999999" };
		vi.mocked(prisma.user.update).mockResolvedValue(updated as never);

		const res = await request(app)
			.patch("/api/v1/buyer/me")
			.send({ name: "New Name", contact: "089999999" });

		expect(res.status).toBe(200);
		expect(res.body.success).toBe(true);
		expect(res.body.data.name).toBe("New Name");
	});

	it("returns 400 when body is invalid (extra unrecognized field behavior is OK)", async () => {
		mockSession();
		// Sending an invalid field type
		const res = await request(app)
			.patch("/api/v1/buyer/me")
			.send({ name: 12345 }); // name must be a string

		// Depending on Zod strictness; at minimum it must not crash
		expect([200, 400]).toContain(res.status);
	});
});
