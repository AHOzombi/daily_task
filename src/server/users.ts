import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import bcrypt from 'bcryptjs';
import type { LoginInput, PublicUser, RegisterInput, User } from '../types/user';

const USERS_PATH = resolve(process.cwd(), 'src/server/data/users.json');

async function ensureUsers() {
  await mkdir(dirname(USERS_PATH), { recursive: true });
  try {
    await readFile(USERS_PATH, 'utf8');
  } catch {
    await writeFile(USERS_PATH, JSON.stringify([], null, 2), 'utf8');
  }
}

async function readUsers(): Promise<User[]> {
  await ensureUsers();
  const raw = await readFile(USERS_PATH, 'utf8');
  return JSON.parse(raw) as User[];
}

async function writeUsers(users: User[]) {
  const tempPath = `${USERS_PATH}.tmp`;
  await writeFile(tempPath, JSON.stringify(users, null, 2), 'utf8');
  await rename(tempPath, USERS_PATH);
}

// 密码强度验证：至少6位，且包含两类字符（大小写/数字/特殊字符）
function validatePasswordStrength(password: string): string | null {
  if (password.length < 6) return '密码至少6位';
  const categories = [
    /[a-z]/.test(password),  // 小写
    /[A-Z]/.test(password),  // 大写
    /[0-9]/.test(password),  // 数字
    /[^a-zA-Z0-9]/.test(password), // 特殊字符
  ];
  const typeCount = categories.filter(Boolean).length;
  if (typeCount < 2) return '密码需包含大小写字母、数字、特殊字符中的至少两类';
  return null;
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const users = await readUsers();
  return users.find((u) => u.username === username) ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const users = await readUsers();
  return users.find((u) => u.id === id) ?? null;
}

export async function createUser(input: RegisterInput): Promise<PublicUser> {
  const users = await readUsers();
  if (users.some((u) => u.username === input.username)) {
    throw new Error('用户名已存在');
  }
  const passwordError = validatePasswordStrength(input.password);
  if (passwordError) {
    throw new Error(passwordError);
  }
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user: User = {
    id: `user-${Date.now()}`,
    username: input.username,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await writeUsers(users);
  return { id: user.id, username: user.username, createdAt: user.createdAt };
}

export async function verifyPassword(input: LoginInput): Promise<User | null> {
  const user = await findUserByUsername(input.username);
  if (!user) return null;
  const ok = await bcrypt.compare(input.password, user.passwordHash);
  return ok ? user : null;
}

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, username: user.username, createdAt: user.createdAt };
}
