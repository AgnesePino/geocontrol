import { generateToken, processToken } from "@services/authService";
import { UserRepository } from "@repositories/UserRepository";
import { UnauthorizedError } from "@models/errors/UnauthorizedError";
import { UserType } from "@models/UserType";
import { NotFoundError } from "@models/errors/NotFoundError";

// Mock implementation
jest.mock("@repositories/UserRepository");

describe("processToken - user not found", () => {
    const mockUser = {
        username: "ghostUser",
        type: UserType.Admin,
        email: "ghost@example.com"
    };

	const token = `Bearer ${generateToken(mockUser)}`;

  	it("should throw UnauthorizedError if user is not found in repository", async () => {
    	
    	(UserRepository.prototype.getUserByUsername as jest.Mock).mockRejectedValueOnce(new NotFoundError("User not found"));

		const res = expect(processToken(token))

    	await res.rejects.toThrow(UnauthorizedError);

		await res.rejects.toThrow("Unauthorized: user ghostUser not found");
  	});

	it("should throw UnauthorizedError if no authHeader is provided", async () => {
    	await expect(processToken(undefined)).rejects.toThrow(UnauthorizedError);
    	await expect(processToken(undefined)).rejects.toThrow("Unauthorized: No token provided");
  	});

  	it("should throw UnauthorizedError if token format is invalid", async () => {
    	const invalidAuthHeaders = [
      		"InvalidFormat",
      		"Token abc.def.ghi",   
      		"BearerTwoTokens together"
    	];

    	for (const header of invalidAuthHeaders) {
      		await expect(processToken(header)).rejects.toThrow(UnauthorizedError);
      		await expect(processToken(header)).rejects.toThrow("Unauthorized: Invalid token format");
    	}
  	});


});