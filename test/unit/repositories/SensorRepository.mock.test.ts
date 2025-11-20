import { SensorRepository } from "@repositories/SensorRepository";
import { SensorDAO } from "@models/dao/SensorDAO";
import { GatewayDAO } from "@models/dao/GatewayDAO";
import { NetworkDAO } from "@models/dao/NetworkDAO";
import type { Sensor as SensorDTO } from "@models/dto/Sensor";
import { ConflictError } from "@models/errors/ConflictError";
import { NotFoundError } from "@models/errors/NotFoundError";

const mockFind = jest.fn();
const mockFindOne = jest.fn();
const mockFindOneBy = jest.fn();
const mockCreate = jest.fn();
const mockSave = jest.fn();
const mockUpdate = jest.fn();
const mockRemove = jest.fn();

// Mock the GatewayRepository
const mockGetGatewayByMac = jest.fn();

jest.mock("@repositories/GatewayRepository", () => ({
	GatewayRepository: jest.fn().mockImplementation(() => ({
		getGatewayByMac: mockGetGatewayByMac,
	})),
}));

jest.mock("@database", () => ({
	AppDataSource: {
		getRepository: () => ({
			find: mockFind,
			findOne: mockFindOne,
			findOneBy: mockFindOneBy,
			create: mockCreate,
			save: mockSave,
			update: mockUpdate,
			remove: mockRemove,
		}),
	},
}));

describe("SensorRepository: mocked database", () => {
	const repo = new SensorRepository();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("getAllSensorsOfNetwork", () => {
		it("should return all sensors for a given network", async () => {
			const networkCode = "NET001";
			const mockSensors = [
				createMockSensorDAO("SENSOR001", "Temperature Sensor"),
				createMockSensorDAO("SENSOR002", "Humidity Sensor"),
			];

			mockFind.mockResolvedValue(mockSensors);

			const result = await repo.getAllSensorsOfNetwork(networkCode);

			expect(result).toEqual(mockSensors);
			expect(mockFind).toHaveBeenCalledWith({
				relations: {
					gateway: true,
				},
				where: {
					gateway: {
						network: {
							code: networkCode,
						},
					},
				},
			});
		});

		it("should return empty array when no sensors found for network", async () => {
			const networkCode = "NET999";
			mockFind.mockResolvedValue([]);

			const result = await repo.getAllSensorsOfNetwork(networkCode);

			expect(result).toEqual([]);
			expect(mockFind).toHaveBeenCalledWith({
				relations: {
					gateway: true,
				},
				where: {
					gateway: {
						network: {
							code: networkCode,
						},
					},
				},
			});
		});
	});

	describe("getAllSensorsOfGateway", () => {
		it("should return all sensors for a given gateway", async () => {
			const gatewayMac = "AA:BB:CC:DD:EE:FF";
			const mockSensors = [
				createMockSensorDAO("SENSOR001", "Temperature Sensor"),
				createMockSensorDAO("SENSOR002", "Humidity Sensor"),
			];

			mockFind.mockResolvedValue(mockSensors);

			const result = await repo.getAllSensorsOfGateway(gatewayMac);

			expect(result).toEqual(mockSensors);
			expect(mockFind).toHaveBeenCalledWith({
				relations: {
					gateway: true,
				},
				where: {
					gateway: {
						macAddress: gatewayMac,
					},
				},
			});
		});

		it("should return empty array when no sensors found for gateway", async () => {
			const gatewayMac = "FF:EE:DD:CC:BB:AA";
			mockFind.mockResolvedValue([]);

			const result = await repo.getAllSensorsOfGateway(gatewayMac);

			expect(result).toEqual([]);
		});
	});

	describe("getSensorByMac", () => {
		it("should return sensor when found by MAC address", async () => {
			const sensorMac = "11:22:33:44:55:66";
			const mockSensor = createMockSensorDAO(sensorMac, "Temperature Sensor");

			mockFindOne.mockResolvedValue(mockSensor);

			const result = await repo.getSensorByMac(sensorMac);

			expect(result).toEqual(mockSensor);
			expect(mockFindOne).toHaveBeenCalledWith({
				where: { macAddress: sensorMac },
			});
		});

		it("should throw NotFoundError when sensor not found by MAC address", async () => {
			const sensorMac = "99:88:77:66:55:44";
			mockFindOne.mockResolvedValue(null);

			await expect(repo.getSensorByMac(sensorMac)).rejects.toThrow(
				NotFoundError,
			);
			await expect(repo.getSensorByMac(sensorMac)).rejects.toThrow(
				`Sensor with MAC '${sensorMac}' not found`,
			);
		});
	});

	describe("createSensor", () => {
		it("should create sensor successfully", async () => {
			const gatewayMac = "AA:BB:CC:DD:EE:FF";
			const sensorDTO: SensorDTO = {
				macAddress: "11:22:33:44:55:66",
				name: "Temperature Sensor",
				description: "Measures ambient temperature",
				variable: "temperature",
				unit: "°C",
			};

			const mockGateway = createMockGatewayDAO(gatewayMac);
			const mockCreatedSensor = createMockSensorDAO(
				sensorDTO.macAddress,
				sensorDTO.name,
				sensorDTO.description,
				sensorDTO.variable,
				sensorDTO.unit,
			);

			mockFindOneBy.mockResolvedValue(null); // No existing sensor
			mockGetGatewayByMac.mockResolvedValue(mockGateway);
			mockCreate.mockReturnValue(mockCreatedSensor);
			mockSave.mockResolvedValue(mockCreatedSensor);

			await repo.createSensor(gatewayMac, sensorDTO);

			expect(mockFindOneBy).toHaveBeenCalledWith({
				macAddress: sensorDTO.macAddress,
			});
			expect(mockGetGatewayByMac).toHaveBeenCalledWith(gatewayMac);
			expect(mockCreate).toHaveBeenCalledWith({
				macAddress: sensorDTO.macAddress,
				name: sensorDTO.name,
				description: sensorDTO.description,
				variable: sensorDTO.variable,
				unit: sensorDTO.unit,
				gateway: mockGateway,
			});
			expect(mockSave).toHaveBeenCalledWith(mockCreatedSensor);
		});

		it("should throw ConflictError when sensor with same MAC already exists", async () => {
			const gatewayMac = "AA:BB:CC:DD:EE:FF";
			const sensorDTO: SensorDTO = {
				macAddress: "11:22:33:44:55:66",
				name: "Temperature Sensor",
				description: "Measures ambient temperature",
				variable: "temperature",
				unit: "°C",
			};

			const existingSensor = createMockSensorDAO(
				sensorDTO.macAddress,
				"Existing Sensor",
			);
			mockFindOneBy.mockResolvedValue(existingSensor);

			await expect(repo.createSensor(gatewayMac, sensorDTO)).rejects.toThrow(
				ConflictError,
			);
			await expect(repo.createSensor(gatewayMac, sensorDTO)).rejects.toThrow(
				`A sensor with MAC '${sensorDTO.macAddress}' already exists in the database`,
			);

			expect(mockGetGatewayByMac).not.toHaveBeenCalled();
			expect(mockCreate).not.toHaveBeenCalled();
			expect(mockSave).not.toHaveBeenCalled();
		});
	});

	describe("updateSensor", () => {
		it("should update sensor successfully with same MAC address", async () => {
			const sensorMac = "11:22:33:44:55:66";
			const updatedSensorDTO: SensorDTO = {
				macAddress: sensorMac, // Same MAC
				name: "Updated Temperature Sensor",
				description: "Updated description",
				variable: "temp",
				unit: "K",
			};

			const existingSensor = createMockSensorDAO(sensorMac, "Old Name");
			existingSensor.id = 1;

			mockFindOne.mockResolvedValue(existingSensor);
			mockUpdate.mockResolvedValue({ affected: 1 });

			await repo.updateSensor(sensorMac, updatedSensorDTO);

			expect(mockFindOne).toHaveBeenCalledWith({
				where: { macAddress: sensorMac },
			});
			expect(mockFindOneBy).not.toHaveBeenCalled(); // No MAC conflict check needed
			expect(mockUpdate).toHaveBeenCalledWith(
				existingSensor.id,
				updatedSensorDTO,
			);
		});

		it("should update sensor successfully with different MAC address", async () => {
			const oldSensorMac = "11:22:33:44:55:66";
			const newSensorMac = "99:88:77:66:55:44";
			const updatedSensorDTO: SensorDTO = {
				macAddress: newSensorMac, // Different MAC
				name: "Updated Temperature Sensor",
				description: "Updated description",
				variable: "temp",
				unit: "K",
			};

			const existingSensor = createMockSensorDAO(oldSensorMac, "Old Name");
			existingSensor.id = 1;

			mockFindOne.mockResolvedValue(existingSensor);
			mockFindOneBy.mockResolvedValue(null); // New MAC not in use
			mockUpdate.mockResolvedValue({ affected: 1 });

			await repo.updateSensor(oldSensorMac, updatedSensorDTO);

			expect(mockFindOne).toHaveBeenCalledWith({
				where: { macAddress: oldSensorMac },
			});
			expect(mockFindOneBy).toHaveBeenCalledWith({ macAddress: newSensorMac });
			expect(mockUpdate).toHaveBeenCalledWith(
				existingSensor.id,
				updatedSensorDTO,
			);
		});

		it("should throw NotFoundError when sensor to update does not exist", async () => {
			const sensorMac = "99:88:77:66:55:44";
			const updatedSensorDTO: SensorDTO = {
				macAddress: sensorMac,
				name: "Updated Sensor",
				description: "Updated description",
				variable: "temp",
				unit: "K",
			};

			mockFindOne.mockResolvedValue(null);

			await expect(
				repo.updateSensor(sensorMac, updatedSensorDTO),
			).rejects.toThrow(NotFoundError);

			expect(mockFindOneBy).not.toHaveBeenCalled();
			expect(mockUpdate).not.toHaveBeenCalled();
		});

		it("should throw ConflictError when updating to an existing MAC address", async () => {
			const oldSensorMac = "11:22:33:44:55:66";
			const conflictingMac = "99:88:77:66:55:44";
			const updatedSensorDTO: SensorDTO = {
				macAddress: conflictingMac,
				name: "Updated Sensor",
				description: "Updated description",
				variable: "temp",
				unit: "K",
			};

			const existingSensor = createMockSensorDAO(oldSensorMac, "Old Name");
			const conflictingSensor = createMockSensorDAO(
				conflictingMac,
				"Conflicting Sensor",
			);

			mockFindOne.mockResolvedValue(existingSensor);
			mockFindOneBy.mockResolvedValue(conflictingSensor);

			await expect(
				repo.updateSensor(oldSensorMac, updatedSensorDTO),
			).rejects.toThrow(ConflictError);
			await expect(
				repo.updateSensor(oldSensorMac, updatedSensorDTO),
			).rejects.toThrow(
				`A sensor with MAC '${conflictingMac}' already exists in the database`,
			);

			expect(mockUpdate).not.toHaveBeenCalled();
		});
	});

	describe("deleteSensor", () => {
		it("should delete sensor successfully", async () => {
			const sensorMac = "11:22:33:44:55:66";
			const mockSensor = createMockSensorDAO(sensorMac, "Temperature Sensor");

			mockFindOne.mockResolvedValue(mockSensor);
			mockRemove.mockResolvedValue(mockSensor);

			await repo.deleteSensor(sensorMac);

			expect(mockFindOne).toHaveBeenCalledWith({
				where: { macAddress: sensorMac },
			});
			expect(mockRemove).toHaveBeenCalledWith(mockSensor);
		});

		it("should throw NotFoundError when sensor to delete does not exist", async () => {
			const sensorMac = "99:88:77:66:55:44";

			mockFindOne.mockResolvedValue(null);

			await expect(repo.deleteSensor(sensorMac)).rejects.toThrow(NotFoundError);
			await expect(repo.deleteSensor(sensorMac)).rejects.toThrow(
				`Sensor with MAC '${sensorMac}' not found`,
			);

			expect(mockRemove).not.toHaveBeenCalled();
		});
	});
});

// Helper functions to create mock objects
function createMockSensorDAO(
	macAddress: string,
	name: string,
	description = "Test sensor",
	variable = "temperature",
	unit = "°C",
): SensorDAO {
	const sensor = new SensorDAO();
	sensor.macAddress = macAddress;
	sensor.name = name;
	sensor.description = description;
	sensor.variable = variable;
	sensor.unit = unit;
	sensor.gateway = createMockGatewayDAO("AA:BB:CC:DD:EE:FF");
	return sensor;
}

function createMockGatewayDAO(macAddress: string): GatewayDAO {
	const gateway = new GatewayDAO();
	gateway.macAddress = macAddress;
	gateway.name = "Test Gateway";
	gateway.description = "Test gateway description";
	gateway.network = createMockNetworkDAO("NET001");
	return gateway;
}

function createMockNetworkDAO(code: string): NetworkDAO {
	const network = new NetworkDAO();
	network.code = code;
	network.name = "Test Network";
	network.description = "Test network description";
	return network;
}
