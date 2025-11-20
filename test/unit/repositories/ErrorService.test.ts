import { createAppError } from "@services/errorService";
import { AppError } from "@errors/AppError";
import { logError } from "@services/loggingService";
import { createErrorDTO } from "@services/mapperService";

jest.mock("@services/loggingService");
jest.mock("@services/mapperService");

const mockLogError = logError as jest.MockedFunction<typeof logError>;
const mockCreateErrorDTO = createErrorDTO as jest.MockedFunction<typeof createErrorDTO>;

describe("createAppError", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockCreateErrorDTO.mockImplementation((status, message, name) => ({
      code: 1,
      status,
      message,
      name,
      timestamp: new Date().toISOString()
    }));
  });

    describe("Internal Server Error cases", () => {
        it("should handle error without message and create internal server error", () => {

        const errorWithoutMessage = new Error();
        delete (errorWithoutMessage as any).message;

        const result = createAppError(errorWithoutMessage);

        expect(mockCreateErrorDTO).toHaveBeenCalledWith(
            500,
            "Internal Server Error",
            "InternalServerError"
        );
        expect(result.message).toBe("Internal Server Error");
        expect(result.name).toBe("InternalServerError");
        });
    });

    describe("No stacktrace available cases", () => {
        it("should log 'No stacktrace available' when error has no stack property", () => {

        const errorWithoutStack = { message: "Test error" };

        createAppError(errorWithoutStack);

        expect(mockLogError).toHaveBeenCalledTimes(2);
        expect(mockLogError).toHaveBeenNthCalledWith(1, errorWithoutStack);
        expect(mockLogError).toHaveBeenNthCalledWith(
            2,
            "Error: Test error\nStacktrace:\nNo stacktrace available"
        );
        });
    });
});