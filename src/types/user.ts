export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  username: string;
  createdAt: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface RegisterInput {
  username: string;
  password: string;
}

export interface AuthPayload {
  userId: string;
  username: string;
}
