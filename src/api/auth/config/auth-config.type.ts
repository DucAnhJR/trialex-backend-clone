export type AuthConfig = {
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshSecret: string;
  jwtRefreshExpiresIn: string;
  jwtAudience: string;
  jwtIssuer: string;
  forgotSecret: string;
  forgotTokenExpiresIn: string;
  otpTTL: string;
};
