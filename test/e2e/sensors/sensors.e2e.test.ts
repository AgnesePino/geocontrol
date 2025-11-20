import { generateToken } from "@services/authService";
import { afterAllE2e, beforeAllE2e, TEST_USERS } from "../lifecycle";
import request from "supertest";
import { app } from "../../../src/app";
import { NetworkRepository } from "@repositories/NetworkRepository";
import { GatewayRepository } from "@repositories/GatewayRepository";
import { SensorRepository } from "@repositories/SensorRepository";
import type { Sensor } from "@models/dto/Sensor";
import type { Gateway } from "@models/dto/Gateway";
import type { Network } from "@models/dto/Network";

describe("SENSORS API (e2e)", () => {
	let adminToken: string;
	let operatorToken: string;
	let viewerToken: string;

	// Repositories
	let networkRepo: NetworkRepository;
	let gatewayRepo: GatewayRepository;
	let sensorRepo: SensorRepository;

	// Data
	const testNetwork: Network = {
		code: "TESTNET",
		name: "Test Network",
		description: "Test network for sensor E2E tests",
	};

	const testGateway: Gateway = {
		macAddress: "AA:BB:CC:DD:EE:FF",
		name: "Test Gateway",
		description: "Test gateway for sensor tests",
	};

	const emptyTestGateway: Gateway = {
		macAddress: "00:11:22:33:44:55",
		name: "Empty Gateway",
		description: "Gateway with no sensors",
	};

	const testSensor: Sensor = {
		macAddress: "11:22:33:44:55:66",
		name: "Test Sensor",
		description: "Test temperature sensor",
		variable: "temperature",
		unit: "°C",
	};

	const updatedSensor = {
		macAddress: "77:88:99:AA:BB:CC",
		name: "Updated Sensor",
		description: "Updated test sensor",
		variable: "humidity",
		unit: "%",
	};

	beforeAll(async () => {
		await beforeAllE2e();

		adminToken = generateToken(TEST_USERS.admin);
		operatorToken = generateToken(TEST_USERS.operator);
		viewerToken = generateToken(TEST_USERS.viewer);

		networkRepo = new NetworkRepository();
		gatewayRepo = new GatewayRepository();
		sensorRepo = new SensorRepository();

		// Inserting test data
		await networkRepo.createNetwork(
			testNetwork.code,
			testNetwork.name,
			testNetwork.description,
		);

		await gatewayRepo.createGateway(
			testGateway.macAddress,
			testNetwork.code,
			testGateway.name,
			testGateway.description,
		);

		await gatewayRepo.createGateway(
			emptyTestGateway.macAddress,
			testNetwork.code,
			emptyTestGateway.name,
			emptyTestGateway.description,
		);

		await sensorRepo.createSensor(testGateway.macAddress, testSensor);
	});

	afterAll(async () => {
		await afterAllE2e();
	});

	// One test set for each endpoint

	describe("GET /networks/:networkCode/gateways/:gatewayMac/sensors", () => {
		it("should return 200 and empty array when no sensors exist", async () => {
			const response = await request(app)
				.get(
					`/api/v1/networks/${testNetwork.code}/gateways/${emptyTestGateway.macAddress}/sensors`,
				)
				.set("Authorization", `Bearer ${viewerToken}`);

			expect(response.status).toBe(200);
			expect(response.body).toEqual([]);
		});

		it("should return 200 and sensors array when sensors exist", async () => {
			// Create a sensor first
			await request(app)
				.post(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors`,
				)
				.set("Authorization", `Bearer ${viewerToken}`)
				.send(testSensor);

			const response = await request(app)
				.get(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors`,
				)
				.set("Authorization", `Bearer ${viewerToken}`);

			expect(response.status).toBe(200);
			expect(Array.isArray(response.body)).toBe(true);
			expect(response.body.length).toBe(1);
			expect(response.body[0]).toMatchObject({
				macAddress: testSensor.macAddress,
				name: testSensor.name,
				description: testSensor.description,
				variable: testSensor.variable,
				unit: testSensor.unit,
			});
		});

		it("should return 401 when no token provided", async () => {
			const response = await request(app).get(
				`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors`,
			);

			expect(response.status).toBe(401);
		});

		it("should return 401 when invalid token provided", async () => {
			const response = await request(app)
				.get(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors`,
				)
				.set("Authorization", "Bearer invalid-token");

			expect(response.status).toBe(401);
		});

		it("should return 404 when network does not exist", async () => {
			const response = await request(app)
				.get(
					`/api/v1/networks/NONEXISTENT/gateways/${testGateway.macAddress}/sensors`,
				)
				.set("Authorization", `Bearer ${viewerToken}`);

			expect(response.status).toBe(404);
		});

		it("should return 404 when gateway does not exist", async () => {
			const response = await request(app)
				.get(
					`/api/v1/networks/${testNetwork.code}/gateways/FF:FF:FF:FF:FF:FF/sensors`,
				)
				.set("Authorization", `Bearer ${viewerToken}`);

			expect(response.status).toBe(404);
		});
	});

	describe("POST /networks/:networkCode/gateways/:gatewayMac/sensors", () => {
		const adminNewSensor: Sensor = {
			macAddress: "DD:EE:FF:00:11:22",
			name: "Admin Sensor",
			description: "New test sensor",
			variable: "pressure",
			unit: "hPa",
		};

		const operatorNewSensor: Sensor = {
			macAddress: "33:44:55:66:77:88",
			name: "Operator Sensor",
			description: "Sensor created by operator",
			variable: "wind_speed",
			unit: "m/s",
		};

		it("should return 201 when sensor created successfully and user is admin", async () => {
			const response = await request(app)
				.post(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors`,
				)
				.set("Authorization", `Bearer ${adminToken}`)
				.send(adminNewSensor);

			expect(response.status).toBe(201);
		});

		it("should return 201 when sensor created successfully and user is operator", async () => {
			const response = await request(app)
				.post(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors`,
				)
				.set("Authorization", `Bearer ${operatorToken}`)
				.send(operatorNewSensor);

			expect(response.status).toBe(201);
		});

		it("should return 403 when the user is viewer", async () => {
			const response = await request(app)
				.post(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors`,
				)
				.set("Authorization", `Bearer ${viewerToken}`)
				.send(adminNewSensor);

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty("name", "InsufficientRightsError");
		});

		it("should return 401 when no token provided", async () => {
			const response = await request(app)
				.post(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors`,
				)
				.send(adminNewSensor);

			expect(response.status).toBe(401);
		});

		it("should return 400 when invalid sensor data provided", async () => {
			const invalidSensor = {
				macAddress: "", // Invalid empty MAC
				name: "Invalid Sensor",
			};

			const response = await request(app)
				.post(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors`,
				)
				.set("Authorization", `Bearer ${adminToken}`)
				.send(invalidSensor);

			expect(response.status).toBe(400);
		});

		it("should return 404 when network does not exist", async () => {
			const response = await request(app)
				.post(
					`/api/v1/networks/NONEXISTENT/gateways/${testGateway.macAddress}/sensors`,
				)
				.set("Authorization", `Bearer ${adminToken}`)
				.send(adminNewSensor);

			expect(response.status).toBe(404);
		});

		it("should return 404 when gateway does not exist", async () => {
			const response = await request(app)
				.post(
					`/api/v1/networks/${testNetwork.code}/gateways/FF:FF:FF:FF:FF:FF/sensors`,
				)
				.set("Authorization", `Bearer ${adminToken}`)
				.send(adminNewSensor);

			expect(response.status).toBe(404);
		});

		it("should return 409 when sensor MAC already exists", async () => {
			const response = await request(app)
				.post(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors`,
				)
				.set("Authorization", `Bearer ${adminToken}`)
				.send(testSensor); // Using existing sensor MAC

			expect(response.status).toBe(409);
		});
	});

	describe("GET /networks/:networkCode/gateways/:gatewayMac/sensors/:sensorMac", () => {
		it("should return 200 and sensor data", async () => {
			const response = await request(app)
				.get(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors/${testSensor.macAddress}`,
				)
				.set("Authorization", `Bearer ${viewerToken}`);

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				macAddress: testSensor.macAddress,
				name: testSensor.name,
				description: testSensor.description,
				variable: testSensor.variable,
				unit: testSensor.unit,
			});
		});

		it("should return 401 when no token provided", async () => {
			const response = await request(app).get(
				`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors/${testSensor.macAddress}`,
			);

			expect(response.status).toBe(401);
		});

		it("should return 404 when network does not exist", async () => {
			const response = await request(app)
				.get(
					`/api/v1/networks/NONEXISTENT/gateways/${testGateway.macAddress}/sensors/${testSensor.macAddress}`,
				)
				.set("Authorization", `Bearer ${viewerToken}`);

			expect(response.status).toBe(404);
		});

		it("should return 404 when gateway does not exist", async () => {
			const response = await request(app)
				.get(
					`/api/v1/networks/${testNetwork.code}/gateways/FF:FF:FF:FF:FF:FF/sensors/${testSensor.macAddress}`,
				)
				.set("Authorization", `Bearer ${viewerToken}`);

			expect(response.status).toBe(404);
		});

		it("should return 404 when sensor does not exist", async () => {
			const response = await request(app)
				.get(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors/99:99:99:99:99:99`,
				)
				.set("Authorization", `Bearer ${viewerToken}`);

			expect(response.status).toBe(404);
		});
	});

	describe("PATCH /networks/:networkCode/gateways/:gatewayMac/sensors/:sensorMac", () => {
		it("should return 204 when sensor updated successfully and user is admin", async () => {
			const response = await request(app)
				.patch(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors/${testSensor.macAddress}`,
				)
				.set("Authorization", `Bearer ${adminToken}`)
				.send(updatedSensor);

			expect(response.status).toBe(204);

			// Verify the update
			const getResponse = await request(app)
				.get(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors/${updatedSensor.macAddress}`,
				)
				.set("Authorization", `Bearer ${adminToken}`);

			expect(getResponse.body).toMatchObject(updatedSensor);
		});

		it("should return 204 when sensor updated successfully and user is operator", async () => {
			const response = await request(app)
				.patch(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors/${updatedSensor.macAddress}`,
				)
				.set("Authorization", `Bearer ${operatorToken}`)
				.send(updatedSensor);

			expect(response.status).toBe(204);

			// Verify the update
			const getResponse = await request(app)
				.get(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors/${updatedSensor.macAddress}`,
				)
				.set("Authorization", `Bearer ${operatorToken}`);

			expect(getResponse.body).toMatchObject(updatedSensor);
		});

		it("should return 403 when the user is viewer", async () => {
			const response = await request(app)
				.patch(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors/${updatedSensor.macAddress}`,
				)
				.set("Authorization", `Bearer ${viewerToken}`)
				.send(updatedSensor);

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty("name", "InsufficientRightsError");
		});

		it("should return 401 when no token provided", async () => {
			const response = await request(app)
				.patch(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors/${updatedSensor.macAddress}`,
				)
				.send({ name: "No Auth Update" });

			expect(response.status).toBe(401);
		});

		it("should return 400 when invalid sensor data provided", async () => {
			const invalidUpdate = {
				macAddress: "", // Invalid empty MAC
				name: "Invalid Update",
			};

			const response = await request(app)
				.patch(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors/${updatedSensor.macAddress}`,
				)
				.set("Authorization", `Bearer ${adminToken}`)
				.send(invalidUpdate);

			expect(response.status).toBe(400);
		});

		it("should return 404 when sensor does not exist", async () => {
			const response = await request(app)
				.patch(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors/99:99:99:99:99:99`,
				)
				.set("Authorization", `Bearer ${adminToken}`)
				.send({ name: "Non-existent Update" });

			expect(response.status).toBe(404);
		});

		it("should return 409 when updating to existing MAC address", async () => {
			// Create another sensor to test conflict
			const anotherSensor = {
				macAddress: "AA:AA:BB:BB:CC:CC",
				name: "Another Sensor",
				description: "Another test sensor",
				variable: "light",
				unit: "lux",
			};

			await request(app)
				.post(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors`,
				)
				.set("Authorization", `Bearer ${adminToken}`)
				.send(anotherSensor);

			// Try to update with existing MAC
			const conflictUpdate = {
				...anotherSensor,
				macAddress: updatedSensor.macAddress, // Existing MAC
			};

			const response = await request(app)
				.patch(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors/${anotherSensor.macAddress}`,
				)
				.set("Authorization", `Bearer ${adminToken}`)
				.send(conflictUpdate);

			expect(response.status).toBe(409);
		});
	});

	describe("DELETE /networks/:networkCode/gateways/:gatewayMac/sensors/:sensorMac", () => {
		const sensorToDelete = {
			macAddress: "DE:LE:TE:ME:00:01",
			name: "Delete Me",
			description: "Sensor to be deleted",
			variable: "sound",
			unit: "dB",
		};

		beforeEach(async () => {
			// Create sensor to delete
			await request(app)
				.post(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors`,
				)
				.set("Authorization", `Bearer ${adminToken}`)
				.send(sensorToDelete);
		});

		it("should return 204 when sensor deleted successfully and user is admin", async () => {
			const response = await request(app)
				.delete(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors/${sensorToDelete.macAddress}`,
				)
				.set("Authorization", `Bearer ${adminToken}`);

			expect(response.status).toBe(204);

			// Verify deletion
			const getResponse = await request(app)
				.get(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors/${sensorToDelete.macAddress}`,
				)
				.set("Authorization", `Bearer ${adminToken}`);

			expect(getResponse.status).toBe(404);
		});

		it("should return 204 when sensor deleted successfully and user is operator", async () => {
			const response = await request(app)
				.delete(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors/${sensorToDelete.macAddress}`,
				)
				.set("Authorization", `Bearer ${operatorToken}`);

			expect(response.status).toBe(204);

			// Verify deletion
			const getResponse = await request(app)
				.get(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors/${sensorToDelete.macAddress}`,
				)
				.set("Authorization", `Bearer ${operatorToken}`);

			expect(getResponse.status).toBe(404);
		});

		it("should return 403 when the user is viewer", async () => {
			const response = await request(app)
				.delete(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors/${sensorToDelete.macAddress}`,
				)
				.set("Authorization", `Bearer ${viewerToken}`);

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty("name", "InsufficientRightsError");
		});

		it("should return 401 when no token provided", async () => {
			const response = await request(app).delete(
				`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors/${sensorToDelete.macAddress}`,
			);

			expect(response.status).toBe(401);
		});

		it("should return 404 when network does not exist", async () => {
			const response = await request(app)
				.delete(
					`/api/v1/networks/NONEXISTENT/gateways/${testGateway.macAddress}/sensors/${sensorToDelete.macAddress}`,
				)
				.set("Authorization", `Bearer ${adminToken}`);

			expect(response.status).toBe(404);
		});

		it("should return 404 when gateway does not exist", async () => {
			const response = await request(app)
				.delete(
					`/api/v1/networks/${testNetwork.code}/gateways/FF:FF:FF:FF:FF:FF/sensors/${sensorToDelete.macAddress}`,
				)
				.set("Authorization", `Bearer ${adminToken}`);

			expect(response.status).toBe(404);
		});

		it("should return 404 when sensor does not exist", async () => {
			const response = await request(app)
				.delete(
					`/api/v1/networks/${testNetwork.code}/gateways/${testGateway.macAddress}/sensors/99:99:99:99:99:99`,
				)
				.set("Authorization", `Bearer ${adminToken}`);

			expect(response.status).toBe(404);
		});
	});
});
