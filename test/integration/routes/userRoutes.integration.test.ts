import request from "supertest";
import { app } from "@app";
import * as authService from "@services/authService";
import * as userController from "@controllers/userController";
import { UserType } from "@models/UserType";
import type { User as UserDTO } from "@dto/User";
import { UnauthorizedError } from "@models/errors/UnauthorizedError";
import { InsufficientRightsError } from "@models/errors/InsufficientRightsError";
import { NotFoundError } from "@models/errors/NotFoundError";
import { ConflictError } from "@models/errors/ConflictError";

// Mocking the authentication to check for user rights.
jest.mock("@services/authService");

// Mocking the controller methods to simulate operations and to
// ensure parameters from the routes are passed correctly.
jest.mock("@controllers/userController");

describe("UserRoutes integration", () => {
	const token = "Bearer faketoken";

	// This runs after each test (even if nested in
	// describe blocks) to ensure a clean state
	afterEach(() => {
		jest.clearAllMocks();
	});

	// Get all users
	describe("Get all users", () => {
		it("get all users: 200 OK", async () => {
			const mockUsers: UserDTO[] = [
				{ username: "admin", type: UserType.Admin },
				{ username: "viewer", type: UserType.Viewer },
			];

			// processToken() returns Promise<void>, so we're mocking it to resolve.
			// The authenticateUser() function simply calls this function which, if
			// successful, won't throw an error. Hence, in order to simulate
			// sufficient rights, we mock it to simply resolve.
			(authService.processToken as jest.Mock).mockResolvedValue(undefined);

			// We don't want to actually call the controller (which would call the
			// UserRepository), so we mock the getAllUsers() method to return our
			// mockUsers array.
			(userController.getAllUsers as jest.Mock).mockResolvedValue(mockUsers);

			const response = await request(app)
				.get("/api/v1/users")
				.set("Authorization", token);

			expect(response.status).toBe(200);
			expect(response.body).toEqual(mockUsers);
			expect(authService.processToken).toHaveBeenCalledWith(token, [
				UserType.Admin,
			]);
			expect(userController.getAllUsers).toHaveBeenCalled();
		});

		// We handle errors that could occur during the authentication phase

		it("get all users: 401 UnauthorizedError", async () => {
			(authService.processToken as jest.Mock).mockImplementation(() => {
				throw new UnauthorizedError("Unauthorized: No token provided");
			});

			const response = await request(app)
				.get("/api/v1/users")
				.set("Authorization", "Bearer invalid");

			expect(response.status).toBe(401);
			expect(response.body.message).toMatch(/Unauthorized/);
		});

		it("get all users: 403 InsufficientRightsError", async () => {
			(authService.processToken as jest.Mock).mockImplementation(() => {
				throw new InsufficientRightsError("Forbidden: Insufficient rights");
			});

			const response = await request(app)
				.get("/api/v1/users")
				.set("Authorization", token);

			expect(response.status).toBe(403);
			expect(response.body.message).toMatch(/Insufficient rights/);
		});

		it("get all users: 500 Internal Server Error", async () => {
			(authService.processToken as jest.Mock).mockResolvedValue(undefined);
			(userController.getAllUsers as jest.Mock).mockImplementation(() => {
				throw new Error("Unexpected error");
			});

			const response = await request(app)
				.get("/api/v1/users")
				.set("Authorization", token);

			expect(response.status).toBe(500);
			expect(response.body.message).toMatch(/Unexpected error/);
		});
	});

	// Get single user
	describe("Get single user", () => {
		it("get user by username: 200 OK", async () => {
			const mockUser: UserDTO = { username: "admin", type: UserType.Admin };

			(authService.processToken as jest.Mock).mockResolvedValue(undefined);
			(userController.getUser as jest.Mock).mockResolvedValue(mockUser);

			const response = await request(app)
				.get("/api/v1/users/admin")
				.set("Authorization", token);

			expect(response.status).toBe(200);
			expect(response.body).toEqual(mockUser);
			expect(authService.processToken).toHaveBeenCalledWith(token, [
				UserType.Admin,
			]);
			expect(userController.getUser).toHaveBeenCalledWith("admin");
		});

		it("get user by username: 404 ResourceNotFoundError", async () => {
			(authService.processToken as jest.Mock).mockResolvedValue(undefined);
			(userController.getUser as jest.Mock).mockImplementation(() => {
				throw new NotFoundError("User not found");
			});

			const response = await request(app)
				.get("/api/v1/users/nonexistent")
				.set("Authorization", token);

			// check if the response status is 404 Not Found against a user that does not exist
			expect(response.status).toBe(404);
			expect(response.body.message).toMatch(/User not found/);
		});

		it("get user by username: 401 UnauthorizedError", async () => {
			(authService.processToken as jest.Mock).mockImplementation(() => {
				throw new UnauthorizedError("Unauthorized: No token provided");
			});

			const response = await request(app)
				.get("/api/v1/users/admin")
				.set("Authorization", "Bearer invalid");

			// check if the response status is 401 Unauthorized against a user without a valid token
			expect(response.status).toBe(401);
			expect(response.body.message).toMatch(/Unauthorized/);
		});

		it("get user by username: 403 InsufficientRightsError", async () => {
			(authService.processToken as jest.Mock).mockImplementation(() => {
				throw new InsufficientRightsError("Forbidden: Insufficient rights");
			});

			const response = await request(app)
				.get("/api/v1/users/admin")
				.set("Authorization", token);

			// check if the response status is 403 Forbidden against a user without admin rights
			expect(response.status).toBe(403);
			expect(response.body.message).toMatch(/Insufficient rights/);
		});
	});

	// Create user
	describe("Create user", () => {
		// Create user tests
		it("create user: 201 Created", async () => {
			const newUser: UserDTO = {
				username: "newuser",
				type: UserType.Viewer,
				password: "password123",
			};
			const createdUser: UserDTO = {
				username: "newuser",
				type: UserType.Viewer,
			};

			(authService.processToken as jest.Mock).mockResolvedValue(undefined);
			(userController.createUser as jest.Mock).mockResolvedValue(createdUser);

			const response = await request(app)
				.post("/api/v1/users")
				.set("Authorization", token)
				.send(newUser);

			expect(response.status).toBe(201);
			expect(response.body).toBeUndefined;
			expect(authService.processToken).toHaveBeenCalledWith(token, [
				UserType.Admin,
			]);
			expect(userController.createUser).toHaveBeenCalledWith(newUser);
		});

		it("create user: 400 Bad Request", async () => {
			const invalidUser = { username: "", type: "invalid" };

			(authService.processToken as jest.Mock).mockResolvedValue(undefined);
			(userController.createUser as jest.Mock).mockImplementation(() => {
				throw new Error("Invalid user data");
			});

			const response = await request(app)
				.post("/api/v1/users")
				.set("Authorization", token)
				.send(invalidUser);

			// check if the response status is 400 Bad Request against invalid user data
			expect(response.status).toBe(400);
			expect(response.body.name).toBe("Bad Request");
		});

		it("create user: 401 UnauthorizedError", async () => {
			(authService.processToken as jest.Mock).mockImplementation(() => {
				throw new UnauthorizedError("Unauthorized: No token provided");
			});

			const response = await request(app)
				.post("/api/v1/users")
				.set("Authorization", "Bearer invalid")
				.send({
					username: "newuser",
					password: "password123",
					type: UserType.Viewer,
				});

			expect(response.status).toBe(401);
			expect(response.body.message).toMatch(/Unauthorized/);
		});

		it("create user: 403 InsufficientRightsError", async () => {
			(authService.processToken as jest.Mock).mockImplementation(() => {
				throw new InsufficientRightsError("Forbidden: Insufficient rights");
			});

			const response = await request(app)
				.post("/api/v1/users")
				.set("Authorization", token)
				.send({
					username: "newuser",
					password: "password123",
					type: UserType.Viewer,
				});

			expect(response.status).toBe(403);
			expect(response.body.message).toMatch(/Insufficient rights/);
		});

		it("create user: 409 ConflictError", async () => {
			(authService.processToken as jest.Mock).mockResolvedValue(undefined);
			(userController.createUser as jest.Mock).mockImplementation(() => {
				throw new ConflictError("User already exists");
			});

			const response = await request(app)
				.post("/api/v1/users")
				.set("Authorization", token)
				.send({
					username: "existinguser",
					password: "password123",
					type: UserType.Viewer,
				});

			expect(response.status).toBe(409);
			expect(response.body.message).toMatch(/User already exists/);
		});
	});

	// Delete user
	describe("Delete user", () => {
		// Delete user tests
		it("delete user: 204 No Content", async () => {
			(authService.processToken as jest.Mock).mockResolvedValue(undefined);
			(userController.deleteUser as jest.Mock).mockResolvedValue(undefined);

			const response = await request(app)
				.delete("/api/v1/users/viewer")
				.set("Authorization", token);

			expect(response.status).toBe(204);
			expect(authService.processToken).toHaveBeenCalledWith(token, [
				UserType.Admin,
			]);
			expect(userController.deleteUser).toHaveBeenCalledWith("viewer");
		});

		it("delete user: 401 UnauthorizedError", async () => {
			(authService.processToken as jest.Mock).mockImplementation(() => {
				throw new UnauthorizedError("Unauthorized: No token provided");
			});

			const response = await request(app)
				.delete("/api/v1/users/viewer")
				.set("Authorization", "Bearer invalid");

			expect(response.status).toBe(401);
			expect(response.body.message).toMatch(/Unauthorized/);
		});

		it("delete user: 403 InsufficientRightsError", async () => {
			(authService.processToken as jest.Mock).mockImplementation(() => {
				throw new InsufficientRightsError("Forbidden: Insufficient rights");
			});

			const response = await request(app)
				.delete("/api/v1/users/viewer")
				.set("Authorization", token);

			expect(response.status).toBe(403);
			expect(response.body.message).toMatch(/Insufficient rights/);
		});

		it("delete user: 404 NotFoundError", async () => {
			(authService.processToken as jest.Mock).mockResolvedValue(undefined);
			(userController.deleteUser as jest.Mock).mockImplementation(() => {
				throw new NotFoundError("User not found");
			});

			const response = await request(app)
				.delete("/api/v1/users/nonexistent")
				.set("Authorization", token);

			expect(response.status).toBe(404);
			expect(response.body.message).toMatch(/User not found/);
		});
	});
});
