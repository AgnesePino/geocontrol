import { app } from "@app";
import request from "supertest";
import type { Sensor as SensorDTO } from "@models/dto/Sensor";
import * as authService from "@services/authService";
import * as sensorController from "@controllers/sensorController";
import * as gatewayController from "@controllers/gatewayController";
import * as networkController from "@controllers/networkController";
import { NotFoundError } from "@models/errors/NotFoundError";
import { InsufficientRightsError } from "@models/errors/InsufficientRightsError";
import { ConflictError } from "@models/errors/ConflictError";

// Mocking the sensor controller functions to simulate
// operations and ensure parameters from routes are passed correctly.
// jest.mock("@controllers/sensorController");

describe("SensorRoutes Integration", () => {
	const token = "Bearer mockToken";

	let authSpy: jest.SpyInstance;
	let networkSpy: jest.SpyInstance;
	let gatewaySpy: jest.SpyInstance;

	beforeEach(() => {
		// Creating a spy on the authService.processToken function
		// to ensure it is called with the correct parameters.
		authSpy = jest.spyOn(authService, "processToken");

		// Need to mock the gateway and network controllers because the sensorController
		// uses them to check the existence of networks and gateways.
		// Using spies because there might be other tests that
		// don't require these controllers to be mocked.
		networkSpy = jest.spyOn(networkController, "getNetworkByCode");
		gatewaySpy = jest.spyOn(gatewayController, "getGatewayByMac");
	});

	afterEach(() => {
		authSpy.mockRestore();
		networkSpy.mockRestore();
		gatewaySpy.mockRestore();
		jest.clearAllMocks();
	});

	// Get all sensors
	describe("GET /:networkCode/gateways/:gatewayMac/sensors", () => {
		const mockSensors: SensorDTO[] = [
			{
				macAddress: "94:3F:BE:4C:4A:79",
				name: "Sensor1",
				unit: "Celsius",
				variable: "Temperature",
			},
			{
				macAddress: "94:3F:BE:4C:4A:80",
				name: "Sensor2",
				unit: "Celsius",
				variable: "Temperature",
			},
			{
				macAddress: "94:3F:BE:4C:4A:81",
				name: "Sensor3",
				unit: "Celsius",
				variable: "Temperature",
			},
		];

		//  Spying on sensorController instead of mockin it completely.
		// because sensorController calls functions that ensure the existence
		// of networks and gateways. By mocking the entire controller function,
		// these checks are not performed, and the 404 Not Found errors are not thrown.
		let sensorControllerSpy: jest.SpyInstance;

		beforeEach(() => {
			sensorControllerSpy = jest.spyOn(
				sensorController,
				"getAllSensorsOfGateway",
			);
		});

		afterEach(() => {
			sensorControllerSpy.mockRestore();
			authSpy.mockRestore();
			jest.clearAllMocks();
		});

		// 200 OK
		it("should return 200 OK with list of sensors", async () => {
			// Mocking the authentication service. Using doMock to ensure
			// that the processToken function is mocked before the app is initialized.
			authSpy.mockResolvedValue(undefined);

			// Need to mock getNetworkByCode and getGatewayByMac so that the
			// existence of them in the database is not actually checked. These
			// functions are called by the withExistingNetworkAndGateway function
			// in the sensorController. It is enough to mock them to return
			// undefined, which simulates that the network and gateway exist.
			// If they do not exist, the sensorController will throw an error.
			networkSpy.mockResolvedValue(undefined);
			gatewaySpy.mockResolvedValue(undefined);

			// Mocking the sensorController.getAllSensorsOfGateway to return the mockSensors
			sensorControllerSpy.mockResolvedValue(mockSensors);

			const response = await request(app)
				.get("/api/v1/networks/NET01/gateways/94:3F:BE:4C:4A:79/sensors")
				.set("Authorization", token);

			expect(response.status).toBe(200);
			expect(response.body).toEqual(mockSensors);
			expect(authService.processToken).toHaveBeenCalled();
			expect(sensorController.getAllSensorsOfGateway).toHaveBeenCalledWith(
				"NET01",
				"94:3F:BE:4C:4A:79",
			);
		});

		// 401 Unauthorized
		it("should return 401 Unauthorized when token is invalid", async () => {
			// Not mocking the authService.processToken here because
			// we want to test the case where the token is invalid and
			// the authentication service will throw an UnauthorizedError.
			const response = await request(app)
				.get("/api/v1/networks/NET01/gateways/94:3F:BE:4C:4A:79/sensors")
				.set("Authorization", "Bearer invalidToken");

			expect(response.status).toBe(401);
			expect(response.body.message).toMatch(/Unauthorized/);
			expect(authService.processToken).toHaveBeenCalled();
		});

		// 404 Not Found
		it("should return 404 Not Found when network does not exist", async () => {
			// Mocking the authentication service, we want to authenticate.
			authSpy.mockResolvedValue(undefined);

			networkSpy.mockRejectedValue(new NotFoundError("Network not found"));
			gatewaySpy.mockResolvedValue(undefined);

			const response = await request(app)
				.get("/api/v1/networks/NONEXISTENT/gateways/94:3F:BE:4C:4A:79/sensors")
				.set("Authorization", token);

			//expect(response.status).toBe(404);
			expect(response.body.message).toMatch(/Network not found/);
			expect(authService.processToken).toHaveBeenCalled();
			expect(networkController.getNetworkByCode).toHaveBeenCalledWith(
				"NONEXISTENT",
			);
		});

		it("should return 404 Not Found when gateway does not exist", async () => {
			// Mocking the authentication service, we want to authenticate.
			authSpy.mockResolvedValue(undefined);

			networkSpy.mockResolvedValue(undefined);
			gatewaySpy.mockRejectedValue(new NotFoundError("Gateway not found"));

			const response = await request(app)
				.get("/api/v1/networks/NET01/gateways/00:00:00:00:00:00/sensors")
				.set("Authorization", token);

			expect(response.status).toBe(404);
			expect(authService.processToken).toHaveBeenCalled();
			expect(networkController.getNetworkByCode).toHaveBeenCalledWith("NET01");
			expect(gatewayController.getGatewayByMac).toHaveBeenCalledWith(
				"NET01",
				"00:00:00:00:00:00",
			);
			expect(response.body.message).toMatch(/Gateway not found/);
		});
	});

	// Create a new sensor
	describe("POST /:networkCode/gateways/:gatewayMac/sensors", () => {
		const mockSensorData = {
			macAddress: "71:B1:CE:01:C6:A9",
			name: "TH01",
			description: "External thermometer",
			variable: "temperature",
			unit: "C",
		};

		let sensorControllerSpy: jest.SpyInstance;

		beforeEach(() => {
			sensorControllerSpy = jest.spyOn(sensorController, "createSensor");
		});

		afterEach(() => {
			sensorControllerSpy.mockRestore();
			authSpy.mockRestore();
			jest.clearAllMocks();
		});

		// 201 Created
		it("should return 201 Created when sensor is created successfully", async () => {
			authSpy.mockResolvedValue(undefined);
			networkSpy.mockResolvedValue(undefined);
			gatewaySpy.mockResolvedValue(undefined);
			sensorControllerSpy.mockResolvedValue(undefined);

			const response = await request(app)
				.post("/api/v1/networks/NET01/gateways/94:3F:BE:4C:4A:79/sensors")
				.set("Authorization", token)
				.send(mockSensorData);

			expect(response.status).toBe(201);
			expect(authService.processToken).toHaveBeenCalled();
			expect(sensorController.createSensor).toHaveBeenCalledWith(
				"NET01",
				"94:3F:BE:4C:4A:79",
				mockSensorData,
			);
		});

		// 400 Bad Request
		it("should return 400 Bad Request when required field is missing", async () => {
			networkSpy.mockResolvedValue(undefined);
			gatewaySpy.mockResolvedValue(undefined);

			const invalidSensorData = {
				name: "TH01",
				description: "External thermometer",
				// missing macAddress
			};

			const response = await request(app)
				.post("/api/v1/networks/NET01/gateways/94:3F:BE:4C:4A:79/sensors")
				.set("Authorization", token)
				.send(invalidSensorData);

			expect(response.status).toBe(400);
			expect(response.body.message).toMatch(/must have required property/);
		});

		// 401 Unauthorized
		it("should return 401 Unauthorized when token is invalid", async () => {
			const response = await request(app)
				.post("/api/v1/networks/NET01/gateways/94:3F:BE:4C:4A:79/sensors")
				.set("Authorization", "Bearer invalidToken")
				.send(mockSensorData);

			expect(response.status).toBe(401);
			expect(response.body.message).toMatch(/Unauthorized/);
			expect(authService.processToken).toHaveBeenCalled();
		});

		// 403 Forbidden (Viewer role)
		it("should return 403 Forbidden when user has insufficient rights", async () => {
			// Mock auth to throw InsufficientRightsError for viewer role
			authSpy.mockRejectedValue(
				new InsufficientRightsError("Forbidden: Insufficient rights"),
			);

			const response = await request(app)
				.post("/api/v1/networks/NET01/gateways/94:3F:BE:4C:4A:79/sensors")
				.set("Authorization", token)
				.send(mockSensorData);

			expect(response.status).toBe(403);
			expect(response.body.message).toMatch(/Forbidden|Insufficient rights/);
			expect(authService.processToken).toHaveBeenCalled();
		});

		// 404 Not Found - Network
		it("should return 404 Not Found when network does not exist", async () => {
			authSpy.mockResolvedValue(undefined);
			networkSpy.mockRejectedValue(new NotFoundError("Network not found"));
			gatewaySpy.mockResolvedValue(undefined);

			const response = await request(app)
				.post("/api/v1/networks/NONEXISTENT/gateways/94:3F:BE:4C:4A:79/sensors")
				.set("Authorization", token)
				.send(mockSensorData);

			expect(response.status).toBe(404);
			expect(response.body.message).toMatch(/Network not found/);
			expect(authService.processToken).toHaveBeenCalled();
		});

		// 404 Not Found - Gateway
		it("should return 404 Not Found when gateway does not exist", async () => {
			authSpy.mockResolvedValue(undefined);
			networkSpy.mockResolvedValue(undefined);
			gatewaySpy.mockRejectedValue(new NotFoundError("Gateway not found"));

			const response = await request(app)
				.post("/api/v1/networks/NET01/gateways/00:00:00:00:00:00/sensors")
				.set("Authorization", token)
				.send(mockSensorData);

			expect(response.status).toBe(404);
			expect(response.body.message).toMatch(/Gateway not found/);
			expect(authService.processToken).toHaveBeenCalled();
		});

		// 409 Conflict
		it("should return 409 Conflict when sensor mac address already exists", async () => {
			authSpy.mockResolvedValue(undefined);
			networkSpy.mockResolvedValue(undefined);
			gatewaySpy.mockResolvedValue(undefined);
			sensorControllerSpy.mockRejectedValue(
				new ConflictError("Entity with code xxxxx already exists"),
			);

			const response = await request(app)
				.post("/api/v1/networks/NET01/gateways/94:3F:BE:4C:4A:79/sensors")
				.set("Authorization", token)
				.send(mockSensorData);

			expect(response.status).toBe(409);
			expect(response.body.message).toMatch(/already exists/);
			expect(authService.processToken).toHaveBeenCalled();
		});
	});

	// Get a specific sensor
	describe("GET /:networkCode/gateways/:gatewayMac/sensors/:sensorMac", () => {
		const mockSensor = {
			macAddress: "71:B1:CE:01:C6:A9",
			name: "TH01",
			description: "External thermometer",
			variable: "temperature",
			unit: "C",
		};

		let sensorControllerSpy: jest.SpyInstance;

		beforeEach(() => {
			sensorControllerSpy = jest.spyOn(sensorController, "getSensorByMac");
		});

		afterEach(() => {
			sensorControllerSpy.mockRestore();
			authSpy.mockRestore();
			jest.clearAllMocks();
		});

		// 200 OK
		it("should return 200 OK with sensor data", async () => {
			authSpy.mockResolvedValue(undefined);
			networkSpy.mockResolvedValue(undefined);
			gatewaySpy.mockResolvedValue(undefined);
			sensorControllerSpy.mockResolvedValue(mockSensor);

			const response = await request(app)
				.get(
					"/api/v1/networks/NET01/gateways/94:3F:BE:4C:4A:79/sensors/71:B1:CE:01:C6:A9",
				)
				.set("Authorization", token);

			expect(response.status).toBe(200);
			expect(response.body).toEqual(mockSensor);
			expect(authService.processToken).toHaveBeenCalled();
			expect(sensorController.getSensorByMac).toHaveBeenCalledWith(
				"NET01",
				"94:3F:BE:4C:4A:79",
				"71:B1:CE:01:C6:A9",
			);
		});

		// 401 Unauthorized
		it("should return 401 Unauthorized when token is invalid", async () => {
			const response = await request(app)
				.get(
					"/api/v1/networks/NET01/gateways/94:3F:BE:4C:4A:79/sensors/71:B1:CE:01:C6:A9",
				)
				.set("Authorization", "Bearer invalidToken");

			expect(response.status).toBe(401);
			expect(response.body.message).toMatch(/Unauthorized/);
			expect(authService.processToken).toHaveBeenCalled();
		});

		// 404 Not Found - Network
		it("should return 404 Not Found when network does not exist", async () => {
			authSpy.mockResolvedValue(undefined);
			networkSpy.mockRejectedValue(new NotFoundError("Network not found"));

			const response = await request(app)
				.get(
					"/api/v1/networks/NONEXISTENT/gateways/94:3F:BE:4C:4A:79/sensors/71:B1:CE:01:C6:A9",
				)
				.set("Authorization", token);

			expect(response.status).toBe(404);
			expect(response.body.message).toMatch(/Network not found/);
			expect(authService.processToken).toHaveBeenCalled();
		});

		// 404 Not Found - Gateway
		it("should return 404 Not Found when gateway does not exist", async () => {
			authSpy.mockResolvedValue(undefined);
			networkSpy.mockResolvedValue(undefined);
			gatewaySpy.mockRejectedValue(new NotFoundError("Gateway not found"));

			const response = await request(app)
				.get(
					"/api/v1/networks/NET01/gateways/00:00:00:00:00:00/sensors/71:B1:CE:01:C6:A9",
				)
				.set("Authorization", token);

			expect(response.status).toBe(404);
			expect(response.body.message).toMatch(/Gateway not found/);
			expect(authService.processToken).toHaveBeenCalled();
		});

		// 404 Not Found - Sensor
		it("should return 404 Not Found when sensor does not exist", async () => {
			authSpy.mockResolvedValue(undefined);
			networkSpy.mockResolvedValue(undefined);
			gatewaySpy.mockResolvedValue(undefined);
			sensorControllerSpy.mockRejectedValue(
				new NotFoundError("Sensor not found"),
			);

			const response = await request(app)
				.get(
					"/api/v1/networks/NET01/gateways/94:3F:BE:4C:4A:79/sensors/00:00:00:00:00:00",
				)
				.set("Authorization", token);

			expect(response.status).toBe(404);
			expect(response.body.message).toMatch(/Sensor not found/);
			expect(authService.processToken).toHaveBeenCalled();
		});
	});

	// Update a sensor
	describe("PATCH /:networkCode/gateways/:gatewayMac/sensors/:sensorMac", () => {
		const mockUpdateData = {
			macAddress: "4F:72:D2:6B:3B:27",
			name: "Updated Name",
			description: "Updated Description",
			variable: "humidity",
			unit: "%",
		};

		let sensorControllerSpy: jest.SpyInstance;

		beforeEach(() => {
			sensorControllerSpy = jest.spyOn(sensorController, "updateSensor");
		});

		afterEach(() => {
			sensorControllerSpy.mockRestore();
			authSpy.mockRestore();
			jest.clearAllMocks();
		});

		// 204 No Content
		it("should return 204 No Content when sensor is updated successfully", async () => {
			authSpy.mockResolvedValue(undefined);
			networkSpy.mockResolvedValue(undefined);
			gatewaySpy.mockResolvedValue(undefined);
			sensorControllerSpy.mockResolvedValue(undefined);

			const response = await request(app)
				.patch(
					"/api/v1/networks/NET01/gateways/94:3F:BE:4C:4A:79/sensors/71:B1:CE:01:C6:A9",
				)
				.set("Authorization", token)
				.send(mockUpdateData);

			expect(response.status).toBe(204);
			expect(authService.processToken).toHaveBeenCalled();
			expect(sensorController.updateSensor).toHaveBeenCalledWith(
				"NET01",
				"94:3F:BE:4C:4A:79",
				"71:B1:CE:01:C6:A9",
				mockUpdateData,
			);
		});

		// 400 Bad Request
		it("should return 400 Bad Request when request body is invalid", async () => {
			// In 400 errors thrown by the OpenAPI validation middleware,
			// the authService.processToken is not called, so we don't need to mock it here.
			networkSpy.mockResolvedValue(undefined);
			gatewaySpy.mockResolvedValue(undefined);

			const invalidData = {
				macAddress: "", // invalid empty mac address
			};

			const response = await request(app)
				.patch(
					"/api/v1/networks/NET01/gateways/94:3F:BE:4C:4A:79/sensors/71:B1:CE:01:C6:A9",
				)
				.set("Authorization", token)
				.send(invalidData);

			expect(response.status).toBe(400);
			expect(response.body.message).toMatch(
				/must|BadRequest/,
			);
		});

		// 401 Unauthorized
		it("should return 401 Unauthorized when token is invalid", async () => {
			const response = await request(app)
				.patch(
					"/api/v1/networks/NET01/gateways/94:3F:BE:4C:4A:79/sensors/71:B1:CE:01:C6:A9",
				)
				.set("Authorization", "Bearer invalidToken")
				.send(mockUpdateData);

			expect(response.status).toBe(401);
			expect(response.body.message).toMatch(/Unauthorized/);
			expect(authService.processToken).toHaveBeenCalled();
		});

		// 403 Forbidden
		it("should return 403 Forbidden when user has insufficient rights", async () => {
			authSpy.mockRejectedValue(
				new InsufficientRightsError("Forbidden: Insufficient rights"),
			);

			const response = await request(app)
				.patch(
					"/api/v1/networks/NET01/gateways/94:3F:BE:4C:4A:79/sensors/71:B1:CE:01:C6:A9",
				)
				.set("Authorization", token)
				.send(mockUpdateData);

			expect(response.status).toBe(403);
			expect(response.body.message).toMatch(/Forbidden|Insufficient rights/);
			expect(authService.processToken).toHaveBeenCalled();
		});

		// 404 Not Found - Network
		it("should return 404 Not Found when network does not exist", async () => {
			authSpy.mockResolvedValue(undefined);
			networkSpy.mockRejectedValue(new NotFoundError("Network not found"));

			const response = await request(app)
				.patch(
					"/api/v1/networks/NONEXISTENT/gateways/94:3F:BE:4C:4A:79/sensors/71:B1:CE:01:C6:A9",
				)
				.set("Authorization", token)
				.send(mockUpdateData);

			expect(response.status).toBe(404);
			expect(response.body.message).toMatch(/Network not found/);
			expect(authService.processToken).toHaveBeenCalled();
		});

		// 404 Not Found - Gateway
		it("should return 404 Not Found when gateway does not exist", async () => {
			authSpy.mockResolvedValue(undefined);
			networkSpy.mockResolvedValue(undefined);
			gatewaySpy.mockRejectedValue(new NotFoundError("Gateway not found"));

			const response = await request(app)
				.patch(
					"/api/v1/networks/NET01/gateways/00:00:00:00:00:00/sensors/71:B1:CE:01:C6:A9",
				)
				.set("Authorization", token)
				.send(mockUpdateData);

			expect(response.status).toBe(404);
			expect(response.body.message).toMatch(/Gateway not found/);
			expect(authService.processToken).toHaveBeenCalled();
		});

		// 404 Not Found - Sensor
		it("should return 404 Not Found when sensor does not exist", async () => {
			authSpy.mockResolvedValue(undefined);
			networkSpy.mockResolvedValue(undefined);
			gatewaySpy.mockResolvedValue(undefined);
			sensorControllerSpy.mockRejectedValue(
				new NotFoundError("Sensor not found"),
			);

			const response = await request(app)
				.patch(
					"/api/v1/networks/NET01/gateways/94:3F:BE:4C:4A:79/sensors/00:00:00:00:00:00",
				)
				.set("Authorization", token)
				.send(mockUpdateData);

			expect(response.status).toBe(404);
			expect(response.body.message).toMatch(/Sensor not found/);
			expect(authService.processToken).toHaveBeenCalled();
		});

		// 409 Conflict
		it("should return 409 Conflict when new mac address already exists", async () => {
			authSpy.mockResolvedValue(undefined);
			networkSpy.mockResolvedValue(undefined);
			gatewaySpy.mockResolvedValue(undefined);
			sensorControllerSpy.mockRejectedValue(
				new ConflictError("Entity with code xxxxx already exists"),
			);

			const response = await request(app)
				.patch(
					"/api/v1/networks/NET01/gateways/94:3F:BE:4C:4A:79/sensors/71:B1:CE:01:C6:A9",
				)
				.set("Authorization", token)
				.send(mockUpdateData);

			expect(response.status).toBe(409);
			expect(response.body.message).toMatch(/already exists/);
			expect(authService.processToken).toHaveBeenCalled();
		});
	});

	// Delete a sensor
	describe("DELETE /:networkCode/gateways/:gatewayMac/sensors/:sensorMac", () => {
		let sensorControllerSpy: jest.SpyInstance;

		beforeEach(() => {
			sensorControllerSpy = jest.spyOn(sensorController, "deleteSensor");
		});

		afterEach(() => {
			sensorControllerSpy.mockRestore();
			authSpy.mockRestore();
			jest.clearAllMocks();
		});

		// 204 No Content
		it("should return 204 No Content when sensor is deleted successfully", async () => {
			authSpy.mockResolvedValue(undefined);
			networkSpy.mockResolvedValue(undefined);
			gatewaySpy.mockResolvedValue(undefined);
			sensorControllerSpy.mockResolvedValue(undefined);

			const response = await request(app)
				.delete(
					"/api/v1/networks/NET01/gateways/94:3F:BE:4C:4A:79/sensors/71:B1:CE:01:C6:A9",
				)
				.set("Authorization", token);

			expect(response.status).toBe(204);
			expect(authService.processToken).toHaveBeenCalled();
			expect(sensorController.deleteSensor).toHaveBeenCalledWith(
				"NET01",
				"94:3F:BE:4C:4A:79",
				"71:B1:CE:01:C6:A9",
			);
		});

		// 401 Unauthorized
		it("should return 401 Unauthorized when token is invalid", async () => {
			const response = await request(app)
				.delete(
					"/api/v1/networks/NET01/gateways/94:3F:BE:4C:4A:79/sensors/71:B1:CE:01:C6:A9",
				)
				.set("Authorization", "Bearer invalidToken");

			expect(response.status).toBe(401);
			expect(response.body.message).toMatch(/Unauthorized/);
			expect(authService.processToken).toHaveBeenCalled();
		});

		// 403 Forbidden
		it("should return 403 Forbidden when user has insufficient rights", async () => {
			authSpy.mockRejectedValue(
				new InsufficientRightsError("Forbidden: Insufficient rights"),
			);

			const response = await request(app)
				.delete(
					"/api/v1/networks/NET01/gateways/94:3F:BE:4C:4A:79/sensors/71:B1:CE:01:C6:A9",
				)
				.set("Authorization", token);

			expect(response.status).toBe(403);
			expect(response.body.message).toMatch(/Forbidden|Insufficient rights/);
			expect(authService.processToken).toHaveBeenCalled();
		});

		// 404 Not Found - Network
		it("should return 404 Not Found when network does not exist", async () => {
			authSpy.mockResolvedValue(undefined);
			networkSpy.mockRejectedValue(new NotFoundError("Network not found"));

			const response = await request(app)
				.delete(
					"/api/v1/networks/NONEXISTENT/gateways/94:3F:BE:4C:4A:79/sensors/71:B1:CE:01:C6:A9",
				)
				.set("Authorization", token);

			expect(response.status).toBe(404);
			expect(response.body.message).toMatch(/Network not found/);
			expect(authService.processToken).toHaveBeenCalled();
		});

		// 404 Not Found - Gateway
		it("should return 404 Not Found when gateway does not exist", async () => {
			authSpy.mockResolvedValue(undefined);
			networkSpy.mockResolvedValue(undefined);
			gatewaySpy.mockRejectedValue(new NotFoundError("Gateway not found"));

			const response = await request(app)
				.delete(
					"/api/v1/networks/NET01/gateways/00:00:00:00:00:00/sensors/71:B1:CE:01:C6:A9",
				)
				.set("Authorization", token);

			expect(response.status).toBe(404);
			expect(response.body.message).toMatch(/Gateway not found/);
			expect(authService.processToken).toHaveBeenCalled();
		});

		// 404 Not Found - Sensor
		it("should return 404 Not Found when sensor does not exist", async () => {
			authSpy.mockResolvedValue(undefined);
			networkSpy.mockResolvedValue(undefined);
			gatewaySpy.mockResolvedValue(undefined);
			sensorControllerSpy.mockRejectedValue(
				new NotFoundError("Sensor not found"),
			);

			const response = await request(app)
				.delete(
					"/api/v1/networks/NET01/gateways/94:3F:BE:4C:4A:79/sensors/00:00:00:00:00:00",
				)
				.set("Authorization", token);

			expect(response.status).toBe(404);
			expect(response.body.message).toMatch(/Sensor not found/);
			expect(authService.processToken).toHaveBeenCalled();
		});
	});
});
