export enum CacheKey {
  SESSION_BLACKLIST = 'auth:session-blacklist:%s', // %s: sessionId
  EMAIL_VERIFICATION = 'auth:token:%s:email-verification', // %s: userId
  PASSWORD_RESET = 'auth:token:%s:password', // %s: userId
  FORGOT_PASSWORD_OTP = 'auth:token:%s:forgot-password-otp', // %s: userId
  OTP_VERIFIED = 'auth:otp-verified:%s', // %s: userId
}
