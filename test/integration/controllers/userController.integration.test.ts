import * as userController from "@controllers/userController";
import type { UserDAO } from "@dao/UserDAO";
import { UserType } from "@models/UserType";
import { UserRepository } from "@repositories/UserRepository";

// Mocking the UserR epository to simulate database interactions
jest.mock("@repositories/UserRepository");

describe("UserController integration", () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it("getUser: mapperService integration", async () => {
		const fakeUserDAO: UserDAO = {
			username: "testuser",
			password: "secret",
			type: UserType.Operator,
		};

		const expectedDTO = {
			username: fakeUserDAO.username,
			type: fakeUserDAO.type,
		};

		// Mocking the UserRepository to return the fake user when the
		// userController calls getUser method (which internally calls getUserByUsername)
		(UserRepository as jest.Mock).mockImplementation(() => ({
			getUserByUsername: jest.fn().mockResolvedValue(fakeUserDAO),
		}));

		const result = await userController.getUser("testuser");

		// The controller should return a DTO from the UserDAO with the
		// username and type, but not the password.
		expect(result).toEqual({
			username: expectedDTO.username,
			type: expectedDTO.type,
		});
		expect(result).not.toHaveProperty("password");
	});

	it("getAllUsers: mapperService integration", async () => {
		const fakeUserDAOs: UserDAO[] = [
			{
				username: "user1",
				password: "pass1",
				type: UserType.Operator,
			},
			{
				username: "user2",
				password: "pass2",
				type: UserType.Admin,
			},
			{
				username: "user3",
				password: "pass3",
				type: UserType.Viewer,
			},
		];

		const expectedDTOs = fakeUserDAOs.map((user) => ({
			username: user.username,
			type: user.type,
		}));

		// Mocking the UserRepository to return the fake users when the
		// userController calls getAllUsers method (which internally calls getAllUsers)
		(UserRepository as jest.Mock).mockImplementation(() => ({
			// Create a mock implementation of getAllUsers that
			// returns the fakeUserDAOs array (simulating a db response)
			getAllUsers: jest.fn().mockResolvedValue(fakeUserDAOs),
		}));

		const result = await userController.getAllUsers();

		// The controller should return an array of DTOs from the UserDAOs with the
		// usernames and types, but not the passwords.
		expect(result).toEqual(expectedDTOs);
		expect(result).not.toContainEqual(
			expect.objectContaining({ password: expect.any(String) }),
		);
	});

	it("createUser: mapperService integration", async () => {
		const newUserDTO = {
			username: "newuser",
			password: "newpassword",
			type: UserType.Operator,
		};

		// The createUser Repository method should not return anything,
		// so we mock it to resolve to undefined.
		const mockCreateUser = jest.fn().mockResolvedValue(undefined);

		// Mocking the UserRepository to simulate user creation
		(UserRepository as jest.Mock).mockImplementation(() => ({
			createUser: mockCreateUser,
		}));

		await userController.createUser(newUserDTO);

		// Verify that the UserRepository's createUser method was called with the correct parameters
		expect(mockCreateUser).toHaveBeenCalledWith(
			newUserDTO.username,
			newUserDTO.password,
			newUserDTO.type,
		);
	});

	it("deleteUser: mapperService integration", async () => {
		const usernameToDelete = "userToDelete";

		// Just like createUser, the deleteUser Repository method
		// should not return anything, so we mock it to resolve to undefined.
		const mockDeleteUser = jest.fn().mockResolvedValue(undefined);

		// Mocking the UserRepository to simulate user deletion
		(UserRepository as jest.Mock).mockImplementation(() => ({
			deleteUser: mockDeleteUser,
		}));

		await userController.deleteUser(usernameToDelete);

		// Verify that the UserRepository's deleteUser method was called with the correct username
		expect(mockDeleteUser).toHaveBeenCalledWith(usernameToDelete);
	});
});
