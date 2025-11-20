import * as authController from "@controllers/authController";
import { UserDAO } from "@dao/UserDAO";
import { UserType } from "@models/UserType";
import { UserRepository } from "@repositories/UserRepository";
import { UnauthorizedError } from "@errors/UnauthorizedError";

jest.mock("@repositories/UserRepository");

describe("AuthController integration", () => {
  const fakeUserDAO: UserDAO = {
    username: "testuser",
    password: "secret",
    type: UserType.Operator
  };

  const validUserDTO = {
    username: "testuser",
    password: "secret",
    type: UserType.Operator
  };

  const invalidUserDTO = {
    username: "testuser",
    password: "wrongpassword",
    type: UserType.Operator
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a valid token for correct credentials", async () => {
    (UserRepository as jest.Mock).mockImplementation(() => ({
      getUserByUsername: jest.fn().mockResolvedValue(fakeUserDAO)
    }));

    const result = await authController.getToken(validUserDTO);

    expect(result).toHaveProperty("token");
    expect(typeof result.token).toBe("string");
  });

  it("should throw UnauthorizedError if password is invalid", async () => {
    (UserRepository as jest.Mock).mockImplementation(() => ({
      getUserByUsername: jest.fn().mockResolvedValue(fakeUserDAO)
    }));

    await expect(authController.getToken(invalidUserDTO)).rejects.toThrow(UnauthorizedError);
  });
});
