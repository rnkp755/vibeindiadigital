"use client";

import { useEffect, useRef, useState } from "react";

export function CustomCursor() {
	const [isPointer, setIsPointer] = useState(false);
	const [isVisible, setIsVisible] = useState(false);

	const dotRef = useRef<HTMLDivElement>(null);
	const circleRef = useRef<HTMLDivElement>(null);

	// Use refs for position to avoid re-renders on every mousemove
	const pos = useRef({ x: 0, y: 0 });
	const circle = useRef({ x: 0, y: 0 });
	const rafId = useRef<number>(0);

	useEffect(() => {
		// Animate circle with lerp for smooth lag effect
		const animate = () => {
			circle.current.x += (pos.current.x - circle.current.x) * 0.12;
			circle.current.y += (pos.current.y - circle.current.y) * 0.12;

			if (dotRef.current) {
				dotRef.current.style.left = `${pos.current.x}px`;
				dotRef.current.style.top = `${pos.current.y}px`;
			}
			if (circleRef.current) {
				circleRef.current.style.left = `${circle.current.x}px`;
				circleRef.current.style.top = `${circle.current.y}px`;
			}

			rafId.current = requestAnimationFrame(animate);
		};

		rafId.current = requestAnimationFrame(animate);

		const handleMouseMove = (e: MouseEvent) => {
			pos.current = { x: e.clientX, y: e.clientY };

			if (!isVisible) setIsVisible(true);

			const target = e.target as HTMLElement;
			setIsPointer(
				window.getComputedStyle(target).cursor === "pointer" ||
					target.tagName === "BUTTON" ||
					target.tagName === "A" ||
					target.closest("button") !== null ||
					target.closest("a") !== null,
			);
		};

		const handleMouseLeave = () => setIsVisible(false);
		const handleMouseEnter = () => setIsVisible(true);

		// Hide the native cursor
		document.body.style.cursor = "none";

		window.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseleave", handleMouseLeave);
		document.addEventListener("mouseenter", handleMouseEnter);

		return () => {
			cancelAnimationFrame(rafId.current);
			document.body.style.cursor = "";
			window.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseleave", handleMouseLeave);
			document.removeEventListener("mouseenter", handleMouseEnter);
		};
	}, [isVisible]);

	return (
		<>
			<div
				ref={dotRef}
				className="custom-cursor-dot"
				style={{ opacity: isVisible ? 1 : 0 }}
			/>
			<div
				ref={circleRef}
				className={`custom-cursor-circle${isPointer ? " pointer" : ""}`}
				style={{ opacity: isVisible ? 1 : 0 }}
			/>
		</>
	);
}
