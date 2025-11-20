import { AppDataSource } from "@database";
import type { Repository } from "typeorm";
import { NetworkDAO } from "@dao/NetworkDAO";
import { findOrThrowNotFound, throwConflictIfFound } from "@utils";
import AppError from "@models/errors/AppError";

/**
 * The NetworkRepository class provides methods to perform CRUD operations
 * on the network entity. It encapsulates all interactions with the database
 * related to networks, including validation and uniqueness checks.
 *
 * @note This repository assumes that network codes are unique across the system.
 * Ensure other layers do not bypass these methods for direct DB access.
 */
export class NetworkRepository {
	private readonly repo: Repository<NetworkDAO>;

	constructor() {
		this.repo = AppDataSource.getRepository(NetworkDAO);
	}

	/**
	 * Retrieves all networks from the database, including their associated gateways.
	 *
	 * @returns A promise that resolves to an array of NetworkDAO objects.
	 */
	async getAllNetworks(): Promise<NetworkDAO[]> {
		return await this.repo.find({ relations: { gateways: { sensors: true } } });
	}

	/**
	 * Retrieves a single network identified by its unique code, including its gateways.
	 *
	 * @param code - The unique identifier (code) of the network.
	 * @returns A promise that resolves to the matching NetworkDAO object.
	 * @throws NotFoundError - If the network with the specified code is not found.
	 */
	async getNetworkByCode(code: string): Promise<NetworkDAO> {
		const result = await this.repo.findOne({
			where: { code },
			relations: { gateways: { sensors: true } },
		});

		return findOrThrowNotFound(
			[result],
			() => true,
			`Network with code '${code}' not found`,
		);
	}

	/**
	 * Creates a new network in the database. The network code must be unique.
	 *
	 * @param code - Unique identifier for the network.
	 * @param name - Name of the network.
	 * @param description - Optional description of the network.
	 * @returns A promise that resolves once the network is saved.
	 * @throws ConflictError - If a network with the same code already exists.
	 * @throws AppError - If the provided code is invalid (empty or missing).
	 */
	async createNetwork(
		code: string,
		name: string,
		description?: string,
	): Promise<void> {
		if (!code || code.trim().length < 1) {
			throw new AppError("Invalid input data", 400);
		}
		
		code = code.trim();
		throwConflictIfFound(
			await this.repo.find({ where: { code } }),
			() => true,
			`Network with code '${code}' already exists`,
		);

		await this.repo.save({ code, name, description });
	}

	/**
	 * Updates an existing network with the specified fields.
	 *
	 * @param code - The current network code.
	 * @param updates - Partial network fields to update.
	 * @returns A promise that resolves once the update is performed.
	 * @throws NotFoundError - If the network to be updated does not exist.
	 * @throws AppError - If the new code is invalid.
	 * @throws ConflictError - If the new code is already used by another network.
	 */
	async updateNetwork(
		code: string,
		updates: Partial<NetworkDAO>,
	): Promise<void> {
		const network = await this.getNetworkByCode(code);

		// Validate new code if it is being changed
		if (updates.code !== undefined) {
			if (updates.code.trim().length < 1) {
				throw new AppError("Invalid input data", 400);
			}

			if (updates.code !== code) {
				await throwConflictIfFound(
					await this.repo.find({ where: { code: updates.code } }),
					() => true,
					`Network with code '${updates.code}' already exists`,
				);
			}
		}

		Object.assign(network, updates);
		await this.repo.save(network);
	}

	/**
	 * Deletes the network identified by the given code.
	 *
	 * @param code - The unique code of the network to delete.
	 * @returns A promise that resolves once the network is removed.
	 * @throws NotFoundError - If no network with the specified code exists.
	 */
	async deleteNetwork(code: string): Promise<void> {
		const net = await this.getNetworkByCode(code);
		await this.repo.remove(net);
	}
}