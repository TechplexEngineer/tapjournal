/** A reactive clock that ticks every `intervalMs` while the component is mounted. */
export function useNow(intervalMs = 30_000) {
	let now = $state(Date.now());
	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), intervalMs);
		return () => clearInterval(timer);
	});
	return {
		get current() {
			return now;
		}
	};
}
