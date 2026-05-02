/**
 * Mojang profile UUID formatting + public face renders (Crafatar).
 * Mojang `/minecraft/profile` often returns IDs without dashes; Crafatar accepts dashed form.
 */

export function normalizeMinecraftUuid(uuid: string): string {
	const s = String(uuid).trim().replace(/-/g, '').toLowerCase();
	if (!/^[0-9a-f]{32}$/.test(s)) return String(uuid).trim();
	return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/** 2D cropped face (shows skin overlay layer when `overlay=true`). */
export function minecraftFaceAvatarUrl(uuid: string | undefined | null, size = 96): string | null {
	if (uuid === undefined || uuid === null) return null;
	const raw = String(uuid).trim();
	if (!raw) return null;
	const id = normalizeMinecraftUuid(raw);
	if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id)) return null;
	return `https://crafatar.com/avatars/${id}?size=${size}&overlay&default=MHF_Steve`;
}
