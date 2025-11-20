import type { Measurement as MeasurementDTO } from "@dto/Measurement";
import type { Measurements as MeasurementsDTO } from "@dto/Measurements";
import type { Stats as StatsDTO } from "@dto/Stats";
import { MeasurementRepository } from "@repositories/MeasurementRepository";
import {
    createMeasurementsDTO,
    mapMeasurementDAOToDTO,
} from "@services/mapperService";
import { calculateStatistics } from "@services/measurementService";
import {
    withExistingNetwork,
    withExistingNetworkGatewayAndSensor,
} from "@services/existenceService";
import { getAllSensorsOfNetwork } from "./sensorController";

export interface IMeasurementService {
    getMeasurementsFromSensor(
        networkCode: string,
        gatewayMac: string,
        sensorMac: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<MeasurementsDTO>;
}

export class MeasurementController {
    constructor(
        private measurementRepo = new MeasurementRepository(),
        private mapperService = { createMeasurementsDTO, mapMeasurementDAOToDTO },
        private statsService = { calculateStatistics },
        private existenceService = { withExistingNetwork, withExistingNetworkGatewayAndSensor },
        private sensorController = { getAllSensorsOfNetwork }
    ) {}

    async getMeasurementsFromSensor(
        networkCode: string,
        gatewayMac: string,
        sensorMac: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<MeasurementsDTO> {
        if (startDate && endDate && startDate > endDate) {
            return {
                sensorMacAddress: sensorMac,
                stats: {
                    mean: 0,
                    variance: 0,
                    lowerThreshold: 0,
                    upperThreshold: 0,
                    startDate: startDate,
                    endDate: endDate,
                },

            } as MeasurementsDTO;
        }

        return await this.existenceService.withExistingNetworkGatewayAndSensor(
            networkCode,
            gatewayMac,
            sensorMac,
            async () => {
                const measurementDto = (
                    await this.measurementRepo.getMeasurementsFromSensor(
                        networkCode,
                        gatewayMac,
                        sensorMac,
                    )
                )
                    .map(this.mapperService.mapMeasurementDAOToDTO)
                    .filter((m) => {
                        const t = new Date(m.createdAt).getTime();
                        return (
                            (!startDate || t >= startDate.getTime()) &&
                            (!endDate || t <= endDate.getTime())
                        );
                    });

                if (measurementDto.length === 0) {
                    return {
                        sensorMacAddress: sensorMac,
                        stats: {
                            mean: 0,
                            variance: 0,
                            lowerThreshold: 0,
                            upperThreshold: 0,
                            startDate: startDate,
                            endDate: endDate,
                        },
                    } as MeasurementsDTO;
                }

                const stats = this.statsService.calculateStatistics(measurementDto, startDate, endDate);

                const markedMeasurementsDTOs = measurementDto.map((m) => {
                    m.isOutlier =
                        m.value < stats.lowerThreshold || m.value > stats.upperThreshold;
                    return m;
                });

                return this.mapperService.createMeasurementsDTO(sensorMac, stats, markedMeasurementsDTOs);
            },
        );
    }

    async getStatsFromSensor(
        networkCode: string,
        gatewayMac: string,
        sensorMac: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<StatsDTO> {
        const measurements = await this.getMeasurementsFromSensor(
            networkCode,
            gatewayMac,
            sensorMac,
            startDate,
            endDate,
        );

        if (!measurements.stats) {
            return {
                mean: 0,
                variance: 0,
                lowerThreshold: 0,
                upperThreshold: 0,
            };
        }

        return measurements.stats;
    }

    async getOutliersFromSensor(
        networkCode: string,
        gatewayMac: string,
        sensorMac: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<MeasurementsDTO> {
        const measurements = await this.getMeasurementsFromSensor(
            networkCode,
            gatewayMac,
            sensorMac,
            startDate,
            endDate,
        );

        if (!measurements.measurements || measurements.measurements.length === 0) {
            return { sensorMacAddress: sensorMac };
        }

        return {
            ...measurements,
            measurements: measurements.measurements.filter((m) => m.isOutlier),
        } as MeasurementsDTO;
    }

    async getMeasurementsFromNetwork(
        networkCode: string,
        sensorMacs?: string[],
        startDate?: Date,
        endDate?: Date,
    ): Promise<MeasurementsDTO[]> {
        if (startDate && endDate && startDate > endDate) {
            if (!sensorMacs?.length) {
                const sensors = await this.sensorController.getAllSensorsOfNetwork(networkCode);
                return sensors.map(
                    (sensor) =>
                        ({
                            sensorMacAddress: sensor.macAddress,
                            
                        }) as MeasurementsDTO,
                );
            }
            return sensorMacs.map(
                (sensorMac) =>
                    ({
                        sensorMacAddress: sensorMac,
                    }) as MeasurementsDTO,
            );
        }

        return await this.existenceService.withExistingNetwork(networkCode, async () => {
            const measurementsDAOs = await this.measurementRepo.getMeasurementsFromNetwork(
                networkCode,
                sensorMacs,
            );

            if (measurementsDAOs.length === 0) {
                if (!sensorMacs?.length) {
                    const sensors = await this.sensorController.getAllSensorsOfNetwork(networkCode);
                    return sensors.map(
                        (sensor) =>
                            ({
                                sensorMacAddress: sensor.macAddress,
                            }) as MeasurementsDTO,
                    );
                }

                return sensorMacs.map(
                    (sensorMac) =>
                        ({
                            sensorMacAddress: sensorMac,
                        }) as MeasurementsDTO,
                );
            }

            const measurementMap = new Map<string, MeasurementDTO[]>();
            for (const dao of measurementsDAOs) {
                const sensorMac = dao.sensor.macAddress;
                const dto = this.mapperService.mapMeasurementDAOToDTO(dao);
                const t = new Date(dto.createdAt).getTime();
                if (
                    (startDate && t < startDate.getTime()) ||
                    (endDate && t > endDate.getTime())
                ) {
                    continue;
                }
                if (!measurementMap.has(sensorMac)) measurementMap.set(sensorMac, [dto]);
                else measurementMap.get(sensorMac).push(dto);
            }

            let allSensorMacs: string[] = [];
            if (!sensorMacs || sensorMacs.length === 0) {
                const sensors = await this.sensorController.getAllSensorsOfNetwork(networkCode);
                allSensorMacs = sensors.map(s => s.macAddress);
            } else {
                allSensorMacs = sensorMacs;
            }

            return allSensorMacs.map(sensorMac => {
                const dtos = measurementMap.get(sensorMac);
                if (!dtos || dtos.length === 0) {
                    if (startDate || endDate) {
                        return {
                            sensorMacAddress: sensorMac,
                            stats: {
                                mean: 0,
                                variance: 0,
                                lowerThreshold: 0,
                                upperThreshold: 0,
                                startDate: startDate,
                                endDate: endDate,
                            },
                        } as MeasurementsDTO;
                }
                    return null;
                }

                const stats = this.statsService.calculateStatistics(dtos, startDate, endDate);

                const markedMeasurementDTOs = dtos.map((m) => {
                    m.isOutlier =
                        m.value < stats.lowerThreshold || m.value > stats.upperThreshold;
                    return m;
                });

                return this.mapperService.createMeasurementsDTO(sensorMac, stats, markedMeasurementDTOs);
            }).filter(Boolean);
        });
    }

    async getStatsFromNetwork(
        networkCode: string,
        sensorMacs?: string[],
        startDate?: Date,
        endDate?: Date,
    ): Promise<Array<{ sensorMacAddress: string; stats: StatsDTO }>> {
        const measurements = await this.getMeasurementsFromNetwork(
            networkCode,
            sensorMacs,
            startDate,
            endDate,
        );

        return measurements.map((m) => ({
            sensorMacAddress: m.sensorMacAddress,
            stats: m.stats,
        }));
    }

    async getOutliersFromNetwork(
        networkCode: string,
        sensorMacs?: string[],
        startDate?: Date,
        endDate?: Date,
    ): Promise<MeasurementsDTO[]> {
        const measurements = await this.getMeasurementsFromNetwork(
            networkCode,
            sensorMacs,
            startDate,
            endDate,
        );

        if (!measurements || measurements.length === 0) {
            return measurements;
        }

        return measurements.map((msrs) => {
            if (!msrs.measurements || msrs.measurements.length === 0) {
                return { sensorMacAddress: msrs.sensorMacAddress };
            }
            return {
                ...msrs,
                measurements: msrs.measurements.filter((msr) => msr.isOutlier),
            };
        });
    }

    async storeMeasurement(
        networkCode: string,
        gatewayMac: string,
        sensorMac: string,
        measurementDto: MeasurementDTO,
    ): Promise<void> {
        await this.existenceService.withExistingNetworkGatewayAndSensor(
            networkCode,
            gatewayMac,
            sensorMac,
            () => {
                return this.measurementRepo.storeMeasurement(
                    networkCode,
                    gatewayMac,
                    sensorMac,
                    measurementDto,
                );
            },
        );
    }
}