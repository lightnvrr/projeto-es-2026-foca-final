import { Role } from '../../../generated/enums';

export type AuthorizeResponse = {
  userId: number;
  role: Role;
  validTrough?: Date;
};
