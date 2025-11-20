import request from "supertest";
import { app } from "@app";
import { generateToken } from "@services/authService";
import { afterAllE2e, beforeAllE2e, TEST_USERS } from "@test/e2e/lifecycle";
import { UserType } from "@models/UserType";

describe("USERS API (e2e)", () => {
	let adminToken: string;
	let operatorToken: string;
	let viewerToken: string;

	beforeAll(async () => {
		await beforeAllE2e();

		adminToken = generateToken(TEST_USERS.admin);
		operatorToken = generateToken(TEST_USERS.operator);
		viewerToken = generateToken(TEST_USERS.viewer);
	});

	afterAll(async () => {
		await afterAllE2e();
	});

	// One test set for each endpoint

	describe("GET /users", () => {
		it("should get all users when user is admin", async () => {
			const res = await request(app)
				.get("/api/v1/users")
				.set("Authorization", `Bearer ${adminToken}`);

			expect(res.status).toBe(200);
			expect(res.body.length).toBe(3);

			const usernames = res.body.map((u) => u.username).sort();
			const types = res.body.map((u) => u.type).sort();
			expect(usernames).toEqual(["admin", "operator", "viewer"]);
			expect(types).toEqual(["admin", "operator", "viewer"]);
		});

		it("should return 403 when user is not admin", async () => {
			// Test with operator
			const resOperator = await request(app)
				.get("/api/v1/users")
				.set("Authorization", `Bearer ${operatorToken}`);

			expect(resOperator.status).toBe(403);
			expect(resOperator.body).toHaveProperty(
				"name",
				"InsufficientRightsError",
			);

			// Test with viewer
			const resViewer = await request(app)
				.get("/api/v1/users")
				.set("Authorization", `Bearer ${viewerToken}`);

			expect(resViewer.status).toBe(403);
			expect(resViewer.body).toHaveProperty("name", "InsufficientRightsError");
		});

		it("should return 401 when no token is provided", async () => {
			const res = await request(app).get("/api/v1/users");

			expect(res.status).toBe(401);
			expect(res.body).toHaveProperty("name", "Unauthorized");
		});
	});

	describe("POST /users", () => {
		const newUser = {
			username: "testuser",
			password: "testpassword",
			type: UserType.Viewer,
		};

		it("should create a new user when user is admin", async () => {
			const res = await request(app)
				.post("/api/v1/users")
				.set("Authorization", `Bearer ${adminToken}`)
				.send(newUser);

			expect(res.status).toBe(201);

			// Verify user was created by getting it
			const getRes = await request(app)
				.get(`/api/v1/users/${newUser.username}`)
				.set("Authorization", `Bearer ${adminToken}`);

			expect(getRes.status).toBe(200);
			expect(getRes.body.username).toBe(newUser.username);
			expect(getRes.body.type).toBe(newUser.type);
		});

		it("should return 400 when request body is invalid", async () => {
			const invalidUser = {
				username: "testuser2",
				// Missing password and type
			};

			const res = await request(app)
				.post("/api/v1/users")
				.set("Authorization", `Bearer ${adminToken}`)
				.send(invalidUser);

			expect(res.status).toBe(400);
			expect(res.body).toHaveProperty("name", "Bad Request");
		});

		it("should return 409 when username already exists", async () => {
			// Try to create user with existing username
			const res = await request(app)
				.post("/api/v1/users")
				.set("Authorization", `Bearer ${adminToken}`)
				.send(newUser); // Using the same user we created earlier

			expect(res.status).toBe(409);
			expect(res.body).toHaveProperty("name", "ConflictError");
		});

		it("should return 403 when user is not admin", async () => {
			const anotherUser = {
				username: "anotheruser",
				password: "anotherpassword",
				type: UserType.Viewer,
			};

			// Test with operator
			const resOperator = await request(app)
				.post("/api/v1/users")
				.set("Authorization", `Bearer ${operatorToken}`)
				.send(anotherUser);

			expect(resOperator.status).toBe(403);
			expect(resOperator.body).toHaveProperty(
				"name",
				"InsufficientRightsError",
			);

			// Test with viewer
			const resViewer = await request(app)
				.post("/api/v1/users")
				.set("Authorization", `Bearer ${viewerToken}`)
				.send(anotherUser);

			expect(resViewer.status).toBe(403);
			expect(resViewer.body).toHaveProperty("name", "InsufficientRightsError");
		});
	});

	describe("GET /users/:userName", () => {
		it("should get user by username when user is admin", async () => {
			const res = await request(app)
				.get("/api/v1/users/operator")
				.set("Authorization", `Bearer ${adminToken}`);

			expect(res.status).toBe(200);
			expect(res.body.username).toBe("operator");
			expect(res.body.type).toBe("operator");
		});

		it("should return 404 when user does not exist", async () => {
			const res = await request(app)
				.get("/api/v1/users/nonexistentuser")
				.set("Authorization", `Bearer ${adminToken}`);

			expect(res.status).toBe(404);
			expect(res.body).toHaveProperty("name", "NotFoundError");
		});

		it("should return 403 when user is not admin", async () => {
			// Test with operator
			const resOperator = await request(app)
				.get("/api/v1/users/viewer")
				.set("Authorization", `Bearer ${operatorToken}`);

			expect(resOperator.status).toBe(403);
			expect(resOperator.body).toHaveProperty(
				"name",
				"InsufficientRightsError",
			);

			// Test with viewer
			const resViewer = await request(app)
				.get("/api/v1/users/operator")
				.set("Authorization", `Bearer ${viewerToken}`);

			expect(resViewer.status).toBe(403);
			expect(resViewer.body).toHaveProperty("name", "InsufficientRightsError");
		});
	});

	describe("DELETE /users/:userName", () => {
		it("should delete user when user is admin", async () => {
			// First create a user to delete
			const userToDelete = {
				username: "usertodelete",
				password: "deletepassword",
				type: UserType.Viewer,
			};

			await request(app)
				.post("/api/v1/users")
				.set("Authorization", `Bearer ${adminToken}`)
				.send(userToDelete);

			// Then delete it
			const res = await request(app)
				.delete(`/api/v1/users/${userToDelete.username}`)
				.set("Authorization", `Bearer ${adminToken}`);

			expect(res.status).toBe(204);

			// Verify user was deleted
			const getRes = await request(app)
				.get(`/api/v1/users/${userToDelete.username}`)
				.set("Authorization", `Bearer ${adminToken}`);

			expect(getRes.status).toBe(404);
		});

		it("should return 404 when trying to delete non-existent user", async () => {
			const res = await request(app)
				.delete("/api/v1/users/nonexistentuser")
				.set("Authorization", `Bearer ${adminToken}`);

			expect(res.status).toBe(404);
			expect(res.body).toHaveProperty("name", "NotFoundError");
		});

		it("should return 403 when user is not admin", async () => {
			// Test with operator
			const resOperator = await request(app)
				.delete("/api/v1/users/viewer")
				.set("Authorization", `Bearer ${operatorToken}`);

			expect(resOperator.status).toBe(403);
			expect(resOperator.body).toHaveProperty(
				"name",
				"InsufficientRightsError",
			);

			// Test with viewer
			const resViewer = await request(app)
				.delete("/api/v1/users/operator")
				.set("Authorization", `Bearer ${viewerToken}`);

			expect(resViewer.status).toBe(403);
			expect(resViewer.body).toHaveProperty("name", "InsufficientRightsError");
		});
	});
});
