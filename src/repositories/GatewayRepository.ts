import { AppDataSource } from "@database";
import type { Repository } from "typeorm";
import { GatewayDAO } from "@dao/GatewayDAO";
import { findOrThrowNotFound, throwConflictIfFound } from "@utils";
import { NetworkRepository } from "@repositories/NetworkRepository";
import AppError from "@models/errors/AppError";

export class GatewayRepository {
	private readonly repo: Repository<GatewayDAO>;

	constructor() {
		this.repo = AppDataSource.getRepository(GatewayDAO);
	}

	async getAllGateways(networkCode: string): Promise<GatewayDAO[]> {
		return await this.repo.find({
			where: { network: { code: networkCode } },
			relations: { sensors: true },
		});
	}

	async createGateway(
		macAddress: string,
		networkCode: string,
		name?: string,
		description?: string,
	): Promise<void> {
		const networkRepo = new NetworkRepository();
		const network = await networkRepo.getNetworkByCode(networkCode);

		throwConflictIfFound(
			await this.repo.find({ where: { macAddress } }),
			() => true,
			`Gateway with MAC '${macAddress}' already exists`,
		);

		if (!macAddress || macAddress.trim().length < 1) {
			throw new AppError("Invalid MAC address", 400)
		}

		await this.repo.save({
			macAddress,
			name,
			network,
			description,
		});
	}

	async getGatewayByMac(macAddress: string): Promise<GatewayDAO> {
		const result = await this.repo.findOne({
			where: { macAddress },
			relations: { sensors: true },
		});

		return findOrThrowNotFound(
			[result],
			() => true,
			`Gateway with MAC '${macAddress}' not found`,
		);
	}

	async updateGateway(
		macAddress: string,
		updates: Partial<GatewayDAO>,
	): Promise<void> {
		const gateway = await this.getGatewayByMac(macAddress);

		if (!gateway && updates.macAddress.trim().length < 1) {
			throw new AppError("Invalid MAC address", 400);
		}

		if (updates.macAddress !== undefined && updates.macAddress !== macAddress) {
			throwConflictIfFound(
				[
					await this.repo.findOne({
						where: { macAddress: updates.macAddress },
					}),
				],
				() => true,
				`Gateway with MAC '${updates.macAddress}' already exists`,
			);
		}

		Object.assign(gateway, updates);

		await this.repo.save(gateway);
	}

	async deleteGateway(macAddress: string): Promise<void> {
		// Check if the gateway exists
		const gw = await this.getGatewayByMac(macAddress);
		await this.repo.remove(gw);
	}
}
