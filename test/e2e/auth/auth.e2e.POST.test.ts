import request from "supertest";
import { app } from "@app";
import { beforeAllE2e, afterAllE2e, TEST_USERS } from "@test/e2e/lifecycle";
import { UserRepository } from "@repositories/UserRepository";

describe("POST /api/v1/auth (e2e)", () => {
  beforeAll(async () => {
    await beforeAllE2e();
  });

  afterAll(async () => {
    await afterAllE2e();
  });

  it("should authenticate and return a token for valid credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth")
      .send({
        username: TEST_USERS.admin.username,
        password: TEST_USERS.admin.password
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(typeof res.body.token).toBe("string");
  });

  it("should return 400 if username is missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth")
      .send({ password: TEST_USERS.admin.password });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("code", 400);
    expect(["BadRequest", "Bad Request"]).toContain(res.body.name);
  });

  it("should return 401 if password is missing", async () => {
    const res = await request(app)
        .post("/api/v1/auth")
        .send({ username: TEST_USERS.admin.username });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("code", 401);
    expect(res.body).toHaveProperty("name", "UnauthorizedError");
  });


  it("should return 401 if password is invalid", async () => {
    const res = await request(app)
      .post("/api/v1/auth")
      .send({ username: TEST_USERS.admin.username, password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("code", 401);
    expect(res.body).toHaveProperty("name", "UnauthorizedError");
  });

  it("should return 404 if user is not found", async () => {
    const res = await request(app)
      .post("/api/v1/auth")
      .send({ username: "notfounduser", password: "irrelevant" });

    expect([404]).toContain(res.status);
      expect(res.body).toHaveProperty("code", 404);
      expect(res.body).toHaveProperty("name", "NotFoundError");
  });

  it("should return 500 if internal server error occurs during auth", async () => {
    const spy = jest
        .spyOn(UserRepository.prototype, "getUserByUsername")
        .mockRejectedValueOnce(new Error("Simulated DB error"));

    const res = await request(app)
        .post("/api/v1/auth")
        .send({ username: "whatever", password: "whatever" });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("code", 500);
    expect(res.body).toHaveProperty("name", "InternalServerError");

    spy.mockRestore();
  });

});
