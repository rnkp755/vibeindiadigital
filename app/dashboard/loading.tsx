export default function Loading() {
	return (
		<div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
			<div className="flex flex-col items-center gap-4">
				<div className="relative h-12 w-12">
					<div className="absolute inset-0 rounded-full border-2 border-white/10" />
					<div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#FF1B6B] animate-spin" />
				</div>
				<p className="text-sm text-gray-400 tracking-wide">Loading…</p>
			</div>
		</div>
	);
}
