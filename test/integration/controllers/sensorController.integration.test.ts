import * as sensorController from "@controllers/sensorController";
import * as networkController from "@controllers/networkController";
import * as gatewayController from "@controllers/gatewayController";
import type { NetworkDAO } from "@models/dao/NetworkDAO";
import type { GatewayDAO } from "@models/dao/GatewayDAO";
import type { SensorDAO } from "@models/dao/SensorDAO";
import type { Sensor as SensorDTO } from "@dto/Sensor";
import { NotFoundError } from "@models/errors/NotFoundError";
import { ConflictError } from "@models/errors/ConflictError";

jest.mock("@repositories/SensorRepository", () => ({
	SensorRepository: jest.fn().mockImplementation(() => ({
		getAllSensorsOfNetwork: jest.fn(),
		getAllSensorsOfGateway: jest.fn(),
		getSensorByMac: jest.fn(),
		createSensor: jest.fn(),
		updateSensor: jest.fn(),
		deleteSensor: jest.fn(),
	})),
}));

// Mocking the network and gateway controllers because they
// are used in the existenceService functions used by sensorController.
jest.mock("@controllers/networkController");
jest.mock("@controllers/gatewayController");

describe("SensorController Integration Tests", () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("getAllSensorsOfNetwork", () => {
		it("should return all sensors of a network", async () => {
			// Create fake network
			const fakeNetworkDAO: NetworkDAO = {
				id: 1,
				code: "NET001",
				name: "Test Network",
				description: "A test network",
				gateways: [],
			};

			// Create fake gateways
			const fakeGatewayDAO: GatewayDAO = {
				id: 1,
				macAddress: "AA:BB:CC:DD:EE:01",
				name: "Gateway 1",
				description: "First test gateway",
				network: fakeNetworkDAO,
				sensors: [],
			};

			// Create fake sensors
			const fakeSensorDAOs: SensorDAO[] = [
				{
					id: 1,
					macAddress: "11:22:33:44:55:01",
					name: "Temperature Sensor 1",
					description: "Measures temperature",
					variable: "temperature",
					unit: "°C",
					gateway: fakeGatewayDAO,
					measurements: [],
				},
				{
					id: 2,
					macAddress: "11:22:33:44:55:02",
					name: "Humidity Sensor 1",
					description: "Measures humidity",
					variable: "humidity",
					unit: "%",
					gateway: fakeGatewayDAO,
					measurements: [],
				},
			];

			const expectedDTOs: SensorDTO[] = fakeSensorDAOs.map(
				(sensor) =>
					({
						macAddress: sensor.macAddress,
						name: sensor.name,
						description: sensor.description,
						variable: sensor.variable,
						unit: sensor.unit,
					}) as SensorDTO,
			);

			// Mocking the sensorController exported repo instance to use the mocked repository.
			const mockedGetAllSensorsOfNetwork = jest
				.fn()
				.mockResolvedValue(fakeSensorDAOs);

			// biome-ignore lint/suspicious/noExplicitAny: Need to cast it because it's
			(sensorController as any).sensorRepo = {
				getAllSensorsOfNetwork: mockedGetAllSensorsOfNetwork,
			};

			// Mocking the existenceService functions.
			(networkController.getNetworkByCode as jest.Mock).mockResolvedValue(
				undefined,
			);

			(gatewayController.getGatewayByMac as jest.Mock).mockResolvedValue(
				undefined,
			);

			const sensors = await sensorController.getAllSensorsOfNetwork(
				fakeNetworkDAO.code,
			);

			expect(sensors).toEqual(expectedDTOs);
			// Need to check if the mocked function was called with the correct params.
			expect(mockedGetAllSensorsOfNetwork).toHaveBeenCalledWith(
				fakeNetworkDAO.code,
			);

			expect(sensors).toHaveLength(2);
			expect(sensors[0]).toHaveProperty("macAddress");
			expect(sensors[0]).not.toHaveProperty("id");
		});

		it("should throw an error if the network does not exist", async () => {
			// Mocking the existenceService functions to simulate network not found
			(networkController.getNetworkByCode as jest.Mock).mockRejectedValue(
				new NotFoundError("Network not found"),
			);
			(gatewayController.getGatewayByMac as jest.Mock).mockResolvedValue(
				undefined,
			);

			await expect(
				sensorController.getAllSensorsOfNetwork("NONEXISTENT"),
			).rejects.toThrow();
		});

		it("should return an empty array if no sensors exist for the network", async () => {
			const fakeNetworkDAO: NetworkDAO = {
				id: 1,
				code: "NET001",
				name: "Test Network",
				description: "A test network",
				gateways: [],
			};

			// Mock repository to return empty array
			const mockedGetAllSensorsOfNetwork = jest.fn().mockResolvedValue([]);

			// biome-ignore lint/suspicious/noExplicitAny: Need to cast it because it's readonly.
			(sensorController as any).sensorRepo = {
				getAllSensorsOfNetwork: mockedGetAllSensorsOfNetwork,
			};

			// Mocking the existenceService functions
			(networkController.getNetworkByCode as jest.Mock).mockResolvedValue(
				undefined,
			);
			(gatewayController.getGatewayByMac as jest.Mock).mockResolvedValue(
				undefined,
			);

			const sensors = await sensorController.getAllSensorsOfNetwork(
				fakeNetworkDAO.code,
			);

			expect(sensors).toEqual([]);
			expect(sensors).toHaveLength(0);
			expect(mockedGetAllSensorsOfNetwork).toHaveBeenCalledWith(
				fakeNetworkDAO.code,
			);
		});
	});

	describe("getAllSensorsOfGateway", () => {
		it("should return all sensors of a gateway", async () => {
			const fakeNetworkDAO: NetworkDAO = {
				id: 1,
				code: "NET001",
				name: "Test Network",
				description: "A test network",
				gateways: [],
			};

			const fakeGatewayDAO: GatewayDAO = {
				id: 1,
				macAddress: "AA:BB:CC:DD:EE:01",
				name: "Gateway 1",
				description: "First test gateway",
				network: fakeNetworkDAO,
				sensors: [],
			};

			const fakeSensorDAOs: SensorDAO[] = [
				{
					id: 1,
					macAddress: "11:22:33:44:55:01",
					name: "Temperature Sensor 1",
					description: "Measures temperature",
					variable: "temperature",
					unit: "°C",
					gateway: fakeGatewayDAO,
					measurements: [],
				},
			];

			const expectedDTOs: SensorDTO[] = fakeSensorDAOs.map(
				(sensor) =>
					({
						macAddress: sensor.macAddress,
						name: sensor.name,
						description: sensor.description,
						variable: sensor.variable,
						unit: sensor.unit,
					}) as SensorDTO,
			);

			const mockedGetAllSensorsOfGateway = jest
				.fn()
				.mockResolvedValue(fakeSensorDAOs);

			// biome-ignore lint/suspicious/noExplicitAny: Need to cast it because it's readonly.
			(sensorController as any).sensorRepo = {
				getAllSensorsOfGateway: mockedGetAllSensorsOfGateway,
			};

			(networkController.getNetworkByCode as jest.Mock).mockResolvedValue(
				fakeNetworkDAO,
			);
			(gatewayController.getGatewayByMac as jest.Mock).mockResolvedValue(
				fakeGatewayDAO,
			);

			const sensors = await sensorController.getAllSensorsOfGateway(
				fakeNetworkDAO.code,
				fakeGatewayDAO.macAddress,
			);

			expect(sensors).toEqual(expectedDTOs);
			expect(mockedGetAllSensorsOfGateway).toHaveBeenCalledWith(
				fakeGatewayDAO.macAddress,
			);
			expect(sensors).toHaveLength(1);
		});

		it("should throw an error if the network does not exist", async () => {
			// Mocking the existenceService functions to simulate network not found
			(networkController.getNetworkByCode as jest.Mock).mockRejectedValue(
				new NotFoundError("Network not found"),
			);
			(gatewayController.getGatewayByMac as jest.Mock).mockResolvedValue(
				undefined,
			);

			await expect(
				sensorController.getAllSensorsOfGateway(
					"NONEXISTENT",
					"AA:BB:CC:DD:EE:01",
				),
			).rejects.toThrow();
		});

		it("should throw an error if the gateway does not exist", async () => {
			const fakeNetworkDAO: NetworkDAO = {
				id: 1,
				code: "NET001",
				name: "Test Network",
				description: "A test network",
				gateways: [],
			};

			// Mocking the existenceService functions to simulate gateway not found
			(networkController.getNetworkByCode as jest.Mock).mockResolvedValue(
				fakeNetworkDAO,
			);
			(gatewayController.getGatewayByMac as jest.Mock).mockRejectedValue(
				new NotFoundError("Gateway not found"),
			);

			await expect(
				sensorController.getAllSensorsOfGateway(
					fakeNetworkDAO.code,
					"NONEXISTENT_MAC",
				),
			).rejects.toThrow();
		});

		it("should return an empty array if no sensors exist for the gateway", async () => {
			const fakeNetworkDAO: NetworkDAO = {
				id: 1,
				code: "NET001",
				name: "Test Network",
				description: "A test network",
				gateways: [],
			};

			const fakeGatewayDAO: GatewayDAO = {
				id: 1,
				macAddress: "AA:BB:CC:DD:EE:01",
				name: "Gateway 1",
				description: "First test gateway",
				network: fakeNetworkDAO,
				sensors: [],
			};

			const mockedGetAllSensorsOfGateway = jest.fn().mockResolvedValue([]);

			// biome-ignore lint/suspicious/noExplicitAny: Need to cast it because it's readonly.
			(sensorController as any).sensorRepo = {
				getAllSensorsOfGateway: mockedGetAllSensorsOfGateway,
			};

			(networkController.getNetworkByCode as jest.Mock).mockResolvedValue(
				fakeNetworkDAO,
			);
			(gatewayController.getGatewayByMac as jest.Mock).mockResolvedValue(
				fakeGatewayDAO,
			);

			const sensors = await sensorController.getAllSensorsOfGateway(
				fakeNetworkDAO.code,
				fakeGatewayDAO.macAddress,
			);

			expect(sensors).toEqual([]);
			expect(sensors).toHaveLength(0);
			expect(mockedGetAllSensorsOfGateway).toHaveBeenCalledWith(
				fakeGatewayDAO.macAddress,
			);
		});
	});

	describe("getSensorByMac", () => {
		it("should return a sensor by MAC address", async () => {
			const fakeNetworkDAO: NetworkDAO = {
				id: 1,
				code: "NET001",
				name: "Test Network",
				description: "A test network",
				gateways: [],
			};

			const fakeGatewayDAO: GatewayDAO = {
				id: 1,
				macAddress: "AA:BB:CC:DD:EE:01",
				name: "Gateway 1",
				description: "First test gateway",
				network: fakeNetworkDAO,
				sensors: [],
			};

			const fakeSensorDAO: SensorDAO = {
				id: 1,
				macAddress: "11:22:33:44:55:01",
				name: "Temperature Sensor 1",
				description: "Measures temperature",
				variable: "temperature",
				unit: "°C",
				gateway: fakeGatewayDAO,
				measurements: [],
			};

			const expectedDTO: SensorDTO = {
				macAddress: fakeSensorDAO.macAddress,
				name: fakeSensorDAO.name,
				description: fakeSensorDAO.description,
				variable: fakeSensorDAO.variable,
				unit: fakeSensorDAO.unit,
			};

			const mockedGetSensorByMac = jest.fn().mockResolvedValue(fakeSensorDAO);

			// biome-ignore lint/suspicious/noExplicitAny: Need to cast it because it's readonly.
			(sensorController as any).sensorRepo = {
				getSensorByMac: mockedGetSensorByMac,
			};

			(networkController.getNetworkByCode as jest.Mock).mockResolvedValue(
				fakeNetworkDAO,
			);
			(gatewayController.getGatewayByMac as jest.Mock).mockResolvedValue(
				fakeGatewayDAO,
			);

			const sensor = await sensorController.getSensorByMac(
				fakeNetworkDAO.code,
				fakeGatewayDAO.macAddress,
				fakeSensorDAO.macAddress,
			);

			expect(sensor).toEqual(expectedDTO);
			expect(mockedGetSensorByMac).toHaveBeenCalledWith(
				fakeSensorDAO.macAddress,
			);
		});

		it("should throw an error if the network does not exist", async () => {
			// Mocking the existenceService functions to simulate network not found
			(networkController.getNetworkByCode as jest.Mock).mockRejectedValue(
				new NotFoundError("Network not found"),
			);
			(gatewayController.getGatewayByMac as jest.Mock).mockResolvedValue(
				undefined,
			);

			await expect(
				sensorController.getSensorByMac(
					"NONEXISTENT",
					"AA:BB:CC:DD:EE:01",
					"11:22:33:44:55:01",
				),
			).rejects.toThrow();
		});

		it("should throw an error if the gateway does not exist", async () => {
			const fakeNetworkDAO: NetworkDAO = {
				id: 1,
				code: "NET001",
				name: "Test Network",
				description: "A test network",
				gateways: [],
			};

			// Mocking the existenceService functions to simulate gateway not found
			(networkController.getNetworkByCode as jest.Mock).mockResolvedValue(
				fakeNetworkDAO,
			);
			(gatewayController.getGatewayByMac as jest.Mock).mockRejectedValue(
				new NotFoundError("Gateway not found"),
			);

			await expect(
				sensorController.getSensorByMac(
					fakeNetworkDAO.code,
					"NONEXISTENT",
					"11:22:33:44:55:01",
				),
			).rejects.toThrow();
		});

		it("should throw an error if the sensor does not exist", async () => {
			const fakeNetworkDAO: NetworkDAO = {
				id: 1,
				code: "NET001",
				name: "Test Network",
				description: "A test network",
				gateways: [],
			};

			const fakeGatewayDAO: GatewayDAO = {
				id: 1,
				macAddress: "AA:BB:CC:DD:EE:01",
				name: "Gateway 1",
				description: "First test gateway",
				network: fakeNetworkDAO,
				sensors: [],
			};

			// Mocking the existenceService functions to simulate sensor not found
			(networkController.getNetworkByCode as jest.Mock).mockResolvedValue(
				fakeNetworkDAO,
			);
			(gatewayController.getGatewayByMac as jest.Mock).mockResolvedValue(
				fakeGatewayDAO,
			);

			// Mocking the sensorRepo to throw an error when trying to get a non-existent sensor
			// biome-ignore lint/suspicious/noExplicitAny: Need to cast it because it's readonly.
			(sensorController as any).sensorRepo.getSensorByMac = jest
				.fn()
				.mockRejectedValue(new NotFoundError("Sensor not found"));

			// Attempting to get a sensor that does not exist
			await expect(
				sensorController.getSensorByMac(
					fakeNetworkDAO.code,
					fakeGatewayDAO.macAddress,
					"NONEXISTENT",
				),
			).rejects.toThrow();
		});
	});

	describe("createSensor", () => {
		it("should create a sensor", async () => {
			const fakeNetworkDAO: NetworkDAO = {
				id: 1,
				code: "NET001",
				name: "Test Network",
				description: "A test network",
				gateways: [],
			};

			const fakeGatewayDAO: GatewayDAO = {
				id: 1,
				macAddress: "AA:BB:CC:DD:EE:01",
				name: "Gateway 1",
				description: "First test gateway",
				network: fakeNetworkDAO,
				sensors: [],
			};

			const sensorDTO: SensorDTO = {
				macAddress: "11:22:33:44:55:01",
				name: "Temperature Sensor 1",
				description: "Measures temperature",
				variable: "temperature",
				unit: "°C",
			};

			const mockedCreateSensor = jest.fn().mockResolvedValue(undefined);

			// biome-ignore lint/suspicious/noExplicitAny: Need to cast it because it's readonly.
			(sensorController as any).sensorRepo = {
				createSensor: mockedCreateSensor,
			};

			(networkController.getNetworkByCode as jest.Mock).mockResolvedValue(
				fakeNetworkDAO,
			);
			(gatewayController.getGatewayByMac as jest.Mock).mockResolvedValue(
				fakeGatewayDAO,
			);

			await sensorController.createSensor(
				fakeNetworkDAO.code,
				fakeGatewayDAO.macAddress,
				sensorDTO,
			);

			expect(mockedCreateSensor).toHaveBeenCalledWith(
				fakeGatewayDAO.macAddress,
				sensorDTO,
			);
		});

		it("should throw an error if the network does not exist", async () => {
			// Mocking the existenceService functions to simulate network not found
			(networkController.getNetworkByCode as jest.Mock).mockRejectedValue(
				new NotFoundError("Network not found"),
			);
			(gatewayController.getGatewayByMac as jest.Mock).mockResolvedValue(
				undefined,
			);

			const sensorDTO: SensorDTO = {
				macAddress: "11:22:33:44:55:01",
				name: "Temperature Sensor 1",
				description: "Measures temperature",
				variable: "temperature",
				unit: "°C",
			};

			await expect(
				sensorController.createSensor(
					"NONEXISTENT",
					"AA:BB:CC:DD:EE:01",
					sensorDTO,
				),
			).rejects.toThrow();
		});

		it("should throw an error if the gateway does not exist", async () => {
			const fakeNetworkDAO: NetworkDAO = {
				id: 1,
				code: "NET001",
				name: "Test Network",
				description: "A test network",
				gateways: [],
			};

			// Mocking the existenceService functions to simulate gateway not found
			(networkController.getNetworkByCode as jest.Mock).mockResolvedValue(
				fakeNetworkDAO,
			);
			(gatewayController.getGatewayByMac as jest.Mock).mockRejectedValue(
				new NotFoundError("Gateway not found"),
			);

			const sensorDTO: SensorDTO = {
				macAddress: "11:22:33:44:55:01",
				name: "Temperature Sensor 1",
				description: "Measures temperature",
				variable: "temperature",
				unit: "°C",
			};

			await expect(
				sensorController.createSensor(
					fakeNetworkDAO.code,
					"NONEXISTENT_MAC",
					sensorDTO,
				),
			).rejects.toThrow();
		});

		it("should throw an error if the sensor already exists", async () => {
			const fakeNetworkDAO: NetworkDAO = {
				id: 1,
				code: "NET001",
				name: "Test Network",
				description: "A test network",
				gateways: [],
			};

			const fakeGatewayDAO: GatewayDAO = {
				id: 1,
				macAddress: "AA:BB:CC:DD:EE:01",
				name: "Gateway 1",
				description: "First test gateway",
				network: fakeNetworkDAO,
				sensors: [],
			};

			const sensorDTO: SensorDTO = {
				macAddress: "11:22:33:44:55:01",
				name: "Temperature Sensor 1",
				description: "Measures temperature",
				variable: "temperature",
				unit: "°C",
			};

			// Mocking the sensorRepo to throw an error when trying to create an existing sensor
			// biome-ignore lint/suspicious/noExplicitAny: Need to cast it because it's readonly.
			(sensorController as any).sensorRepo.createSensor = jest
				.fn()
				.mockRejectedValue(new ConflictError("Sensor already exists"));

			(networkController.getNetworkByCode as jest.Mock).mockResolvedValue(
				fakeNetworkDAO,
			);
			(gatewayController.getGatewayByMac as jest.Mock).mockResolvedValue(
				fakeGatewayDAO,
			);

			await expect(
				sensorController.createSensor(
					fakeNetworkDAO.code,
					fakeGatewayDAO.macAddress,
					sensorDTO,
				),
			).rejects.toThrow("Sensor already exists");
		});
	});

	describe("updateSensor", () => {
		it("should update a sensor", async () => {
			const fakeNetworkDAO: NetworkDAO = {
				id: 1,
				code: "NET001",
				name: "Test Network",
				description: "A test network",
				gateways: [],
			};

			const fakeGatewayDAO: GatewayDAO = {
				id: 1,
				macAddress: "AA:BB:CC:DD:EE:01",
				name: "Gateway 1",
				description: "First test gateway",
				network: fakeNetworkDAO,
				sensors: [],
			};

			const updatedSensorDTO: SensorDTO = {
				macAddress: "11:22:33:44:55:01",
				name: "Updated Temperature Sensor",
				description: "Updated description",
				variable: "temperature",
				unit: "°C",
			};

			const mockedUpdateSensor = jest.fn().mockResolvedValue(undefined);

			// biome-ignore lint/suspicious/noExplicitAny: Need to cast it because it's readonly.
			(sensorController as any).sensorRepo = {
				updateSensor: mockedUpdateSensor,
			};

			(networkController.getNetworkByCode as jest.Mock).mockResolvedValue(
				fakeNetworkDAO,
			);
			(gatewayController.getGatewayByMac as jest.Mock).mockResolvedValue(
				fakeGatewayDAO,
			);

			await sensorController.updateSensor(
				fakeNetworkDAO.code,
				fakeGatewayDAO.macAddress,
				updatedSensorDTO.macAddress,
				updatedSensorDTO,
			);

			expect(mockedUpdateSensor).toHaveBeenCalledWith(
				updatedSensorDTO.macAddress,
				updatedSensorDTO,
			);
		});

		it("should throw an error if the network does not exist", async () => {
			// Mocking the existenceService functions to simulate network not found
			(networkController.getNetworkByCode as jest.Mock).mockRejectedValue(
				new NotFoundError("Network not found"),
			);
			(gatewayController.getGatewayByMac as jest.Mock).mockResolvedValue(
				undefined,
			);

			const updatedSensorDTO: SensorDTO = {
				macAddress: "11:22:33:44:55:01",
				name: "Updated Temperature Sensor",
				description: "Updated description",
				variable: "temperature",
				unit: "°C",
			};

			await expect(
				sensorController.updateSensor(
					"NONEXISTENT",
					"AA:BB:CC:DD:EE:01",
					updatedSensorDTO.macAddress,
					updatedSensorDTO,
				),
			).rejects.toThrow();
		});

		it("should throw an error if the gateway does not exist", async () => {
			const fakeNetworkDAO: NetworkDAO = {
				id: 1,
				code: "NET001",
				name: "Test Network",
				description: "A test network",
				gateways: [],
			};

			// Mocking the existenceService functions to simulate gateway not found
			(networkController.getNetworkByCode as jest.Mock).mockResolvedValue(
				fakeNetworkDAO,
			);
			(gatewayController.getGatewayByMac as jest.Mock).mockRejectedValue(
				new NotFoundError("Gateway not found"),
			);

			const updatedSensorDTO: SensorDTO = {
				macAddress: "11:22:33:44:55:01",
				name: "Updated Temperature Sensor",
				description: "Updated description",
				variable: "temperature",
				unit: "°C",
			};

			await expect(
				sensorController.updateSensor(
					fakeNetworkDAO.code,
					"NONEXISTENT_MAC",
					updatedSensorDTO.macAddress,
					updatedSensorDTO,
				),
			).rejects.toThrow();
		});

		it("should throw an error if the sensor does not exist", async () => {
			const fakeNetworkDAO: NetworkDAO = {
				id: 1,
				code: "NET001",
				name: "Test Network",
				description: "A test network",
				gateways: [],
			};

			const fakeGatewayDAO: GatewayDAO = {
				id: 1,
				macAddress: "AA:BB:CC:DD:EE:01",
				name: "Gateway 1",
				description: "First test gateway",
				network: fakeNetworkDAO,
				sensors: [],
			};

			// Mocking the existenceService functions to simulate sensor not found
			(networkController.getNetworkByCode as jest.Mock).mockResolvedValue(
				fakeNetworkDAO,
			);
			(gatewayController.getGatewayByMac as jest.Mock).mockResolvedValue(
				fakeGatewayDAO,
			);

			// Mocking the sensorRepo to throw an error when trying to update a non-existent sensor
			// biome-ignore lint/suspicious/noExplicitAny: Need to cast it because it's readonly.
			(sensorController as any).sensorRepo.updateSensor = jest
				.fn()
				.mockRejectedValue(new NotFoundError("Sensor not found"));

			const updatedSensorDTO: SensorDTO = {
				macAddress: "11:22:33:44:55:01",
				name: "Updated Temperature Sensor",
				description: "Updated description",
				variable: "temperature",
				unit: "°C",
			};

			await expect(
				sensorController.updateSensor(
					fakeNetworkDAO.code,
					fakeGatewayDAO.macAddress,
					"NONEXISTENT_MAC",
					updatedSensorDTO,
				),
			).rejects.toThrow();
		});
	});

	describe("deleteSensor", () => {
		it("should delete a sensor", async () => {
			const fakeNetworkDAO: NetworkDAO = {
				id: 1,
				code: "NET001",
				name: "Test Network",
				description: "A test network",
				gateways: [],
			};

			const fakeGatewayDAO: GatewayDAO = {
				id: 1,
				macAddress: "AA:BB:CC:DD:EE:01",
				name: "Gateway 1",
				description: "First test gateway",
				network: fakeNetworkDAO,
				sensors: [],
			};

			const sensorMac = "11:22:33:44:55:01";

			const mockedDeleteSensor = jest.fn().mockResolvedValue(undefined);

			// biome-ignore lint/suspicious/noExplicitAny: Need to cast it because it's readonly.
			(sensorController as any).sensorRepo = {
				deleteSensor: mockedDeleteSensor,
			};

			(networkController.getNetworkByCode as jest.Mock).mockResolvedValue(
				fakeNetworkDAO,
			);
			(gatewayController.getGatewayByMac as jest.Mock).mockResolvedValue(
				fakeGatewayDAO,
			);

			await sensorController.deleteSensor(
				fakeNetworkDAO.code,
				fakeGatewayDAO.macAddress,
				sensorMac,
			);

			expect(mockedDeleteSensor).toHaveBeenCalledWith(sensorMac);
		});

		it("should throw an error if the network does not exist", async () => {
			// Mocking the existenceService functions to simulate network not found
			(networkController.getNetworkByCode as jest.Mock).mockRejectedValue(
				new NotFoundError("Network not found"),
			);
			(gatewayController.getGatewayByMac as jest.Mock).mockResolvedValue(
				undefined,
			);

			await expect(
				sensorController.deleteSensor(
					"NONEXISTENT",
					"AA:BB:CC:DD:EE:01",
					"11:22:33:44:55:01",
				),
			).rejects.toThrow();
		});

		it("should throw an error if the gateway does not exist", async () => {
			const fakeNetworkDAO: NetworkDAO = {
				id: 1,
				code: "NET001",
				name: "Test Network",
				description: "A test network",
				gateways: [],
			};

			// Mocking the existenceService functions to simulate gateway not found
			(networkController.getNetworkByCode as jest.Mock).mockResolvedValue(
				fakeNetworkDAO,
			);
			(gatewayController.getGatewayByMac as jest.Mock).mockRejectedValue(
				new NotFoundError("Gateway not found"),
			);

			await expect(
				sensorController.deleteSensor(
					fakeNetworkDAO.code,
					"NONEXISTENT_MAC",
					"11:22:33:44:55:01",
				),
			).rejects.toThrow();
		});

		it("should throw an error if the sensor does not exist", async () => {
			const fakeNetworkDAO: NetworkDAO = {
				id: 1,
				code: "NET001",
				name: "Test Network",
				description: "A test network",
				gateways: [],
			};

			const fakeGatewayDAO: GatewayDAO = {
				id: 1,
				macAddress: "AA:BB:CC:DD:EE:01",
				name: "Gateway 1",
				description: "First test gateway",
				network: fakeNetworkDAO,
				sensors: [],
			};

			// Mocking the existenceService functions to simulate sensor not found
			(networkController.getNetworkByCode as jest.Mock).mockResolvedValue(
				fakeNetworkDAO,
			);
			(gatewayController.getGatewayByMac as jest.Mock).mockResolvedValue(
				fakeGatewayDAO,
			);

			// Mocking the sensorRepo to throw an error when trying to delete a non-existent sensor
			// biome-ignore lint/suspicious/noExplicitAny: Need to cast it because it's readonly.
			(sensorController as any).sensorRepo.deleteSensor = jest
				.fn()
				.mockRejectedValue(new NotFoundError("Sensor not found"));

			await expect(
				sensorController.deleteSensor(
					fakeNetworkDAO.code,
					fakeGatewayDAO.macAddress,
					"NONEXISTENT_MAC",
				),
			).rejects.toThrow();
		});
	});
});
