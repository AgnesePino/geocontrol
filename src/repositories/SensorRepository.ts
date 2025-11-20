import { AppDataSource } from "@database";
import { SensorDAO } from "@models/dao/SensorDAO";
import type { Sensor as SensorDTO } from "@models/dto/Sensor";
import { findOrThrowNotFound, throwConflictIfFound } from "@utils";
import type { Repository } from "typeorm";
import { GatewayRepository } from "./GatewayRepository";

/**
 * The SensorRepository class provides methods to interact with the
 * database for sensor-related operations. It allows for CRUD operations
 * on sensors associated with a specific network and gateway.
 *
 * @note This Repository does assume that the networks and gateways
 * provided to the methods exist in the database. Please ensure
 * that those exist before calling them.
 */
export class SensorRepository {
	private readonly repo: Repository<SensorDAO>;

	constructor() {
		this.repo = AppDataSource.getRepository(SensorDAO);
	}

	/**
	 * Gets all sensors associated to a given network from the DB.
	 *
	 * @param networkCode - The network code.
	 * @return A promise that resolves to an array of SensorDAO objects.
	 */
	async getAllSensorsOfNetwork(networkCode: string): Promise<SensorDAO[]> {
		return await this.repo.find({
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
	}

	/**
	 * Gets all sensors associated to a given network and gateway from the DB.
	 *
	 * @param gatewayMac - The gateway MAC address.
	 * @return A promise that resolves to an array of SensorDAO objects.
	 */
	async getAllSensorsOfGateway(gatewayMac: string): Promise<SensorDAO[]> {
		return await this.repo.find({
			relations: {
				gateway: true,
			},
			where: {
				gateway: {
					macAddress: gatewayMac,
				},
			},
		});
	}

	/**
	 * Gets all sensors from the DB that are associated to a given network & gateway.
	 *
	 * @param sensorMac - The sensor MAC address (unique).
	 * @return A promise that resolves to an array of SensorDAO objects.
	 *
	 * @throws NotFoundError - If no sensor with the specified MAC address
	 * is found in the network and gateway.
	 */
	async getSensorByMac(sensorMac: string): Promise<SensorDAO> {
		return findOrThrowNotFound(
			[
				await this.repo.findOne({
					where: { macAddress: sensorMac },
				}),
			],
			(sen) => sen !== null,
			`Sensor with MAC '${sensorMac}' not found`,
		);
	}

	/**
	 * Creates a new sensor in the DB associated to the network and gateway.
	 * It is assumed that the sensor provided has all the required data specified.
	 *
	 * @param gatewayMac - The gateway MAC address.
	 * @param sensor - The sensor object containing the data to be saved.
	 * @return A promise that resolves to the created SensorDAO object.
	 *
	 * @throws ConflictError - If a sensor with the same MAC address
	 * already exists in the network and gateway.
	 */
	async createSensor(gatewayMac: string, sensor: SensorDTO): Promise<void> {
		// The check above ensures that the sensor does not exist in the
		// network and gateway specified, but since the MAC address is a
		// unique identifier, we need to check if it exists in the DB
		// at all. If it does, we throw a conflict error.
		throwConflictIfFound(
			[await this.repo.findOneBy({ macAddress: sensor.macAddress })],
			(sen) => sen !== null,
			`A sensor with MAC '${sensor.macAddress}' already exists in the database`,
		);

		// Now we can safely create the sensor
		const dao = this.repo.create({
			macAddress: sensor.macAddress,
			name: sensor.name,
			description: sensor.description,
			variable: sensor.variable,
			unit: sensor.unit,
			// This also resolves the network, don't need to pass it as param
			gateway: await new GatewayRepository().getGatewayByMac(gatewayMac),
		});

		await this.repo.save(dao);
	}

	/**
	 * Updates an existing sensor in the DB.
	 *
	 * @param sensorMac - The MAC address of the sensor to be updated.
	 * @param updatedSensor - The sensor object containing the updated data.
	 * @return A promise that resolves to the updated SensorDAO object.
	 *
	 * @throws NotFoundError - If no sensor with the specified MAC address
	 * is found in the network and gateway.
	 *
	 * @throws ConflictError - If the updated version of the sensor has a new
	 * MAC address that is already in use by another sensor in the network & gateway.
	 */
	async updateSensor(
		sensorMac: string,
		updatedSensor: SensorDTO,
	): Promise<void> {
		// getByMac will throw an error if the sensor is not found
		const existing = await this.getSensorByMac(sensorMac);

		// Checking if MAC address is being updated, and if so, throw
		// a conflict error if the new MAC address is already in use
		// by another sensor, not necessarily in the same network & gateway
		// (since MAC is unique across the DB).
		if (existing.macAddress !== updatedSensor.macAddress) {
			throwConflictIfFound(
				[await this.repo.findOneBy({ macAddress: updatedSensor.macAddress })],
				(sen) => sen !== null,
				`A sensor with MAC '${updatedSensor.macAddress}' already exists in the database`,
			);
		}

		// We can safely update now
		await this.repo.update(existing.id, updatedSensor);
	}

	/**
	 * Deletes a sensor having the specified MAC address from
	 * the DB, effectively removing from the network and gateway.
	 *
	 * @param sensorMac - The sensor MAC address.
	 * @return A promise that resolves to a boolean indicating
	 * whether the deletion was successful.
	 *
	 * @throws NotFoundError - If no sensor with the specified MAC address
	 * is found in the network and gateway.
	 */
	async deleteSensor(sensorMac: string): Promise<void> {
		// getByMac will throw an error if the sensor is not found
		const sensor = await this.getSensorByMac(sensorMac);
		await this.repo.remove(sensor);
	}
}
