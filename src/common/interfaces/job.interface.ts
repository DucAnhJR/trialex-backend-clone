export interface IEmailJob {
  email: string;
}

export interface ISmsJob {
  phoneNumber: string;
}

export interface IVerifyEmailJob extends IEmailJob {
  token: string;
}

export interface IVerifySmsJob extends ISmsJob {
  token: string;
}

export interface IForgotPasswordJob extends IEmailJob {
  otp: string;
}
