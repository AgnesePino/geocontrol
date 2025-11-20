import { AppDataSource } from "@database";
import type { Repository } from "typeorm";
import { MeasurementDAO } from "@dao/MeasurementDAO";
import type { Measurement as MeasurementDTO } from "@dto/Measurement";
import { SensorRepository } from "./SensorRepository";

export class MeasurementRepository {
	private readonly repo: Repository<MeasurementDAO>;

	constructor() {
		this.repo = AppDataSource.getRepository(MeasurementDAO);
	}

	async getMeasurementsFromNetwork(networkCode: string, sensorMacs?: string[]) {
		const fetch = async (mac?: string) => {
			return await this.repo.find({
				where: {
					sensor: {
						...(mac ? { macAddress: mac } : {}),
						gateway: { network: { code: networkCode } },
					},
				},
				relations: {
					sensor: {
						gateway: {
							network: true,
						},
					},
				},
			});
		};

		if (!sensorMacs || sensorMacs.length === 0) return await fetch(); // No MAC, restituisce tutto

		const allMeasurements: MeasurementDAO[] = [];
		for (const mac of sensorMacs) allMeasurements.push(...(await fetch(mac)));

		return allMeasurements;
	}

	storeMeasurement = async (
		networkCode: string,
		gatewayMac: string,
		sensorMac: string,
		measurement: MeasurementDTO,
	) => {
		const dao = this.repo.create({
			createdAt: measurement.createdAt,
			value: measurement.value,
			sensor: await new SensorRepository().getSensorByMac(sensorMac),
		});

		return await this.repo.save(dao);
	};

	async getMeasurementsFromSensor(
		networkCode: string,
		gatewayMac: string,
		sensorMac: string,
	): Promise<MeasurementDAO[]> {
		return await this.repo.find({
			relations: {
				sensor: {
					gateway: {
						network: true,
					},
				},
			},
			where: {
				sensor: {
					macAddress: sensorMac,
					gateway: {
						macAddress: gatewayMac,
						network: { code: networkCode },
					},
				},
			},
		});
	}
}
