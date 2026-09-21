import { useState } from "react";

interface ScriptIconProps {
	icon?: string;
	fallback: string;
	className?: string;
}

export function ScriptIcon({ icon, fallback, className }: ScriptIconProps) {
	const [hasError, setHasError] = useState(false);

	if (icon && !hasError) {
		return (
			<img
				src={icon}
				alt=""
				className={className ?? "script-icon-img"}
				onError={() => setHasError(true)}
			/>
		);
	}

	return <>{fallback}</>;
}
