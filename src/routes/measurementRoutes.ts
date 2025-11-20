import { CONFIG } from "@config";
import { Router } from "express";
import { authenticateUser } from "@middlewares/authMiddleware";
import { UserType } from "@models/UserType";
import { MeasurementController } from "@controllers/measurementController";
import { MeasurementRepository } from "@repositories/MeasurementRepository";
import * as mapperService from "@services/mapperService";
import * as measurementService from "@services/measurementService";
import * as existenceService from "@services/existenceService";
import * as sensorController from "@controllers/sensorController";
import { MeasurementFromJSON } from "@models/dto/Measurement";

const measurementController = new MeasurementController(
    new MeasurementRepository(),
    mapperService,
    measurementService,
    existenceService,
    sensorController
);

const router = Router();

// Store a measurement for a sensor (Admin & Operator)
router.post(
	`${CONFIG.ROUTES.V1_SENSORS}/:sensorMac/measurements`,
	authenticateUser([UserType.Admin, UserType.Operator]),
	async (req, res, next) => {
		try {
			const { networkCode, gatewayMac, sensorMac } = req.params;

			// The body is an array of { } objects that are then converted to Measurement DTOs.
			// If it's not, the OpenAPI validator will throw an error of type 400.
			const measurements = (req.body as Record<string, unknown>[])
				.map(MeasurementFromJSON)
				.filter((m) => m !== null && m !== undefined);

			for (const m of measurements) {
				await measurementController.storeMeasurement(networkCode, gatewayMac, sensorMac, m);
			}

			res.status(201).send();
		} catch (error) {
			next(error);
		}
	},
);

// Retrieve measurements for a specific sensor
router.get(
	`${CONFIG.ROUTES.V1_SENSORS}/:sensorMac/measurements`,
	authenticateUser(),
	async (req, res, next) => {
		try {
			const { networkCode, gatewayMac, sensorMac } = req.params;
			const { startDate, endDate } = req.query;

			const result = await measurementController.getMeasurementsFromSensor(
				networkCode,
				gatewayMac,
				sensorMac,
				startDate && new Date(startDate as string),
				endDate && new Date(endDate as string),
			);

			res.status(200).json(result);
		} catch (error) {
			next(error);
		}
	},
);

// Retrieve statistics for a specific sensor
router.get(
	`${CONFIG.ROUTES.V1_SENSORS}/:sensorMac/stats`,
	authenticateUser(),
	async (req, res, next) => {
		try {
			const { networkCode, gatewayMac, sensorMac } = req.params;
			const { startDate, endDate } = req.query;

			const result = await measurementController.getStatsFromSensor(
				networkCode,
				gatewayMac,
				sensorMac,
				startDate && new Date(startDate as string),
				endDate && new Date(endDate as string),
			);

			res.status(200).json(result);
		} catch (error) {
			next(error);
		}
	},
);

// Retrieve only outliers for a specific sensor
router.get(
	`${CONFIG.ROUTES.V1_SENSORS}/:sensorMac/outliers`,
	authenticateUser(),
	async (req, res, next) => {
		try {
			const { networkCode, gatewayMac, sensorMac } = req.params;
			const { startDate, endDate } = req.query;

			const result = await measurementController.getOutliersFromSensor(
				networkCode,
				gatewayMac,
				sensorMac,
				startDate && new Date(startDate as string),
				endDate && new Date(endDate as string),
			);
			res.status(200).json(result);
		} catch (error) {
			next(error);
		}
	},
);

// Retrieve measurements for a set of sensors of a specific network
router.get(
	`${CONFIG.ROUTES.V1_NETWORKS}/:networkCode/measurements`,
	authenticateUser(),
	async (req, res, next) => {
		try {
			const { networkCode } = req.params;
			const { startDate, endDate } = req.query;

			const sensorMacsRaw = req.query.sensorMacs;
			const sensorMacs: string[] = []
				.concat(sensorMacsRaw ?? [])
				.flatMap((item) =>
						item
							.split(",")
							.map((mac) => mac.trim())
							.filter(Boolean)
				);

			const result = await measurementController.getMeasurementsFromNetwork(
				networkCode,
				sensorMacs,
				startDate && new Date(startDate as string),
				endDate && new Date(endDate as string),
			);

			res.status(200).json(result);
		} catch (error) {
			next(error);
		}
	},
);

// Retrieve statistics for a set of sensors of a specific network
router.get(
	`${CONFIG.ROUTES.V1_NETWORKS}/:networkCode/stats`,
	authenticateUser(),
	async (req, res, next) => {
		try {
			const { networkCode } = req.params;
			const { startDate, endDate } = req.query;

			const sensorMacsRaw = req.query.sensorMacs;
			const sensorMacs: string[] = []
				.concat(sensorMacsRaw ?? [])
				.flatMap((item) =>
						item
							.split(",")
							.map((mac) => mac.trim())
							.filter(Boolean)
				);

			const result = await measurementController.getStatsFromNetwork(
				networkCode,
				sensorMacs,
				startDate && new Date(startDate as string),
				endDate && new Date(endDate as string),
			);

			res.status(200).json(result);
		} catch (error) {
			next(error);
		}
	},
);

// Retrieve only outliers for a set of sensors of a specific network
router.get(
	`${CONFIG.ROUTES.V1_NETWORKS}/:networkCode/outliers`,
	authenticateUser(),
	async (req, res, next) => {
		try {
			const { networkCode } = req.params;
			const { startDate, endDate } = req.query;

			const sensorMacsRaw = req.query.sensorMacs;
			const sensorMacs: string[] = []
				.concat(sensorMacsRaw ?? [])
				.flatMap((item) =>
						item
							.split(",")
							.map((mac) => mac.trim())
							.filter(Boolean)
				);

			const result = await measurementController.getOutliersFromNetwork(
				networkCode,
				sensorMacs,
				startDate && new Date(startDate as string),
				endDate && new Date(endDate as string),
			);

			res.status(200).json(result);
		} catch (error) {
			next(error);
		}
	},
);

export default router;
export { measurementController };
