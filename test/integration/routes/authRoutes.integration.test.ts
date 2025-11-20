import { app } from "../../../src/app";
import request from "supertest";
import { UserRepository } from "@repositories/UserRepository";
import { UserType } from "@models/UserType";
  import { NotFoundError } from "@errors/NotFoundError";

jest.mock("@repositories/UserRepository");

describe("POST /api/v1/auth", () => {
  const validUser = {
    username: "testuser",
    password: "FR90!5g@+ni",
    type: UserType.Operator
  };
  const repoMock = UserRepository as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should authenticate and return a token for valid credentials", async () => {
    repoMock.mockImplementation(() => ({
      getUserByUsername: jest.fn().mockResolvedValue(validUser)
    }));

    const res = await request(app)
      .post("/api/v1/auth")
      .send({ username: "testuser", password: "FR90!5g@+ni" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(typeof res.body.token).toBe("string");
  });

  it("should return 400 if username is missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth")
      .send({ password: "FR90!5g@+ni" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("code", 400);
    expect(["BadRequest", "Bad Request"]).toContain(res.body.name);
  });

  it("should return 401 if password is missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth")
      .send({ username: "testuser" });

    expect([401]).toContain(res.status);
      expect(res.body).toHaveProperty("code", 401);
      expect(res.body).toHaveProperty("name", "UnauthorizedError");
  });

  it("should return 401 if password is invalid", async () => {
    repoMock.mockImplementation(() => ({
      getUserByUsername: jest.fn().mockResolvedValue(validUser)
    }));

    const res = await request(app)
      .post("/api/v1/auth")
      .send({ username: "testuser", password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("code", 401);
    expect(res.body).toHaveProperty("name", "UnauthorizedError");
  });

  it("should return 404 if user is not found", async () => {
    repoMock.mockImplementation(() => ({
        getUserByUsername: jest.fn().mockRejectedValue(
        new NotFoundError("User with username 'notfound' not found")
        )
    }));

    const res = await request(app)
        .post("/api/v1/auth")
        .send({ username: "notfound", password: "irrelevant" });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("code", 404);
    expect(res.body).toHaveProperty("name", "NotFoundError");
    });

  it("should return 500 if there is an unexpected error", async () => {
    repoMock.mockImplementation(() => ({
      getUserByUsername: jest.fn().mockRejectedValue(new Error("DB crashed"))
    }));

    const res = await request(app)
      .post("/api/v1/auth")
      .send({ username: "testuser", password: "FR90!5g@+ni" });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("code", 500);
    expect(["InternalServerError", "Internal Server Error"]).toContain(res.body.name);
  });
});
