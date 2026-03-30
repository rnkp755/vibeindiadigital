"use client";

import { useEffect, useState } from "react";

export function CustomCursor() {
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const [isPointer, setIsPointer] = useState(false);

	useEffect(() => {
		const updatePosition = (e: MouseEvent) => {
			setPosition({ x: e.clientX, y: e.clientY });
		};

		const updateCursor = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			setIsPointer(
				window.getComputedStyle(target).cursor === "pointer" ||
					target.tagName === "BUTTON" ||
					target.tagName === "A",
			);
		};

		window.addEventListener("mousemove", updatePosition);
		window.addEventListener("mouseover", updateCursor);

		return () => {
			window.removeEventListener("mousemove", updatePosition);
			window.removeEventListener("mouseover", updateCursor);
		};
	}, []);

	return (
		<>
			<div
				className="custom-cursor-dot"
				style={{
					left: `${position.x}px`,
					top: `${position.y}px`,
				}}
			/>
			<div
				className={`custom-cursor-circle ${isPointer ? "pointer" : ""}`}
				style={{
					left: `${position.x}px`,
					top: `${position.y}px`,
				}}
			/>
		</>
	);
}
