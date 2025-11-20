import {
	Entity,
	Column,
	ManyToOne,
	OneToMany,
	PrimaryGeneratedColumn,
} from "typeorm";
import { NetworkDAO } from "@models/dao/NetworkDAO";
import { SensorDAO } from "@models/dao/SensorDAO";
import { emptyStringToNullTransformer } from "@utils";
@Entity("gateways")
export class GatewayDAO {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ unique: true })
	macAddress: string;

	@Column({
		nullable: true,
		default: null,
		transformer: emptyStringToNullTransformer,
	})
	name: string | null;

	@Column({
		nullable: true,
		default: null,
		transformer: emptyStringToNullTransformer,
	})
	description: string | null;

	@OneToMany(
		() => SensorDAO,
		(sensor) => sensor.gateway,
	)
	sensors: Array<SensorDAO>;

	@ManyToOne(
		() => NetworkDAO,
		(network) => network.gateways,
		// If a network is deleted, all its gateways are deleted too
		{ cascade: true, onDelete: "CASCADE" },
	)
	network: NetworkDAO;
}
