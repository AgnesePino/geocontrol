import { Router } from "express";
import { authenticateUser } from "@middlewares/authMiddleware";
import { NetworkFromJSON } from "@dto/Network";
import { UserType } from "@models/UserType";
import {
	getAllNetworks,
	updateNetwork,
	getNetworkByCode,
	createNetwork,
	deleteNetwork,
} from "@controllers/networkController";
const router = Router();

// Qualsiasi utente autenticato
router.get("/", authenticateUser(), async (req, res, next) => {
	try {
		const result = await getAllNetworks();
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
});

// Get network by code
router.get("/:networkCode", authenticateUser(), async (req, res, next) => {
	try {
		const result = await getNetworkByCode(req.params.networkCode);
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
});

// Create network (Admin o Operator)
router.post(
	"/",
	authenticateUser([UserType.Admin, UserType.Operator]),
	async (req, res, next) => {
		try {
			await createNetwork(NetworkFromJSON(req.body));
			res.status(201).send();
		} catch (error) {
			next(error);
		}
	},
);

// Update network (Admin o Operator)
router.patch(
	"/:networkCode",
	authenticateUser([UserType.Admin, UserType.Operator]),
	async (req, res, next) => {
		try {
			await updateNetwork(req.params.networkCode, NetworkFromJSON(req.body));
			res.status(204).send();
		} catch (error) {
			next(error);
		}
	},
);

// Delete network (Admin o Operator)
router.delete(
	"/:networkCode",
	authenticateUser([UserType.Admin, UserType.Operator]),
	async (req, res, next) => {
		try {
			await deleteNetwork(req.params.networkCode);
			res.status(204).send();
		} catch (error) {
			next(error);
		}
	},
);

export default router;
