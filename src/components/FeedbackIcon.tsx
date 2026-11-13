import type React from "react";

interface FeedbackIconProps extends React.SVGProps<SVGSVGElement> {
	size?: number;
}

export function FeedbackIcon({
	size = 14,
	className,
	...props
}: FeedbackIconProps) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			width={size}
			height={size}
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			{...props}
		>
			<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
		</svg>
	);
}
