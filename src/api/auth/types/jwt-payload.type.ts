export type JwtPayloadType = {
  id: string;
  sessionId: string;
  iat: number;
  exp: number;
  typ: 'access' | 'refresh';
};
