import { GatewayRepository } from "@repositories/GatewayRepository";
import { GatewayDAO } from "@dao/GatewayDAO";
import { NetworkRepository } from "@repositories/NetworkRepository";
import { throwConflictIfFound, findOrThrowNotFound } from "@utils";
import { ConflictError } from "@models/errors/ConflictError";

const mockFind = jest.fn();
const mockFindOne = jest.fn();
const mockSave = jest.fn();
const mockRemove = jest.fn();
const mockUpdate = jest.fn();

jest.mock("@database", () => ({
	AppDataSource: {
		getRepository: () => ({
			find: mockFind,
			findOne: mockFindOne,
			save: mockSave,
			update: mockUpdate,
			remove: mockRemove,
		})
	}
}));

jest.mock("@repositories/NetworkRepository");
jest.mock("@utils");

describe("GatewayRepository: mocked database", () => {
	const repo = new GatewayRepository();

	beforeEach(() => {
		jest.clearAllMocks();
		jest.resetAllMocks();
		(findOrThrowNotFound as jest.Mock).mockImplementation((result, condition, message) => {
            if (!result || result.length === 0 || !condition()) { // Ora chiamiamo 'condition()'
                throw new Error(message);
            }
            return result[0];
        });
	});

	it("createGateway", async () => {
		const network = { id: "net-id" };
		const savedGateway = { macAddress: "AA:BB:CC", name: "GW", network, description: "description for Gateway" };

		// Mocks
		(NetworkRepository as jest.Mock).mockImplementation(() => ({
			getNetworkByCode: jest.fn().mockResolvedValue(network)
		}));
		mockFind.mockResolvedValue([]); // no existing gateways
		(throwConflictIfFound as jest.Mock).mockImplementation(() => {});
		mockSave.mockResolvedValue(savedGateway);

		await expect(repo.createGateway("AA:BB:CC", "net123", "GW",)).resolves.toBeUndefined();

		expect(mockSave).toHaveBeenCalledWith({
			macAddress: "AA:BB:CC",
			name: "GW",
			network: network,
			description: undefined
		});
	});

	it("createGateway: with undefined name and description", async () => {
        const network = { id: "net-id" };
        const savedGateway = { macAddress: "AA:BB:CC", network, name: undefined, description: undefined };

        // Mocks
        (NetworkRepository as jest.Mock).mockImplementation(() => ({
            getNetworkByCode: jest.fn().mockResolvedValue(network)
        }));
        mockFind.mockResolvedValue([]); // no existing gateways
        (throwConflictIfFound as jest.Mock).mockImplementation(() => {});
        mockSave.mockResolvedValue(savedGateway);

        await expect(repo.createGateway("AA:BB:CC", "net123")).resolves.toBeUndefined();

        expect(mockSave).toHaveBeenCalledWith({
            macAddress: "AA:BB:CC",
            network: network,
			name: undefined,
            description: undefined
        });
    });

	it("createGateway: conflict", async () => {
		const existingGateway = { macAddress: "AA:BB:CC", name: "GW" };
		mockFind.mockResolvedValue([existingGateway]);

		(throwConflictIfFound as jest.Mock).mockImplementation((results, conditionFn, message) => {
			expect(conditionFn()).toBe(true); // <-- questo chiama la funzione () => true
			throw new Error(message);
		});

		await expect(repo.createGateway("AA:BB:CC", "GW", "net123"))
			.rejects.toThrow("Gateway with MAC 'AA:BB:CC' already exists");

		expect(throwConflictIfFound).toHaveBeenCalledWith(
			[existingGateway],
			expect.any(Function),
			"Gateway with MAC 'AA:BB:CC' already exists"
		);
	});

	it("createGateway: invalid MAC address", async () => {
		await expect(repo.createGateway("", "net123"))
			.rejects.toThrow("Invalid MAC address");

		expect(mockSave).not.toHaveBeenCalled();
	});

	it("getGatewayByMac", async () => {
		const foundGateway = { macAddress: "AA:BB:CC", name: "GW" };
		mockFindOne.mockResolvedValue(foundGateway);

		const result = await repo.getGatewayByMac("AA:BB:CC");

		expect(result).toEqual(foundGateway);
		expect(mockFindOne).toHaveBeenCalledWith({
			where: { macAddress: "AA:BB:CC" },
			relations: { sensors: true }
		});
	});

	it("getGatewayByMac: not found", async () => {
		mockFindOne.mockResolvedValue(null);

		await expect(repo.getGatewayByMac("AA:BB:CC"))
			.resolves.toEqual(null);
		expect(findOrThrowNotFound).toHaveBeenCalledWith([null], expect.any(Function), "Gateway with MAC 'AA:BB:CC' not found");
	});

	it("getAllGateways", async () => {
		const gateways = [new GatewayDAO(), new GatewayDAO()];
		mockFind.mockResolvedValue(gateways);

		const result = await repo.getAllGateways("net123");

		expect(mockFind).toHaveBeenCalledWith({
			where: { network: { code: "net123" } },
			relations: { sensors: true }
		});

		expect(result).toBe(gateways);
	});

	it("updateGateway: success", async () => {
		const originalGateway = {
			macAddress: "AA:BB:CC",
			name: "Old Gateway",
			network: { id: "net-id" }
		};
		
		// Simula che il gateway esista già
		mockFindOne.mockResolvedValueOnce(originalGateway); // getGatewayByMac

		const updates = { name: "New Gateway" };
		 
		const updatedGateway = {
			...originalGateway,
			...updates
		};

		mockSave.mockResolvedValue(updatedGateway);
		
		await expect(repo.updateGateway("AA:BB:CC", updates)).resolves.toBeUndefined();

		expect(mockSave).toHaveBeenCalledWith(updatedGateway);
	});

	it("updateGateway: conflict", async () => {
		const existingGateway = { macAddress: "AA:BB:CC", name: "GW", network: { id: "net-id" } };
		mockFindOne.mockResolvedValueOnce(existingGateway); // getGatewayByMac

		const updates = { macAddress: "DD:EE:FF" };

		const updatedGateway = {
			...existingGateway,
			...updates
		};

		mockFindOne.mockResolvedValueOnce(updatedGateway);

		(throwConflictIfFound as jest.Mock).mockImplementation(() => { throw new ConflictError("Gateway with MAC 'DD:EE:FF' already exists"); });

		await expect(repo.updateGateway("AA:BB:CC", updates)).rejects.toThrow("Gateway with MAC 'DD:EE:FF' already exists");

		expect(throwConflictIfFound).toHaveBeenCalledWith([updatedGateway], expect.any(Function), "Gateway with MAC 'DD:EE:FF' already exists");
	});

	it("updateGateway: throws if gateway not found and new macAddress is invalid", async () => {
		mockFindOne.mockResolvedValueOnce(null); // getGatewayByMac returns null

		const updates = { macAddress: "   " }; // Invalid macAddress

		await expect(repo.updateGateway("AA:BB:CC", updates))
			.rejects.toThrow("Invalid MAC address");

		expect(mockSave).not.toHaveBeenCalled();
	});

	it("delete gateway", async () => {
		const gateway = new GatewayDAO();
		gateway.macAddress = "AA:BB:CC";
		gateway.name = "GW";
	
		mockFindOne.mockResolvedValue(gateway);
		mockRemove.mockResolvedValue(undefined);
	
		await expect(repo.deleteGateway("AA:BB:CC"))
			.resolves.toBeUndefined();
	
		expect(mockRemove).toHaveBeenCalledWith(gateway);
	});

	it("deleteGateway: not found", async () => {
		mockFindOne.mockResolvedValue(null); // no gateways found
		mockRemove.mockResolvedValue(undefined);

		await expect(repo.deleteGateway("AA:BB:CC")).resolves.toBeUndefined();

		expect(findOrThrowNotFound).toHaveBeenCalledWith([null], expect.any(Function), "Gateway with MAC 'AA:BB:CC' not found");
	});

});
