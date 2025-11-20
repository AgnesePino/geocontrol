import request from "supertest";
import { app } from "@app";
import * as authService from "@services/authService";
import * as networkController from "@controllers/networkController";
import { UserType } from "@models/UserType";
import { Network as NetworkDTO } from "@dto/Network";
import { UnauthorizedError } from "@models/errors/UnauthorizedError";
import { InsufficientRightsError } from "@models/errors/InsufficientRightsError";
import { ConflictError } from "@models/errors/ConflictError";
import { NotFoundError } from "@models/errors/NotFoundError";
import AppError from "@models/errors/AppError";

jest.mock("@services/authService");
jest.mock("@controllers/networkController");

describe("NetworkRoutes integration", () => {
  const token = "Bearer faketoken";

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/v1/networks", () => {
    const mockResponse: any[] = [
      {
        code: "NET01",
        name: "Alp Monitor",
        description: "Alpine Weather Monitoring Network",
        gateways: [
          {
            macAddress: "94:3F:BE:4C:4A:79",
            name: "GW01",
            description: "on-field aggregation node",
            sensors: [
              {
                macAddress: "71:B1:CE:01:C6:A9",
                name: "TH01",
                description: "External thermometer",
                variable: "temperature",
                unit: "C"
              }
            ]
          }
        ]
      }
    ];

    it("should return 200 with the full network list including gateways and sensors", async () => {
        (authService.processToken as jest.Mock).mockResolvedValue(undefined);
        (networkController.getAllNetworks as jest.Mock).mockResolvedValue(mockResponse);

        const response = await request(app)
          .get("/api/v1/networks")
          .set("Authorization", token);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockResponse);
    });

    it("should return 401 if no token is provided", async () => {
      const response = await request(app).get("/api/v1/networks");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        code: 401,
        name: "Unauthorized",
        message: "Authorization header required"
      });
    });

    it("should return 401 if token is invalid", async () => {
      (authService.processToken as jest.Mock).mockImplementation(() => {
        throw new UnauthorizedError("Unauthorized: Invalid token format");
      });

      const response = await request(app)
        .get("/api/v1/networks")
        .set("Authorization", "Bearer invalid");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        code: 401,
        name: "UnauthorizedError",
        message: "Unauthorized: Invalid token format"
      });
    });

    it("should return 500 if controller throws unexpected error", async () => {
      (authService.processToken as jest.Mock).mockResolvedValue(undefined);
      (networkController.getAllNetworks as jest.Mock).mockImplementation(() => {
        throw new Error("Database failure");
      });

      const response = await request(app)
        .get("/api/v1/networks")
        .set("Authorization", token);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        code: 500,
        name: "InternalServerError",
        message: "Database failure"
      });
    });
  });

  describe("POST /api/v1/networks", () => {
    const validPayload = {
      code: "NET03",
      name: "TestNet",
      description: "Test desc",
      gateways: undefined 
    };

    it("should return 201 if network is created successfully", async () => {
      (authService.processToken as jest.Mock).mockResolvedValue(undefined); 
      (networkController.createNetwork as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/v1/networks")
        .set("Authorization", token)
        .send(validPayload);

      expect(response.status).toBe(201);
      expect(authService.processToken).toHaveBeenCalledWith(token, [UserType.Admin, UserType.Operator]);
      expect(networkController.createNetwork).toHaveBeenCalledWith(validPayload);
    });

    it("should return 400 if payload is missing required fields", async () => {
      const invalidPayload = { name: "Missing code field" };

      (authService.processToken as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post("/api/v1/networks")
        .set("Authorization", token)
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
          code: 400,
          message: expect.stringMatching(/must have required property/i)
        });

      });

    it("should return 401 if token is invalid", async () => {
      const payload = { code: "NET04", name: "Unauthorized", description: "..." };

      (authService.processToken as jest.Mock).mockImplementation(() => {
        throw new UnauthorizedError("Unauthorized: Invalid token");
      });

      const response = await request(app)
        .post("/api/v1/networks")
        .set("Authorization", "Bearer invalid")
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        code: 401,
        name: "UnauthorizedError",
        message: "Unauthorized: Invalid token"
      });
    });

    it("should return 403 if user lacks Admin or Operator role", async () => {
      const payload = { code: "NET05", name: "Insufficient", description: "..." };

      (authService.processToken as jest.Mock).mockImplementation(() => {
        throw new InsufficientRightsError("Forbidden: Insufficient rights");
      });

      const response = await request(app)
        .post("/api/v1/networks")
        .set("Authorization", token)
        .send(payload);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        code: 403,
        name: "InsufficientRightsError",
        message: "Forbidden: Insufficient rights"
      });
    });

    it("should return 409 if network code already exists", async () => {
      const payload = {
        code: "NET01",
        name: "Duplicate",
        description: "...",
        gateways: undefined
      };

      (authService.processToken as jest.Mock).mockResolvedValue(undefined);
      (networkController.createNetwork as jest.Mock).mockImplementation(() => {
        throw new ConflictError("Entity with code NET01 already exists");
      });

      const response = await request(app)
        .post("/api/v1/networks")
        .set("Authorization", token)
        .send(payload);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        code: 409,
        name: "ConflictError",
        message: "Entity with code NET01 already exists"
      });
    });

    it("should return 500 if controller throws unexpected error", async () => {
      (authService.processToken as jest.Mock).mockResolvedValue(undefined);
      (networkController.createNetwork as jest.Mock).mockImplementation(() => {
        throw new Error("Database failure");
      });

      const response = await request(app)
        .post("/api/v1/networks")
        .set("Authorization", token)
        .send(validPayload);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        code: 500,
        name: "InternalServerError",
        message: "Database failure"
      });
    });
  });

  describe("GET /api/v1/networks/:networkCode", () => {
    const sampleNetwork: NetworkDTO = {
      code: "NET01",
      name: "Alp Monitor",
      description: "Alpine Weather Monitoring Network",
      gateways: [
        {
          macAddress: "94:3F:BE:4C:4A:79",
          name: "GW01",
          description: "on-field aggregation node",
          sensors: [
            {
              macAddress: "71:B1:CE:01:C6:A9",
              name: "TH01",
              description: "External thermometer",
              variable: "temperature",
              unit: "C"
            }
          ]
        }
      ]
    };


    it("should return 200 with the specific network", async () => {
      (authService.processToken as jest.Mock).mockResolvedValue(undefined);
      (networkController.getNetworkByCode as jest.Mock).mockResolvedValue(sampleNetwork);

      const response = await request(app)
        .get("/api/v1/networks/NET01")
        .set("Authorization", token);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(sampleNetwork);
      expect(networkController.getNetworkByCode).toHaveBeenCalledWith("NET01");
    });

    it("should return 401 if token is missing", async () => {
      const response = await request(app).get("/api/v1/networks/NET01");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        code: 401,
        name: "Unauthorized",
        message: "Authorization header required"
      });
    });

    it("should return 401 if token is invalid", async () => {
      (authService.processToken as jest.Mock).mockImplementation(() => {
        throw new UnauthorizedError("Unauthorized: Invalid token format");
      });

      const response = await request(app)
        .get("/api/v1/networks/NET01")
        .set("Authorization", "Bearer invalid");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        code: 401,
        name: "UnauthorizedError",
        message: "Unauthorized: Invalid token format"
      });
    });

    it("should return 404 if network does not exist", async () => {
      (authService.processToken as jest.Mock).mockResolvedValue(undefined);
      (networkController.getNetworkByCode as jest.Mock).mockImplementation(() => {
        throw new NotFoundError("Entity not found");
      });

      const response = await request(app)
        .get("/api/v1/networks/NOT_EXIST")
        .set("Authorization", token);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        code: 404,
        name: "NotFoundError",
        message: "Entity not found"
      });
    });

    it("should return 500 if controller throws unexpected error", async () => {
      (authService.processToken as jest.Mock).mockResolvedValue(undefined);
      (networkController.getNetworkByCode as jest.Mock).mockImplementation(() => {
        throw new Error("Unexpected failure");
      });

      const response = await request(app)
        .get("/api/v1/networks/NET01")
        .set("Authorization", token);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        code: 500,
        name: "InternalServerError",
        message: "Unexpected failure"
      });
    });
  });

  describe("PATCH /api/v1/networks/:networkCode", () => {
    const updatePayload = {
      code: "NET01",
      name: "Updated",
      description: "Updated desc",
      gateways: undefined
    };

    it("should return 204 on successful update", async () => {
      (authService.processToken as jest.Mock).mockResolvedValue(undefined);
      (networkController.updateNetwork as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .patch("/api/v1/networks/NET01")
        .set("Authorization", token)
        .send(updatePayload);

      expect(res.status).toBe(204);
      expect(networkController.updateNetwork).toHaveBeenCalledWith("NET01", updatePayload);
    });

    it("should return 400 if request body is invalid", async () => {
      const invalidPayload = {
        code: 123, 
        name: "Invalid"
      };

      (authService.processToken as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .patch("/api/v1/networks/NET01")
        .set("Authorization", token)
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        code: 400,
        message: expect.stringMatching(/code must be string/i)
      });
    });

    it("should return 401 if token is invalid", async () => {
      (authService.processToken as jest.Mock).mockImplementation(() => {
        throw new UnauthorizedError("Unauthorized: Invalid token format");
      });

      const res = await request(app)
        .patch("/api/v1/networks/NET01")
        .set("Authorization", "Bearer invalid")
        .send(updatePayload);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        code: 401,
        name: "UnauthorizedError",
        message: "Unauthorized: Invalid token format"
      });
    });

    it("should return 403 if user has insufficient rights", async () => {
      (authService.processToken as jest.Mock).mockImplementation(() => {
        throw new InsufficientRightsError("Forbidden: Insufficient rights");
      });

      const res = await request(app)
        .patch("/api/v1/networks/NET01")
        .set("Authorization", token)
        .send(updatePayload);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        code: 403,
        name: "InsufficientRightsError",
        message: "Forbidden: Insufficient rights"
      });
    });

    it("should return 404 if network does not exist", async () => {
      (authService.processToken as jest.Mock).mockResolvedValue(undefined);
      (networkController.updateNetwork as jest.Mock).mockImplementation(() => {
        throw new NotFoundError("Entity not found");
      });

      const res = await request(app)
        .patch("/api/v1/networks/NET404")
        .set("Authorization", token)
        .send({ ...updatePayload, code: "NET404" });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        code: 404,
        name: "NotFoundError",
        message: "Entity not found"
      });
    });

    it("should return 409 if update causes a conflict", async () => {
      (authService.processToken as jest.Mock).mockResolvedValue(undefined);
      (networkController.updateNetwork as jest.Mock).mockImplementation(() => {
        throw new ConflictError("Entity with code NET01 already exists");
      });

      const res = await request(app)
        .patch("/api/v1/networks/NET01")
        .set("Authorization", token)
        .send(updatePayload);

      expect(res.status).toBe(409);
      expect(res.body).toEqual({
        code: 409,
        name: "ConflictError",
        message: "Entity with code NET01 already exists"
      });
    });
    
    it("should return 500 if controller throws an unexpected error", async () => {
      const updatePayload = {
        code: "NET01",
        name: "Internal Error Test",
        description: "Testing server failure",
        gateways: undefined
      };

      (authService.processToken as jest.Mock).mockResolvedValue(undefined);
      (networkController.updateNetwork as jest.Mock).mockImplementation(() => {
        throw new Error("Unexpected server failure");
      });

      const res = await request(app)
        .patch("/api/v1/networks/NET01")
        .set("Authorization", token)
        .send(updatePayload);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        code: 500,
        name: "InternalServerError",
        message: "Unexpected server failure"
      });
    });

    it("should ignore nested gateways and sensors and still update the network", async () => {
      const updateWithNestedObjects = {
        code: "NET01",
        name: "Updated Name",
        description: "Updated Description",
        gateways: [
          {
            macAddress: "AA:BB:CC:DD:EE:FF",
            name: "FakeGW",
            description: "Should be ignored",
            sensors: [
              {
                macAddress: "11:22:33:44:55:66",
                name: "FakeSensor",
                description: "Ignored sensor",
                variable: "humidity",
                unit: "%"
              }
            ]
          }
        ]
      };

      (authService.processToken as jest.Mock).mockResolvedValue(undefined);
      (networkController.updateNetwork as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .patch("/api/v1/networks/NET01")
        .set("Authorization", token)
        .send(updateWithNestedObjects);

      expect(res.status).toBe(204);
      expect(networkController.updateNetwork).toHaveBeenCalledWith("NET01", updateWithNestedObjects);
    });
  });

  describe("DELETE /api/v1/networks/:networkCode", () => {
    it("should return 204 when the network is successfully deleted", async () => {
      (authService.processToken as jest.Mock).mockResolvedValue(undefined);
      (networkController.deleteNetwork as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .delete("/api/v1/networks/NET01")
        .set("Authorization", token);

      expect(res.status).toBe(204);
      expect(networkController.deleteNetwork).toHaveBeenCalledWith("NET01");
    });

    it("should return 401 if the token is invalid", async () => {
      (authService.processToken as jest.Mock).mockImplementation(() => {
        throw new UnauthorizedError("Unauthorized: Invalid token format");
      });

      const res = await request(app)
        .delete("/api/v1/networks/NET01")
        .set("Authorization", "Bearer invalid");

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        code: 401,
        name: "UnauthorizedError",
        message: "Unauthorized: Invalid token format"
      });
    });

    it("should return 403 if user has insufficient rights", async () => {
      (authService.processToken as jest.Mock).mockImplementation(() => {
        throw new InsufficientRightsError("Forbidden: Insufficient rights");
      });

      const res = await request(app)
        .delete("/api/v1/networks/NET01")
        .set("Authorization", token);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        code: 403,
        name: "InsufficientRightsError",
        message: "Forbidden: Insufficient rights"
      });
    });

    it("should return 404 if the network does not exist", async () => {
      (authService.processToken as jest.Mock).mockResolvedValue(undefined);
      (networkController.deleteNetwork as jest.Mock).mockImplementation(() => {
        throw new NotFoundError("Entity not found");
      });

      const res = await request(app)
        .delete("/api/v1/networks/NON_EXISTENT")
        .set("Authorization", token);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        code: 404,
        name: "NotFoundError",
        message: "Entity not found"
      });
    });

    it("should return 500 if controller throws an unexpected error", async () => {
      (authService.processToken as jest.Mock).mockResolvedValue(undefined);
      (networkController.deleteNetwork as jest.Mock).mockImplementation(() => {
        throw new Error("Unexpected failure");
      });

      const res = await request(app)
        .delete("/api/v1/networks/NET01")
        .set("Authorization", token);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        code: 500,
        name: "InternalServerError",
        message: "Unexpected failure"
      });
    });
  });
});
