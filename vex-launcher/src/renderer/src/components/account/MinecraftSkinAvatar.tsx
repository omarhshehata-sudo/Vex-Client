import { type ReactNode, useEffect, useState } from 'react';

import { minecraftFaceAvatarUrl } from '../../services/minecraftAvatar';

type Props = {
	uuid?: string | null;
	size?: number;
	className?: string;
	fallback: ReactNode;
};

/**
 * Renders the Minecraft player's 2D face from Crafatar (public skin CDN).
 */
export function MinecraftSkinAvatar({ uuid, size = 128, className, fallback }: Props) {
	const [broken, setBroken] = useState(false);
	const url = uuid?.trim() ? minecraftFaceAvatarUrl(uuid, size) : null;

	useEffect(() => {
		setBroken(false);
	}, [uuid, url]);

	if (!url || broken) {
		return <>{fallback}</>;
	}

	return (
		<img
			src={url}
			alt=""
			className={className}
			draggable={false}
			referrerPolicy="no-referrer"
			onError={() => setBroken(true)}
		/>
	);
}
