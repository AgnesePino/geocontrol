import { NetworkRepository } from "@repositories/NetworkRepository";
import { NetworkDAO } from "@dao/NetworkDAO";
import { ConflictError } from "@models/errors/ConflictError";
import { NotFoundError } from "@models/errors/NotFoundError";
import AppError from "@models/errors/AppError";

const mockFind = jest.fn();
const mockFindOne = jest.fn();
const mockSave = jest.fn();
const mockRemove = jest.fn();

jest.mock("@database", () => ({
  AppDataSource: {
    getRepository: () => ({
      find: mockFind,
      findOne: mockFindOne,
      save: mockSave,
      remove: mockRemove
    })
  }
}));

describe("NetworkRepository: mocked database", () => {
  const repo = new NetworkRepository();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllNetworks", () => {
      it("should return all networks with gateways and sensors", async () => {
        const mockNetworks = [
          {
            code: "NET01",
            name: "Alp Monitor",
            description: "Alpine Weather Monitoring Network",
            gateways: []
          }
        ];

        mockFind.mockResolvedValue(mockNetworks);

        const result = await repo.getAllNetworks();

        expect(result).toEqual(mockNetworks);
        expect(mockFind).toHaveBeenCalledWith({
          relations: { gateways: { sensors: true } }
        });
      });

      it("should return an empty array if no networks are found", async () => {
        mockFind.mockResolvedValue([]);

        const result = await repo.getAllNetworks();

        expect(result).toEqual([]);
        expect(mockFind).toHaveBeenCalledWith({
          relations: { gateways: { sensors: true } }
        });
      });

      it("should throw an error if the database fails", async () => {
        mockFind.mockRejectedValue(new Error("Database error"));
        await expect(repo.getAllNetworks()).rejects.toThrow("Database error");
      });
    });

  describe("getNetworkByCode", () => {
      it("should return the network with the given code", async () => {
        const found = new NetworkDAO();
        found.code = "NET01";
        found.name = "Main";

        mockFindOne.mockResolvedValue(found);

        const result = await repo.getNetworkByCode("NET01");

        expect(result).toBe(found);
        expect(mockFindOne).toHaveBeenCalledWith({
          where: { code: "NET01" },
          relations: { gateways: { sensors: true } }
        });
      });

      it("should throw NotFoundError if the network does not exist", async () => {
        mockFindOne.mockResolvedValue(null);

        await expect(repo.getNetworkByCode("NOPE")).rejects.toThrow(NotFoundError);
      });
    });

  describe("createNetwork", () => {
      it("should create a network with valid data", async () => {
        mockFind.mockResolvedValue([]);
        await repo.createNetwork("NET02", "NewNet", "A test net");

        expect(mockSave).toHaveBeenCalledWith({
          code: "NET02",
          name: "NewNet",
          description: "A test net"
        });
      });

      it("should throw ConflictError if network with the same code already exists", async () => {
        const net = new NetworkDAO();
        net.code = "NET02";
        mockFind.mockResolvedValue([net]);

        await expect(
          repo.createNetwork("NET02", "DupNet")
        ).rejects.toThrow(ConflictError);
      });

      it("should throw AppError if code is empty", async () => {
        await expect(repo.createNetwork("", "Test")).rejects.toThrow(AppError);
      });

      it("should throw AppError if code contains only spaces", async () => {
        await expect(repo.createNetwork("   ", "Test")).rejects.toThrow(AppError);
      });

      it("should allow empty name and description", async () => {
        mockFind.mockResolvedValue([]);
        await repo.createNetwork("NET99", "", "");

        expect(mockSave).toHaveBeenCalledWith({
          code: "NET99",
          name: "",
          description: ""
        });
      });

      it("should throw AppError if code is undefined", async () => {
        await expect(
          repo.createNetwork(undefined as any, "Test")
        ).rejects.toThrow(AppError);
      });

      it("should throw AppError if code is null", async () => {
        await expect(
          repo.createNetwork(null as any, "Test")
        ).rejects.toThrow(AppError);
      });
  });

  describe("updateNetwork", () => {
      it("should update network with new name and description", async () => {
        const existing = new NetworkDAO();
        existing.code = "NET01";
        existing.name = "Old";

        mockFindOne.mockResolvedValue(existing);
        mockFind.mockResolvedValue([]);

        await repo.updateNetwork("NET01", {
          name: "Updated",
          description: "Now with more features"
        });

        expect(mockSave).toHaveBeenCalledWith({
          ...existing,
          name: "Updated",
          description: "Now with more features"
        });
      });

      it("should throw ConflictError if new code is already used", async () => {
        const existing = new NetworkDAO();
        existing.code = "NET01";

        mockFindOne.mockResolvedValue(existing);
        mockFind.mockResolvedValue([{ code: "NETNEW" }]);

        await expect(
          repo.updateNetwork("NET01", { code: "NETNEW" })
        ).rejects.toThrow(ConflictError);
      });

      it("should throw AppError if new code is invalid (empty)", async () => {
        const existing = new NetworkDAO();
        existing.code = "NET01";

        mockFindOne.mockResolvedValue(existing);

        await expect(
          repo.updateNetwork("NET01", { code: "" })
        ).rejects.toThrow(AppError);
      });

      it("should throw NotFoundError if network does not exist", async () => {
        mockFindOne.mockResolvedValue(null);

        await expect(
          repo.updateNetwork("NET404", { name: "Does not exist" })
        ).rejects.toThrow(NotFoundError);
      });

      it("should call save with existing network if no changes are provided", async () => {
        const existing = new NetworkDAO();
        existing.code = "NET01";
        existing.name = "NoChange";

        mockFindOne.mockResolvedValue(existing);
        mockFind.mockResolvedValue([]);

        await repo.updateNetwork("NET01", {});

        expect(mockSave).toHaveBeenCalledWith(existing);
      });

      it("should update network with new name and code", async () => {
        const existing = new NetworkDAO();
        existing.code = "NET01";
        existing.name = "Old";

        mockFindOne.mockResolvedValue(existing);
        mockFind.mockResolvedValue([]);

        await repo.updateNetwork("NET01", {
          code: "NET02",
          name: "New name"
        });

        expect(mockSave).toHaveBeenCalledWith({
          ...existing,
          code: "NET02",
          name: "New name"
        });
      });

      it("should allow empty name and description", async () => {
        const existing = new NetworkDAO();
        existing.code = "NET01";
        existing.name = "Old";
        existing.description = "Old desc";

        mockFindOne.mockResolvedValue(existing);
        mockFind.mockResolvedValue([]);

        await repo.updateNetwork("NET01", {
          name: "",
          description: ""
        });

        expect(mockSave).toHaveBeenCalledWith({
          ...existing,
          name: "",
          description: ""
        });
      });
  });

  describe("deleteNetwork", () => {
      it("should delete the network if it exists", async () => {
        const net = new NetworkDAO();
        net.code = "NET03";

        mockFindOne.mockResolvedValue(net);
        mockRemove.mockResolvedValue(undefined);

        await repo.deleteNetwork("NET03");
        expect(mockRemove).toHaveBeenCalledWith(net);
      });

      it("should throw NotFoundError if the network does not exist", async () => {
        mockFindOne.mockResolvedValue(null);

        await expect(repo.deleteNetwork("NET-404")).rejects.toThrow(NotFoundError);
      });
  });
});
