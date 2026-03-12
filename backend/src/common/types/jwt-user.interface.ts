// What: Type for the user object attached to the request by JwtStrategy.
// Why: Replaces `any` in controllers for type safety.
export interface JwtUser {
  user_id: string;
  tenant_id: string;
  role: string;
}
