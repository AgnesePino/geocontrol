import { Entity, PrimaryColumn, Column } from "typeorm";
import type { UserType } from "@models/UserType";

@Entity("users")
export class UserDAO {
	@PrimaryColumn()
	username: string;

	@Column()
	password: string;

	@Column()
	type: UserType;
}
