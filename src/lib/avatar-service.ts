import { getPrisma } from "@/lib/prisma";
import {
  deleteAvatarImage,
  saveAvatarImage,
} from "@/lib/storage";

export async function replaceUserAvatar(userId: string, file: File) {
  let savedAvatarPath: string | null = null;
  let persisted = false;

  try {
    const avatar = await saveAvatarImage(file);
    savedAvatarPath = avatar.relativePath;
    const prisma = getPrisma();
    const previousAvatarPath = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ avatarPath: string | null }>>`
        SELECT "avatarPath"
        FROM "User"
        WHERE "id" = ${userId}
        FOR UPDATE
      `;
      const currentUser = rows[0];

      if (!currentUser) {
        throw new Error("Usuario nao encontrado.");
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          avatarMimeType: avatar.mimeType,
          avatarPath: avatar.relativePath,
        },
      });

      return currentUser.avatarPath;
    });
    persisted = true;

    if (previousAvatarPath && previousAvatarPath !== avatar.relativePath) {
      await deleteAvatarImage(previousAvatarPath).catch(() => undefined);
    }

    return avatar;
  } catch (error) {
    if (savedAvatarPath && !persisted) {
      await deleteAvatarImage(savedAvatarPath).catch(() => undefined);
    }

    throw error;
  }
}
