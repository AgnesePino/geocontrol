import * as gatewayController from "@controllers/gatewayController";
import { GatewayRepository } from "@repositories/GatewayRepository";
import * as networkController from "@controllers/networkController";
import type { GatewayDAO } from "@models/dao/GatewayDAO";
import { NotFoundError } from "@models/errors/NotFoundError";

jest.mock("@repositories/GatewayRepository", () => {
	return {
		GatewayRepository: jest.fn().mockImplementation(() => ({
			getAllGateways: jest.fn(),
			createGateway: jest.fn(),
			getGatewayByMac: jest.fn(),
			updateGateway: jest.fn(),
			deleteGateway: jest.fn(),
		})),
	};
});
jest.mock("@controllers/networkController");

describe("GatewayController integration", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.resetAllMocks();
	});

	it("getGatewayByMac: mapperService integration", async () => {
		const fakeGatewayDAO: GatewayDAO = {
			id: 1,
			macAddress: "00:11:22:33:44:55",
			name: "Test Gateway",
			description: "A gateway for tests",
			network: {
				code: "NET123",
				name: "Test Network",
				description: "Sample Network",
				id: 1,
				gateways: [],
			},
			sensors: [],
		};

		const expectedDTO = {
			macAddress: "00:11:22:33:44:55",
			name: "Test Gateway",
			description: "A gateway for tests",
		};

		const mockRepoInstance = {
			getGatewayByMac: jest.fn().mockResolvedValue(fakeGatewayDAO),
		};

		(GatewayRepository as jest.Mock).mockImplementation(() => mockRepoInstance);
		(gatewayController as any).gatewayRepo = mockRepoInstance;

		const result = await gatewayController.getGatewayByMac(
			"NET123",
			"00:11:22:33:44:55",
		);

		expect(result).toEqual(expectedDTO);
	});

	it("getAllGateways: returns mapped list", async () => {
		const fakeDAO: GatewayDAO = {
			id: 1,
			macAddress: "00:11:22:33:44:55",
			name: "Test Gateway",
			description: "A gateway for tests",
			network: {
				code: "NET1",
				name: "Test Network",
				description: "Sample",
				id: 1,
				gateways: [],
			},
			sensors: [],
		};

		const mockRepoInstance = {
			getAllGateways: jest.fn().mockResolvedValue([fakeDAO]),
		};
		(GatewayRepository as jest.Mock).mockImplementation(() => mockRepoInstance);
		(gatewayController as any).gatewayRepo = mockRepoInstance;

		(networkController.getNetworkByCode as jest.Mock).mockResolvedValue({
			code: "NET1",
			name: "Test Network",
			description: "Sample",
			id: 1,
		});

		const result = await gatewayController.getAllGateways("NET1");

		expect(result).toEqual([
			{
				macAddress: fakeDAO.macAddress,
				name: fakeDAO.name,
				description: fakeDAO.description,
			},
		]);

		expect(mockRepoInstance.getAllGateways).toHaveBeenCalledWith("NET1");
	});

	it("getAllGateways: returns mapped list with more elements", async () => {
		const fakeDAO: GatewayDAO = {
			id: 1,
			macAddress: "00:11:22:33:44:55",
			name: "Test Gateway",
			description: "A gateway for tests",
			network: {
				code: "NET1",
				name: "Test Network",
				description: "Sample",
				id: 1,
				gateways: [],
			},
			sensors: [],
		};

		const fakeDAO2: GatewayDAO = {
			id: 1,
			macAddress: "66:77:88:99:AA:BB",
			name: "Another Gateway",
			description: "A second gateway for tests",
			network: {
				code: "NET1",
				name: "Test Network",
				description: "Sample",
				id: 1,
				gateways: [],
			},
			sensors: [],
		};

		const mockRepoInstance = {
			getAllGateways: jest.fn().mockResolvedValue([fakeDAO, fakeDAO2]),
		};
		(GatewayRepository as jest.Mock).mockImplementation(() => mockRepoInstance);
		(gatewayController as any).gatewayRepo = mockRepoInstance;

		(networkController.getNetworkByCode as jest.Mock).mockResolvedValue({
			code: "NET1",
			name: "Test Network",
			description: "Sample",
			id: 1,
		});

		const result = await gatewayController.getAllGateways("NET1");

		expect(result).toEqual([
			{
				macAddress: fakeDAO.macAddress,
				name: fakeDAO.name,
				description: fakeDAO.description,
				// sensors: fakeDAO.sensors,
			},
			{
				macAddress: fakeDAO2.macAddress,
				name: fakeDAO2.name,
				description: fakeDAO2.description,
				// sensors: fakeDAO2.sensors,
			},
		]);

		expect(mockRepoInstance.getAllGateways).toHaveBeenCalledWith("NET1");
	});

	it("getAllGateways: throws error if network not found", async () => {
		(networkController.getNetworkByCode as jest.Mock).mockRejectedValue(
			new NotFoundError("Network not found"),
		);

		await expect(gatewayController.getAllGateways("NET2")).rejects.toThrow(
			"Network not found",
		);

		expect(networkController.getNetworkByCode).toHaveBeenCalledWith("NET2");

		expect(
			(gatewayController as any).gatewayRepo.getAllGateways,
		).not.toHaveBeenCalled();
	});

	it("createGateway: calls repository with correct parameters", async () => {
		const mockRepoInstance = {
			createGateway: jest.fn().mockResolvedValue(undefined),
		};
		(GatewayRepository as jest.Mock).mockImplementation(() => mockRepoInstance);
		(gatewayController as any).gatewayRepo = mockRepoInstance;

		const gatewayDto = {
			macAddress: "00:11:22:33:44:55",
			name: "New Gateway",
			description: "A new gateway",
			sensors: [],
		};

		await gatewayController.createGateway(gatewayDto, "NET1");

		expect(mockRepoInstance.createGateway).toHaveBeenCalledWith(
			gatewayDto.macAddress,
			"NET1",
			gatewayDto.name,
			gatewayDto.description,
		);
	});

	it("getGatewayByMac: calls repository with correct parameters", async () => {
		const mockRepoInstance = {
			getGatewayByMac: jest.fn().mockResolvedValue({
				macAddress: "00:11:22:33:44:55",
				name: "Test Gateway",
				description: "A gateway for tests",
			}),
		};
		(GatewayRepository as jest.Mock).mockImplementation(() => mockRepoInstance);
		(gatewayController as any).gatewayRepo = mockRepoInstance;
		(networkController.getNetworkByCode as jest.Mock).mockResolvedValue({
			code: "NET1",
			name: "Test Network",
			description: "Sample",
			id: 1,
		});
		const result = await gatewayController.getGatewayByMac(
			"NET1",
			"00:11:22:33:44:55",
		);

		expect(mockRepoInstance.getGatewayByMac).toHaveBeenCalledWith(
			"00:11:22:33:44:55",
		);
		expect(result).toEqual({
			macAddress: "00:11:22:33:44:55",
			name: "Test Gateway",
			description: "A gateway for tests",
		});
	});

	it("getGatewayByMac: throws error if network not found", async () => {
		(networkController.getNetworkByCode as jest.Mock).mockRejectedValue(
			new NotFoundError("Network not found"),
		);

		await expect(
			gatewayController.getGatewayByMac("NET2", "00:11:22:33:44:55"),
		).rejects.toThrow("Network not found");

		expect(networkController.getNetworkByCode).toHaveBeenCalledWith("NET2");
		expect(
			(gatewayController as any).gatewayRepo.getGatewayByMac,
		).not.toHaveBeenCalled();
	});

	it("updateGateway: calls repository with correct parameters", async () => {
		const mockRepoInstance = {
			updateGateway: jest.fn().mockResolvedValue(undefined),
		};
		(GatewayRepository as jest.Mock).mockImplementation(() => mockRepoInstance);
		(gatewayController as any).gatewayRepo = mockRepoInstance;

		const updates = {
			name: "Updated Gateway",
			description: "Updated description",
		};

		await gatewayController.updateGateway("NET1", "00:11:22:33:44:55", updates);

		expect(mockRepoInstance.updateGateway).toHaveBeenCalledWith(
			"00:11:22:33:44:55",
			updates,
		);
	});

	it("deleteGateway: calls repository with correct parameters", async () => {
		const mockRepoInstance = {
			deleteGateway: jest.fn().mockResolvedValue(undefined),
		};
		(GatewayRepository as jest.Mock).mockImplementation(() => mockRepoInstance);
		(gatewayController as any).gatewayRepo = mockRepoInstance;

		await gatewayController.deleteGateway("NET1", "00:11:22:33:44:55");

		expect(mockRepoInstance.deleteGateway).toHaveBeenCalledWith(
			"00:11:22:33:44:55",
		);
	});
});
