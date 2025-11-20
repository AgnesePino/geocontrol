import request from "supertest";
import { app } from "@app";
import * as authService from "@services/authService";
import * as gatewayController from "@controllers/gatewayController";
import { UserType } from "@models/UserType";
import { UnauthorizedError } from "@models/errors/UnauthorizedError";
import { InsufficientRightsError } from "@models/errors/InsufficientRightsError";
import { Gateway } from "@models/dto/Gateway";
import { Code } from "typeorm";
import { NotFoundError } from "@models/errors/NotFoundError";
import { ConflictError } from "@models/errors/ConflictError";
import { BadRequest } from "express-openapi-validator/dist/openapi.validator";

jest.mock("@services/authService");
jest.mock("@controllers/gatewayController");

describe("GatewayRoutes integration", () => {
	const token = "Bearer faketoken";
	const networkCode = "test-network";
	const gatewayMac = "AA:BB:CC:DD:EE:FF";

	afterEach(() => {
    	jest.clearAllMocks();
  	});

	it("GET /api/v1/networks/:networkCode/gateways: returns all gateways", async () => {
    	const mockGateways: Gateway[] = [{ macAddress: gatewayMac, name: "Test Gateway" }];

    	(authService.processToken as jest.Mock).mockResolvedValue(undefined);
    	(gatewayController.getAllGateways as jest.Mock).mockResolvedValue(mockGateways);

    	const response = await request(app)
    		.get(`/api/v1/networks/${networkCode}/gateways`)
    		.set("Authorization", token);

    	expect(response.status).toBe(200);
    	expect(response.body).toEqual(mockGateways);
    	expect(authService.processToken).toHaveBeenCalledWith(token, []);
    	expect(gatewayController.getAllGateways).toHaveBeenCalledWith(networkCode);
  	});

	it("GET /api/v1/networks/:networkCode/gateways; 401 unauthorized access", async () => {
		(authService.processToken as jest.Mock).mockImplementation(() => {
      		throw new UnauthorizedError("Unauthorized: Invalid token");
    	});

		const response = await request(app)
	  		.get(`/api/v1/networks/${networkCode}/gateways`)
	  		.set("Authorization", token);

		expect(response.status).toBe(401);
		expect(response.body).toEqual({
			code: 401,
			message: "Unauthorized: Invalid token",
			name: "UnauthorizedError"
		});
  	});

	it("GET /api/v1/networks/:networkCode/gateways: 403 insufficient rights", async () => {
		(authService.processToken as jest.Mock).mockImplementation(() => {
	  		throw new InsufficientRightsError("Insufficient rights to access this resource");
		});

		const response = await request(app)
	  		.get(`/api/v1/networks/${networkCode}/gateways`)
	  		.set("Authorization", token);

		expect(response.status).toBe(403);
		expect(response.body).toEqual({
			code: 403,
			message: "Insufficient rights to access this resource",
			name: "InsufficientRightsError"
		});
  	});

	it("GET /api/v1/networks/:networkCode/gateways: 500 InternalServerError", async () => {
		(authService.processToken as jest.Mock).mockImplementation(() => {
	  		throw new Error("Internal Server Error");
		});

		const response = await request(app)
	  		.get(`/api/v1/networks/${networkCode}/gateways`)
	  		.set("Authorization", token);

		expect(response.status).toBe(500);
		expect(response.body).toEqual({
			code: 500,
			message: "Internal Server Error",
			name: "InternalServerError"
		});
  	});

	it("GET /api/v1/networks/:networkCode/gateways: 500 InternalServerError from controller", async () => {
        (authService.processToken as jest.Mock).mockResolvedValue(undefined);
        (gatewayController.getAllGateways as jest.Mock).mockImplementation(() => {
            throw new Error("Internal Server Error from controller");
        });

        const response = await request(app)
            .get(`/api/v1/networks/${networkCode}/gateways`)
            .set("Authorization", token);

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
            code: 500,
            message: "Internal Server Error from controller",
            name: "InternalServerError" // Assicurati che il tuo error handler restituisca questo nome
        });
        expect(authService.processToken).toHaveBeenCalledWith(token, []);
        expect(gatewayController.getAllGateways).toHaveBeenCalledWith(networkCode);
    });

	it("POST /api/v1/networks/:networkCode/gateways - creates gateway", async () => {
    	(authService.processToken as jest.Mock).mockResolvedValue(undefined);
    	(gatewayController.createGateway as jest.Mock).mockResolvedValue(undefined);

    	const gatewayPayload = { macAddress: gatewayMac, name: "New Gateway" };

    	const response = await request(app)
    		.post(`/api/v1/networks/${networkCode}/gateways`)
    		.set("Authorization", token)
    	  	.send(gatewayPayload);

    	expect(response.status).toBe(201);
    	expect(gatewayController.createGateway).toHaveBeenCalled();
  	});

	it("POST /api/v1/networks/:networkCode/gateways - 400 for invalid gateway data", async () => {
		(authService.processToken as jest.Mock).mockResolvedValue(undefined);
		(gatewayController.createGateway as jest.Mock).mockImplementation(() => {
	  		throw new Error("Invalid gateway data");
		});

		const gatewayPayload = { };

		const response = await request(app)
	  		.post(`/api/v1/networks/${networkCode}/gateways`)
	  		.set("Authorization", token)
	  		.send(gatewayPayload);

		expect(response.status).toBe(400);
		expect(response.body).toEqual({
	  		code: 400,
	  		message: "request/body must have required property 'macAddress'",
	  		name: "Bad Request"
		});
  	});

	it("POST /api/v1/networks/:networkCode/gateways: 401 unauthorized access", async () => {
		(authService.processToken as jest.Mock).mockImplementation(() => {
	  		throw new UnauthorizedError("Unauthorized: Invalid token");
		});
		const gatewayPayload = { macAddress: gatewayMac, name: "New Gateway" };
		const response = await request(app)
	  		.post(`/api/v1/networks/${networkCode}/gateways`)
	  		.set("Authorization", token)
			.send(gatewayPayload);
		expect(response.status).toBe(401);
		expect(response.body).toEqual({
			code: 401,
			message: "Unauthorized: Invalid token",
			name: "UnauthorizedError"
		});
	});

	it("POST /api/v1/networks/:networkCode/gateways - 403 for insufficient rights", async () => {
		(authService.processToken as jest.Mock).mockResolvedValue(undefined);
		(gatewayController.createGateway as jest.Mock).mockImplementation(() => {
	  		throw new InsufficientRightsError("Insufficient rights to create gateway");
		});
		const gatewayPayload = { macAddress: gatewayMac, name: "New Gateway" };
		const response = await request(app)
	  		.post(`/api/v1/networks/${networkCode}/gateways`)
	  		.set("Authorization", token)
	  		.send(gatewayPayload);

		expect(response.status).toBe(403);
		expect(response.body).toEqual({
	  		code: 403,
	  		message: "Insufficient rights to create gateway",
			name: "InsufficientRightsError"
		});
	});

	it("POST /api/v1/networks/:networkCode/gateways - 404 network not found", async () => {
		(authService.processToken as jest.Mock).mockResolvedValue(undefined);
		(gatewayController.createGateway as jest.Mock).mockImplementation(() => {
	  		throw new NotFoundError("Network not found");
		});

		const gatewayPayload = { macAddress: gatewayMac, name: "New Gateway" };
		const nonExistentCode = "nonexistent-network";

		const response = await request(app)
	  		.post(`/api/v1/networks/${nonExistentCode}/gateways`)
	  		.set("Authorization", token)
	  		.send(gatewayPayload);

		expect(response.status).toBe(404);
		expect(response.body).toEqual({
	  		code: 404,
	  		message: "Network not found",
			name: "NotFoundError"
		});
  	});

	it("POST /api/v1/networks/:networkCode/gateways: 409 Gateway mac address already in use", async () => {
		(authService.processToken as jest.Mock).mockResolvedValue(undefined);
		(gatewayController.createGateway as jest.Mock).mockImplementation(() => {
	  		throw new ConflictError("Gateway with this MAC address already exists");
		});

		const gatewayPayload = { macAddress: gatewayMac, name: "New Gateway" };

		const response = await request(app)
	  		.post(`/api/v1/networks/${networkCode}/gateways`)
	  		.set("Authorization", token)
	  		.send(gatewayPayload);

		expect(response.status).toBe(409);
		expect(response.body).toEqual({
	  		code: 409,
	  		message: "Gateway with this MAC address already exists",
			name: "ConflictError"
		});
  	});

	it("POST /api/v1/networks/:networkCode/gateways: 500 for internal server error", async () => {
		(authService.processToken as jest.Mock).mockResolvedValue(undefined);
		(gatewayController.createGateway as jest.Mock).mockImplementation(() => {
	  		throw new Error("Internal Server Error");
		});

		const gatewayPayload = { macAddress: gatewayMac, name: "New Gateway" };

		const response = await request(app)
	  		.post(`/api/v1/networks/${networkCode}/gateways`)
	  		.set("Authorization", token)
	  		.send(gatewayPayload);

		expect(response.status).toBe(500);
		expect(response.body).toEqual({
	  		code: 500,
	  		message: "Internal Server Error",
			name: "InternalServerError"
		});
  	});

	it("GET /api/v1/networks/:networkCode/gateways/:macAddress - returns a specific gateway", async () => {
    	const mockGateway = { macAddress: gatewayMac, name: "Gateway 1" };
    	(gatewayController.getGatewayByMac as jest.Mock).mockResolvedValue(mockGateway);

    	const response = await request(app)
      		.get(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}`)
      		.set("Authorization", token);

    	expect(response.status).toBe(200);
    	expect(response.body).toEqual(mockGateway);
    	expect(gatewayController.getGatewayByMac).toHaveBeenCalledWith(networkCode, gatewayMac);
  	});

	it("GET /api/v1/networks/:networkCode/gateways/:macAddress: 401 unauthorized access", async () => {
		(authService.processToken as jest.Mock).mockImplementation(() => {
	  		throw new UnauthorizedError("Unauthorized: Invalid token");
		});

		const response = await request(app)
	  		.get(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}`)
	  		.set("Authorization", token);
		
		expect(response.status).toBe(401);
		expect(response.body).toEqual({
	  		code: 401,
	  		message: "Unauthorized: Invalid token",
			name: "UnauthorizedError"
		});
  	});

	it("GET /api/v1/networks/:networkCode/gateways/:macAddress - 404 gateway not found", async () => {
		(authService.processToken as jest.Mock).mockResolvedValue(undefined);
		(gatewayController.getGatewayByMac as jest.Mock).mockImplementation(() => {
	  		throw new NotFoundError("Gateway not found");
		});

		const response = await request(app)
	  		.get(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}`)
	  		.set("Authorization", token);

		expect(response.status).toBe(404);
		expect(response.body).toEqual({
	  		code: 404,
	  		message: "Gateway not found",
			name: "NotFoundError"
		});
  	});

	it("GET /api/v1/networks/:networkCode/gateways/:macAddress - 500 for internal server error", async () => {
		(authService.processToken as jest.Mock).mockResolvedValue(undefined);
		(gatewayController.getGatewayByMac as jest.Mock).mockImplementation(() => {
	  		throw new Error("Internal Server Error");
		});
		const response = await request(app)
	  		.get(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}`)
	  		.set("Authorization", token);
		expect(response.status).toBe(500);
		expect(response.body).toEqual({
	  		code: 500,
	  		message: "Internal Server Error",
			name: "InternalServerError"
		});
  	});

 	it("PATCH /api/v1/networks/:networkCode/gateways/:macAddress: updates gateway", async () => {
    	(authService.processToken as jest.Mock).mockResolvedValue(undefined);
    	(gatewayController.updateGateway as jest.Mock).mockResolvedValue(undefined);

    	const gatewayUpdate = { name: "Updated Gateway" };

    	const response = await request(app)
    	  	.patch(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}`)
    	  	.set("Authorization", token)
    	  	.send(gatewayUpdate);

    	expect(response.status).toBe(204);
    	expect(gatewayController.updateGateway).toHaveBeenCalled();
  	});

	it("PATCH /api/v1/networks/:networkCode/gateways/:macAddress: 400 invalid macAddress field", async () => {
		(authService.processToken as jest.Mock).mockResolvedValue(undefined);
		(gatewayController.updateGateway as jest.Mock).mockImplementation(() => {
			throw new Error("Invalid input data");
		});
		const gatewayUpdate = { macAddress: 53 };
		const response = await request(app)
			.patch(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}`)
			.set("Authorization", token)
			.send(gatewayUpdate);
		expect(response.status).toBe(400);
		expect(response.body).toEqual({
			code: 400,
			message: "request/body/macAddress must be string",
			name: "Bad Request"
		});
	});

		it("PATCH /api/v1/networks/:networkCode/gateways/:macAddress: 400 invalid name field", async () => {
		(authService.processToken as jest.Mock).mockResolvedValue(undefined);
		(gatewayController.updateGateway as jest.Mock).mockImplementation(() => {
			throw new Error("Invalid input data");
		});
		const gatewayUpdate = { name: 12345 };
		const response = await request(app)
			.patch(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}`)
			.set("Authorization", token)
			.send(gatewayUpdate);
		expect(response.status).toBe(400);
		expect(response.body).toMatchObject({
			code: 400,
			name: "Bad Request",
			message: expect.stringContaining("must be string") // o regex check
		});
	});

	it("PATCH /api/v1/networks/:networkCode/gateways/:macAddress: 401 unauthorized access", async () => {
		(authService.processToken as jest.Mock).mockImplementation(() => {
	  		throw new UnauthorizedError("Unauthorized: Invalid token");
		});
		const gatewayUpdate = { name: "Updated Gateway" };
		const response = await request(app)
	  		.patch(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}`)
	  		.set("Authorization", token)
	  		.send(gatewayUpdate);
		expect(response.status).toBe(401);
		expect(response.body).toEqual({
			code: 401,
			message: "Unauthorized: Invalid token",
			name: "UnauthorizedError"
		});
  	});

	it("PATCH /api/v1/networks/:networkCode/gateways/:macAddress - 403 for insufficient rights", async () => {
		(authService.processToken as jest.Mock).mockResolvedValue(undefined);
		(gatewayController.updateGateway as jest.Mock).mockImplementation(() => {
	  		throw new InsufficientRightsError("Insufficient rights to update gateway");
		});
		const gatewayUpdate = { name: "Updated Gateway" };
		const response = await request(app)
	  		.patch(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}`)
	  		.set("Authorization", token)
			.send(gatewayUpdate);
		expect(response.status).toBe(403);
		expect(response.body).toEqual({
	  		code: 403,
	  		message: "Insufficient rights to update gateway",
			name: "InsufficientRightsError"
		});
  	});

	it("PATCH /api/v1/networks/:networkCode/gateways/:macAddress - 404 network not found", async () => {
		(authService.processToken as jest.Mock).mockResolvedValue(undefined);
		(gatewayController.updateGateway as jest.Mock).mockImplementation(() => {
	  		throw new NotFoundError("Network not found");
		});
		const gatewayUpdate = { name: "Updated Gateway" };
		const nonExistentCode = "nonexistent-network";
		const response = await request(app)
	  		.patch(`/api/v1/networks/${nonExistentCode}/gateways/${gatewayMac}`)
	  		.set("Authorization", token)
	  		.send(gatewayUpdate);
		expect(response.status).toBe(404);
		expect(response.body).toEqual({
	  		code: 404,
	  		message: "Network not found",
			name: "NotFoundError"
		});
  	});

	it("PATCH /api/v1/networks/:networkCode/gateways/:macAddress - 404 gateway not found", async () => {
		(authService.processToken as jest.Mock).mockResolvedValue(undefined);
		(gatewayController.updateGateway as jest.Mock).mockImplementation(() => {
	  		throw new NotFoundError("Gateway not found");
		});
		const gatewayUpdate = { name: "Updated Gateway" };
		const response = await request(app)
	  		.patch(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}`)
	  		.set("Authorization", token)
	  		.send(gatewayUpdate);
		expect(response.status).toBe(404);
		expect(response.body).toEqual({
			code: 404,
			message: "Gateway not found",
			name: "NotFoundError"
		});
  	});

	it("PATCH /api/v1/networks/:networkCode/gateways/:macAddress: 409 Gateway mac address already in use", async () => {
		(authService.processToken as jest.Mock).mockResolvedValue(undefined);
		(gatewayController.updateGateway as jest.Mock).mockImplementation(() => {
	  		throw new ConflictError("Gateway with this MAC address already exists");
		});
		const gatewayUpdate = { macAddress: "AA:BB:CC:DD:EE:GG" }; // Trying to change to an existing MAC
		const response = await request(app)
	  		.patch(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}`)
	  		.set("Authorization", token)
	  		.send(gatewayUpdate);
		expect(response.status).toBe(409);
		expect(response.body).toEqual({
	  		code: 409,
	  		message: "Gateway with this MAC address already exists",
			name: "ConflictError"
		});
  	});

	it("PATCH /api/v1/networks/:networkCode/gateways/:macAddress: 500 for internal server error", async () => {
		(authService.processToken as jest.Mock).mockResolvedValue(undefined);
		(gatewayController.updateGateway as jest.Mock).mockImplementation(() => {
	  		throw new Error("Internal Server Error");
		});
		const gatewayUpdate = { name: "Updated Gateway" };
		const response = await request(app)
	  		.patch(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}`)
	  		.set("Authorization", token)
	  		.send(gatewayUpdate);
		expect(response.status).toBe(500);
		expect(response.body).toEqual({
	  		code: 500,
	  		message: "Internal Server Error",
			name: "InternalServerError"
		});
	});

	it("DELETE /api/v1/networks/:networkCode/gateways/:macAddress: deletes gateway", async () => {
    	(authService.processToken as jest.Mock).mockResolvedValue(undefined);
    	(gatewayController.deleteGateway as jest.Mock).mockResolvedValue(undefined);

    	const response = await request(app)
      		.delete(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}`)
      		.set("Authorization", token);

    	expect(response.status).toBe(204);
    	expect(gatewayController.deleteGateway).toHaveBeenCalledWith(networkCode, gatewayMac);
  	});

	it("DELETE /api/v1/networks/:networkCode/gateways/:macAddress: 401 unauthorized access", async () => {
		(authService.processToken as jest.Mock).mockImplementation(() => {
	  		throw new UnauthorizedError("Unauthorized: Invalid token");
		});

		const response = await request(app)
	  		.delete(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}`)
	  		.set("Authorization", token);
		expect(response.status).toBe(401);
		expect(response.body).toEqual({
			code: 401,
			message: "Unauthorized: Invalid token",
			name: "UnauthorizedError"
		});
  	});

	it("DELETE /api/v1/networks/:networkCode/gateways/:macAddress - 404 gateway not found", async () => {
		(authService.processToken as jest.Mock).mockResolvedValue(undefined);
		(gatewayController.deleteGateway as jest.Mock).mockImplementation(() => {
	  		throw new NotFoundError("Gateway not found");
		});

		const response = await request(app)
	  		.delete(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}`)
	  		.set("Authorization", token);

		expect(response.status).toBe(404);
		expect(response.body).toEqual({
	  		code: 404,
	  		message: "Gateway not found",
			name: "NotFoundError"
		});
  	});

	it("DELETE /api/v1/networks/:networkCode/gateways/:macAddress - 500 for internal server error", async () => {
		(authService.processToken as jest.Mock).mockResolvedValue(undefined);
		(gatewayController.deleteGateway as jest.Mock).mockImplementation(() => {
	  		throw new Error("Internal Server Error");
		});

		const response = await request(app)
	  		.delete(`/api/v1/networks/${networkCode}/gateways/${gatewayMac}`)
	  		.set("Authorization", token);

		expect(response.status).toBe(500);
		expect(response.body).toEqual({
	  		code: 500,
	  		message: "Internal Server Error",
			name: "InternalServerError"
		});
  	});

})