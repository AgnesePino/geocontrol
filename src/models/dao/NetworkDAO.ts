import { Entity, Column, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { GatewayDAO } from "@models/dao/GatewayDAO";
import { emptyStringToNullTransformer } from "@utils";

@Entity("networks")
export class NetworkDAO {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ unique: true })
	code: string;

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
		() => GatewayDAO,
		(gateway) => gateway.network,
	)
	gateways: Array<GatewayDAO>;
}
