import { prisma } from "./db";

/**
 * Mock user for MVP - no auth. Ensures a user exists for all flows.
 */
export const MOCK_USER_ID = "mock-user-1";
export const MOCK_USER_EMAIL = "demo@paper-note.local";

export async function ensureMockUser() {
  const user = await prisma.user.upsert({
    where: { id: MOCK_USER_ID },
    update: {},
    create: { id: MOCK_USER_ID, email: MOCK_USER_EMAIL },
  });
  return user;
}
